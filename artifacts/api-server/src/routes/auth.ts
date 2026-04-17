import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { eq, and, isNull, gt } from "drizzle-orm";
import { rateLimit } from "express-rate-limit";
import { Resend } from "resend";
import { db, usersTable, organizationsTable, passwordResetsTable } from "@workspace/db";
import { RegisterBody, LoginBody, LoginResponse, GetMeResponse } from "@workspace/api-zod";
import { signToken, requireAuth, type AuthRequest } from "../lib/auth.js";
import { createStripeCustomer } from "../lib/stripe.js";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.APP_URL || "https://slably.app";

const CURRENT_TERMS_VERSION = "v1.0";

const router: IRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Too many registration attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper: build user+org response shape
async function fetchUserWithOrg(userId: number) {
  const [row] = await db
    .select({
      id:               usersTable.id,
      name:             usersTable.name,
      email:            usersTable.email,
      role:             usersTable.role,
      organizationId:   usersTable.organizationId,
      organizationSlug:           organizationsTable.slug,
      organizationPlan:           organizationsTable.subscriptionPlan,
      stripeSubscriptionStatus:   organizationsTable.stripeSubscriptionStatus,
      passwordHash:               usersTable.passwordHash,
      createdAt:        usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(organizationsTable, eq(usersTable.organizationId, organizationsTable.id))
    .where(eq(usersTable.id, userId));
  return row ?? null;
}

// Helper: generate URL-safe slug from a string
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// Helper: ensure slug uniqueness in organizations table
async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let suffix = 2;
  while (true) {
    const [conflict] = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.slug, slug));
    if (!conflict) return slug;
    slug = `${base}-${suffix++}`;
  }
}

router.post("/auth/register", registerLimiter, async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request data" });
    return;
  }

  const { name, email, password, role, companyName, state, phone,
          category, serviceCity, serviceRadius, brokerage, licenseNumber,
          termsAccepted } = parsed.data;

  if (!termsAccepted) {
    res.status(400).json({ error: "You must accept the Terms of Service and Privacy Policy to register." });
    return;
  }

  const termsAcceptedIp =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
    ?? req.socket?.remoteAddress
    ?? null;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let organizationId: number | null = null;
  let organizationSlug: string | null = null;
  let organizationPlan: string | null = null;

  const isPaidRole = role === "builder" || role === "subcontractor" || role === "supplier";

  if (isPaidRole) {
    const orgName = companyName || (role === "subcontractor" ? `${name}'s Services` : `${name}'s Company`);
    const slug = await uniqueSlug(slugify(orgName));
    const [org] = await db
      .insert(organizationsTable)
      .values({
        name: orgName,
        slug,
        companyName: companyName || null,
        state: state || null,
        phone: phone || null,
        subscriptionPlan: "starter",
      })
      .returning();
    organizationId = org.id;
    organizationSlug = org.slug;
    organizationPlan = org.subscriptionPlan;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      name, email, passwordHash, role, organizationId,
      category:         role !== "realtor" ? (category || null) : null,
      brokerage:        role === "realtor" ? (brokerage || null) : null,
      licenseNumber:    role === "realtor" ? (licenseNumber || null) : null,
      phone:            role === "realtor" ? (phone || null) : null,
      serviceCity:      serviceCity   || null,
      serviceRadius:    serviceRadius || null,
      termsAcceptedAt:  new Date(),
      termsVersion:     CURRENT_TERMS_VERSION,
      termsAcceptedIp:  termsAcceptedIp,
    })
    .returning();

  // Fire-and-forget: crear Stripe customer (no bloquea el registro)
  if (organizationId !== null) {
    void (async () => {
      try {
        const stripeCustomerId = await createStripeCustomer(email, name, organizationId);
        await db.update(organizationsTable)
          .set({ stripeCustomerId })
          .where(eq(organizationsTable.id, organizationId));
      } catch (err) {
        console.error("[Stripe] Failed to create customer:", err);
      }
    })();
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role, organizationId, organizationSlug, organizationPlan, stripeSubscriptionStatus: isPaidRole ? 'active' : null });

  res.status(201).json(LoginResponse.parse({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId,
      organizationSlug,
      createdAt: user.createdAt,
    },
    token,
  }));
});

router.post("/auth/login", loginLimiter, async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request data" });
    return;
  }

  const { email, password } = parsed.data;
  const [rawUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!rawUser) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, rawUser.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (!rawUser.isActive) {
    res.status(403).json({
      error: "Your account is pending activation. Please contact support.",
    });
    return;
  }

  const user = await fetchUserWithOrg(rawUser.id);
  if (!user) {
    res.status(500).json({ error: "User lookup failed" });
    return;
  }

  await db.update(usersTable).set({ lastActiveAt: new Date() }).where(eq(usersTable.id, rawUser.id));

  const organizationId = user.organizationId ?? null;
  const organizationSlug = user.organizationSlug ?? null;
  const organizationPlan = user.organizationPlan ?? null;
  const stripeSubscriptionStatus = user.stripeSubscriptionStatus ?? null;

  const token = signToken({ id: user.id, email: user.email, role: user.role, organizationId, organizationSlug, organizationPlan, stripeSubscriptionStatus });

  res.json(LoginResponse.parse({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId,
      organizationSlug,
      createdAt: user.createdAt,
    },
    token,
  }));
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  const ok = { message: "If an account exists with that email, you will receive a reset link." };

  if (!email || typeof email !== "string") { res.json(ok); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
  if (!user) { res.json(ok); return; }

  const token     = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.insert(passwordResetsTable).values({ userId: user.id, token, expiresAt });

  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  if (process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: "hello@slably.app",
        to:   user.email,
        subject: "Reset your Slably password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
            <img src="https://slably.app/slably-logo.png" height="40" alt="Slably" style="margin-bottom: 24px;" />
            <h2 style="margin: 0 0 16px; color: #111;">Reset your password</h2>
            <p style="color: #444; margin: 0 0 8px;">You requested a password reset for your Slably account.</p>
            <a href="${resetUrl}"
              style="background: #F97316; color: white; padding: 12px 24px; border-radius: 8px;
                     text-decoration: none; display: inline-block; margin: 16px 0; font-weight: 600;">
              Reset Password
            </a>
            <p style="color: #666; font-size: 14px; margin: 16px 0 0;">
              This link expires in 1 hour. If you didn't request this, ignore this email.
            </p>
          </div>`,
      });
    } catch (err) {
      console.error("[Resend] Failed to send reset email:", err);
    }
  } else {
    console.log(`[ForgotPassword] Reset link for ${email}: ${resetUrl}`);
  }

  res.json(ok);
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, newPassword } = req.body as { token?: string; newPassword?: string };

  if (!token || !newPassword || newPassword.length < 8) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const now = new Date();
  const [row] = await db
    .select()
    .from(passwordResetsTable)
    .where(
      and(
        eq(passwordResetsTable.token, token),
        isNull(passwordResetsTable.usedAt),
        gt(passwordResetsTable.expiresAt, now),
      )
    );

  if (!row) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, row.userId));
  await db.update(passwordResetsTable).set({ usedAt: now }).where(eq(passwordResetsTable.id, row.id));

  res.json({ message: "Password updated successfully" });
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.user!.id;
  const user = await fetchUserWithOrg(userId);

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  await db.update(usersTable).set({ lastActiveAt: new Date() }).where(eq(usersTable.id, userId));

  res.json(GetMeResponse.parse({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId ?? null,
    organizationSlug: user.organizationSlug ?? null,
    createdAt: user.createdAt,
  }));
});

export default router;

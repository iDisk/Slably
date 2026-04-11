import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { rateLimit } from "express-rate-limit";
import { db, usersTable, organizationsTable } from "@workspace/db";
import { RegisterBody, LoginBody, LoginResponse, GetMeResponse } from "@workspace/api-zod";
import { signToken, requireAuth, type AuthRequest } from "../lib/auth.js";
import { createStripeCustomer } from "../lib/stripe.js";

const router: IRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
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
      organizationSlug: organizationsTable.slug,
      passwordHash:     usersTable.passwordHash,
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
          category, serviceCity, serviceRadius } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let organizationId: number | null = null;
  let organizationSlug: string | null = null;

  if (role === "builder") {
    // Auto-create an org — use companyName if provided, otherwise fallback to user name
    const orgName = companyName || `${name}'s Company`;
    const slug = await uniqueSlug(slugify(orgName));
    const [org] = await db
      .insert(organizationsTable)
      .values({ name: orgName, slug, companyName: companyName || null, state: state || null, phone: phone || null })
      .returning();
    organizationId = org.id;
    organizationSlug = org.slug;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      name, email, passwordHash, role, organizationId,
      category:      category      || null,
      serviceCity:   serviceCity   || null,
      serviceRadius: serviceRadius || null,
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

  const token = signToken({ id: user.id, email: user.email, role: user.role, organizationId, organizationSlug });

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

  void db.update(usersTable).set({ lastActiveAt: new Date() }).where(eq(usersTable.id, rawUser.id));

  const organizationId = user.organizationId ?? null;
  const organizationSlug = user.organizationSlug ?? null;

  const token = signToken({ id: user.id, email: user.email, role: user.role, organizationId, organizationSlug });

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

  void db.update(usersTable).set({ lastActiveAt: new Date() }).where(eq(usersTable.id, userId));

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

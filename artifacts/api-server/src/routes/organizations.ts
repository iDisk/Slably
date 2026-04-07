import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, organizationsTable, usersTable } from "@workspace/db";
import {
  UpdateMyOrgBody,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

// ─── GET /api/organizations/me ────────────────────────────────────────────────

router.get("/organizations/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (!user.organizationId) {
    const [userData] = await db
      .select({ profilePhoto: usersTable.profilePhoto, companyLogo: usersTable.companyLogo })
      .from(usersTable)
      .where(eq(usersTable.id, user.id));

    res.json({
      id:            null,
      name:          null,
      slug:          null,
      companyName:   null,
      licenseNumber: null,
      state:         null,
      phone:         null,
      createdAt:     null,
      profilePhoto:  userData?.profilePhoto ?? null,
      companyLogo:   userData?.companyLogo  ?? null,
    });
    return;
  }

  const [org] = await db.select().from(organizationsTable)
    .where(eq(organizationsTable.id, user.organizationId));

  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  const [userData] = await db
    .select({ profilePhoto: usersTable.profilePhoto, companyLogo: usersTable.companyLogo })
    .from(usersTable)
    .where(eq(usersTable.id, user.id));

  res.json({
    id:            org.id,
    name:          org.name,
    slug:          org.slug,
    companyName:   org.companyName,
    licenseNumber: org.licenseNumber,
    state:         org.state,
    phone:         org.phone,
    createdAt:     org.createdAt,
    profilePhoto:  userData?.profilePhoto  ?? null,
    companyLogo:   userData?.companyLogo   ?? null,
  });
});

// ─── PATCH /api/organizations/me ─────────────────────────────────────────────

router.patch("/organizations/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;

  const parsed = UpdateMyOrgBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Update user-level photo fields (any role)
  const userUpdate: Record<string, unknown> = {};
  if (parsed.data.profilePhoto !== undefined) userUpdate.profilePhoto = parsed.data.profilePhoto;
  if (parsed.data.companyLogo  !== undefined) userUpdate.companyLogo  = parsed.data.companyLogo;
  if (Object.keys(userUpdate).length > 0) {
    await db.update(usersTable).set(userUpdate).where(eq(usersTable.id, user.id));
  }

  // Update org-level fields (builder only)
  let org = null;
  if (user.role === "builder" && user.organizationId) {
    const orgData: Record<string, unknown> = {};
    if (parsed.data.companyName   !== undefined) orgData.companyName   = parsed.data.companyName;
    if (parsed.data.licenseNumber !== undefined) orgData.licenseNumber = parsed.data.licenseNumber;
    if (parsed.data.state         !== undefined) orgData.state         = parsed.data.state;
    if (parsed.data.phone         !== undefined) orgData.phone         = parsed.data.phone;

    if (Object.keys(orgData).length > 0) {
      [org] = await db.update(organizationsTable)
        .set(orgData)
        .where(eq(organizationsTable.id, user.organizationId))
        .returning();
    } else {
      [org] = await db.select().from(organizationsTable)
        .where(eq(organizationsTable.id, user.organizationId));
    }
  }

  const [userData] = await db
    .select({ profilePhoto: usersTable.profilePhoto, companyLogo: usersTable.companyLogo })
    .from(usersTable)
    .where(eq(usersTable.id, user.id));

  if (!org) {
    res.json({
      profilePhoto: userData?.profilePhoto ?? null,
      companyLogo:  userData?.companyLogo  ?? null,
    });
    return;
  }

  res.json({
    id:            org.id,
    name:          org.name,
    slug:          org.slug,
    companyName:   org.companyName,
    licenseNumber: org.licenseNumber,
    state:         org.state,
    phone:         org.phone,
    createdAt:     org.createdAt,
    profilePhoto:  userData?.profilePhoto  ?? null,
    companyLogo:   userData?.companyLogo   ?? null,
  });
});

export default router;

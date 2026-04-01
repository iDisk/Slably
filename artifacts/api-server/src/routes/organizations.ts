import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, organizationsTable } from "@workspace/db";
import {
  GetMyOrgResponse,
  UpdateMyOrgBody,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/organizations/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (!user.organizationId) {
    res.status(404).json({ error: "No organization found" });
    return;
  }

  const [org] = await db.select().from(organizationsTable)
    .where(eq(organizationsTable.id, user.organizationId));

  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  res.json(GetMyOrgResponse.parse(org));
});

router.patch("/organizations/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "builder") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (!user.organizationId) {
    res.status(404).json({ error: "No organization found" });
    return;
  }

  const parsed = UpdateMyOrgBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.companyName   !== undefined) updateData.companyName   = parsed.data.companyName;
  if (parsed.data.licenseNumber !== undefined) updateData.licenseNumber = parsed.data.licenseNumber;
  if (parsed.data.state         !== undefined) updateData.state         = parsed.data.state;
  if (parsed.data.phone         !== undefined) updateData.phone         = parsed.data.phone;

  const [org] = await db.update(organizationsTable)
    .set(updateData)
    .where(eq(organizationsTable.id, user.organizationId))
    .returning();

  res.json(GetMyOrgResponse.parse(org));
});

export default router;

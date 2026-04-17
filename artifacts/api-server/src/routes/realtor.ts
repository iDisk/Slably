import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable, realtorTrustedProsTable, realtorClientsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

function requireRealtor(req: AuthRequest, res: any, next: any): void {
  requireAuth(req as any, res, () => {
    if (req.user?.role !== "realtor") {
      res.status(403).json({ error: "Realtor access only" });
      return;
    }
    next();
  });
}

// GET /api/realtor/profile — autenticado
router.get("/realtor/profile", requireRealtor, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({
    id:           user.id,
    name:         user.name,
    email:        user.email,
    phone:        user.phone,
    brokerage:    user.brokerage,
    licenseNumber: user.licenseNumber,
    profilePhoto: user.profilePhoto,
    serviceCity:  user.serviceCity,
    createdAt:    user.createdAt,
  });
});

// PATCH /api/realtor/profile — autenticado
router.patch("/realtor/profile", requireRealtor, async (req: AuthRequest, res): Promise<void> => {
  const { brokerage, licenseNumber, phone, serviceCity, name } = req.body as {
    brokerage?: string; licenseNumber?: string; phone?: string; serviceCity?: string; name?: string;
  };
  const update: Partial<typeof usersTable.$inferInsert> = {};
  if (brokerage    !== undefined) update.brokerage    = brokerage    || null;
  if (licenseNumber !== undefined) update.licenseNumber = licenseNumber || null;
  if (phone        !== undefined) update.phone        = phone        || null;
  if (serviceCity  !== undefined) update.serviceCity  = serviceCity  || null;
  if (name         !== undefined && name.trim().length >= 2) update.name = name.trim();

  if (Object.keys(update).length > 0) {
    await db.update(usersTable).set(update).where(eq(usersTable.id, req.user!.id));
  }
  res.json({ message: "Profile updated" });
});

// GET /api/realtor/trusted-pros — autenticado
router.get("/realtor/trusted-pros", requireRealtor, async (req: AuthRequest, res): Promise<void> => {
  const rows = await db
    .select({
      proId:        realtorTrustedProsTable.proId,
      note:         realtorTrustedProsTable.note,
      sortOrder:    realtorTrustedProsTable.sortOrder,
      name:         usersTable.name,
      category:     usersTable.category,
      serviceCity:  usersTable.serviceCity,
      profilePhoto: usersTable.profilePhoto,
      role:         usersTable.role,
    })
    .from(realtorTrustedProsTable)
    .innerJoin(usersTable, eq(realtorTrustedProsTable.proId, usersTable.id))
    .where(eq(realtorTrustedProsTable.realtorId, req.user!.id))
    .orderBy(realtorTrustedProsTable.sortOrder);
  res.json(rows);
});

// POST /api/realtor/trusted-pros — autenticado
router.post("/realtor/trusted-pros", requireRealtor, async (req: AuthRequest, res): Promise<void> => {
  const { proId, note } = req.body as { proId?: number; note?: string };
  if (!proId) { res.status(400).json({ error: "proId required" }); return; }
  const existing = await db
    .select({ id: realtorTrustedProsTable.id })
    .from(realtorTrustedProsTable)
    .where(and(eq(realtorTrustedProsTable.realtorId, req.user!.id), eq(realtorTrustedProsTable.proId, proId)));
  if (existing.length > 0) { res.status(409).json({ error: "Pro already added" }); return; }
  await db.insert(realtorTrustedProsTable).values({ realtorId: req.user!.id, proId, note: note || null });
  res.status(201).json({ message: "Pro added" });
});

// DELETE /api/realtor/trusted-pros/:proId — autenticado
router.delete("/realtor/trusted-pros/:proId", requireRealtor, async (req: AuthRequest, res): Promise<void> => {
  const proId = parseInt(req.params.proId as string);
  if (isNaN(proId)) { res.status(400).json({ error: "Invalid proId" }); return; }
  await db.delete(realtorTrustedProsTable).where(
    and(eq(realtorTrustedProsTable.realtorId, req.user!.id), eq(realtorTrustedProsTable.proId, proId))
  );
  res.json({ message: "Pro removed" });
});

// GET /api/realtor/public/:realtorId — sin auth
router.get("/realtor/public/:realtorId", async (req, res): Promise<void> => {
  const realtorId = parseInt(req.params.realtorId);
  if (isNaN(realtorId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, realtorId));
  if (!user || user.role !== "realtor") { res.status(404).json({ error: "Realtor not found" }); return; }

  const pros = await db
    .select({
      proId:        realtorTrustedProsTable.proId,
      note:         realtorTrustedProsTable.note,
      name:         usersTable.name,
      category:     usersTable.category,
      serviceCity:  usersTable.serviceCity,
      profilePhoto: usersTable.profilePhoto,
      role:         usersTable.role,
    })
    .from(realtorTrustedProsTable)
    .innerJoin(usersTable, eq(realtorTrustedProsTable.proId, usersTable.id))
    .where(eq(realtorTrustedProsTable.realtorId, realtorId))
    .orderBy(realtorTrustedProsTable.sortOrder);

  res.json({
    profile: {
      id:           user.id,
      name:         user.name,
      email:        user.email,
      phone:        user.phone,
      brokerage:    user.brokerage,
      licenseNumber: user.licenseNumber,
      profilePhoto: user.profilePhoto,
      serviceCity:  user.serviceCity,
      createdAt:    user.createdAt,
    },
    pros,
  });
});

// GET /api/realtor/clients — autenticado
router.get("/realtor/clients", requireRealtor, async (req: AuthRequest, res): Promise<void> => {
  const clients = await db
    .select()
    .from(realtorClientsTable)
    .where(and(eq(realtorClientsTable.realtorId, req.user!.id), eq(realtorClientsTable.isActive, true)))
    .orderBy(realtorClientsTable.createdAt);
  res.json(clients);
});

// POST /api/realtor/clients — autenticado
router.post("/realtor/clients", requireRealtor, async (req: AuthRequest, res): Promise<void> => {
  const { name, email, phone, clientType, budget, city } = req.body as {
    name?: string; email?: string; phone?: string;
    clientType?: string; budget?: string; city?: string;
  };
  if (!name?.trim()) { res.status(400).json({ error: "Name required" }); return; }
  const allowed = ["buyer", "seller", "investor"];
  const [client] = await db.insert(realtorClientsTable).values({
    realtorId:  req.user!.id,
    name:       name.trim(),
    email:      email  || null,
    phone:      phone  || null,
    clientType: allowed.includes(clientType ?? "") ? clientType! : "buyer",
    budget:     budget || null,
    city:       city   || null,
  }).returning();
  res.status(201).json(client);
});

// GET /api/realtor/clients/:id — autenticado
router.get("/realtor/clients/:id", requireRealtor, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [client] = await db.select().from(realtorClientsTable)
    .where(and(eq(realtorClientsTable.id, id), eq(realtorClientsTable.realtorId, req.user!.id)));
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }
  res.json(client);
});

export default router;

import {
  db,
  usersTable,
  organizationsTable,
  projectsTable,
  contractsTable,
  changeOrdersTable,
  photosTable,
  activityLogsTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";

console.log("🌱 Seeding BuildOS database...");

// --- helpers ---

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // strip accents
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

async function getOrCreateOrg(data: { name: string }): Promise<typeof organizationsTable.$inferSelect> {
  const baseSlug = generateSlug(data.name);

  const [existing] = await db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.slug, baseSlug));

  if (existing) return existing;

  // Ensure slug uniqueness with numeric suffix if needed
  let slug = baseSlug;
  let suffix = 2;
  while (true) {
    const [conflict] = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.slug, slug));
    if (!conflict) break;
    slug = `${baseSlug}-${suffix++}`;
  }

  const [created] = await db
    .insert(organizationsTable)
    .values({ name: data.name, slug })
    .returning();

  return created;
}

async function getOrCreateUser(data: {
  name: string;
  email: string;
  password: string;
  role: "builder" | "client";
  organizationId?: number | null;
}): Promise<typeof usersTable.$inferSelect> {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, data.email));

  if (existing) {
    // Backfill organizationId if not set yet
    if (data.organizationId != null && existing.organizationId == null) {
      const [updated] = await db
        .update(usersTable)
        .set({ organizationId: data.organizationId })
        .where(eq(usersTable.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const [created] = await db
    .insert(usersTable)
    .values({
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      organizationId: data.organizationId ?? null,
    })
    .returning();

  return created;
}

async function getOrCreateProject(data: {
  organizationId: number;
  builderId: number;
  clientId?: number | null;
  clientName: string;
  clientEmail?: string | null;
  name: string;
  address: string;
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled";
  startDate?: string | null;
  notes?: string | null;
  progress: number;
}): Promise<typeof projectsTable.$inferSelect> {
  const [existing] = await db
    .select()
    .from(projectsTable)
    .where(
      and(
        eq(projectsTable.builderId, data.builderId),
        eq(projectsTable.name, data.name)
      )
    );

  if (existing) {
    // Backfill organizationId if not set yet
    if (existing.organizationId == null) {
      const [updated] = await db
        .update(projectsTable)
        .set({ organizationId: data.organizationId })
        .where(eq(projectsTable.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }

  const [created] = await db.insert(projectsTable).values(data).returning();
  return created;
}

// --- seed ---

async function seed() {
  // ── Organizations ──────────────────────────────────────────
  const org1 = await getOrCreateOrg({ name: "Constructora Mendoza" });
  const org2 = await getOrCreateOrg({ name: "Torres Construcciones" });

  console.log(`  Org 1: "${org1.name}" (slug: ${org1.slug})`);
  console.log(`  Org 2: "${org2.name}" (slug: ${org2.slug})`);

  // ── Users ──────────────────────────────────────────────────
  const builder1 = await getOrCreateUser({
    name: "Carlos Mendoza",
    email: "carlos@constructoramendoza.com",
    password: "demo1234",
    role: "builder",
    organizationId: org1.id,
  });

  const builder2 = await getOrCreateUser({
    name: "Ana Torres",
    email: "ana@torresconstrucciones.com",
    password: "demo1234",
    role: "builder",
    organizationId: org2.id,
  });

  const client1 = await getOrCreateUser({
    name: "Roberto Silva",
    email: "roberto@gmail.com",
    password: "demo1234",
    role: "client",
    organizationId: org1.id,
  });

  const client2 = await getOrCreateUser({
    name: "María Gutierrez",
    email: "maria@buildos.demo",
    password: "demo1234",
    role: "client",
    organizationId: org1.id,
  });

  const client3 = await getOrCreateUser({
    name: "Jorge Ramírez",
    email: "jorge@buildos.demo",
    password: "demo1234",
    role: "client",
    organizationId: org1.id,
  });

  // ── Projects ────────────────────────────────────────────────
  const p1 = await getOrCreateProject({
    organizationId: org1.id,
    builderId: builder1.id,
    clientId: client1.id,
    clientName: "Roberto Silva",
    clientEmail: "roberto@gmail.com",
    name: "Silva Custom Home - West Houston",
    address: "4821 Westheimer Rd, Houston, TX 77056",
    status: "active",
    startDate: "2025-11-15",
    notes: "Custom 3-story residence. Client requires premium finishes throughout. Special attention to agreed timelines.",
    progress: 65,
  });

  const p2 = await getOrCreateProject({
    organizationId: org1.id,
    builderId: builder1.id,
    clientId: client2.id,
    clientName: "María Gutierrez",
    clientEmail: "maria@buildos.demo",
    name: "Gutierrez Condo Full Remodel - Austin",
    address: "1205 Colorado St, Apt 4B, Austin, TX 78701",
    status: "active",
    startDate: "2026-01-08",
    notes: "Full remodel of 1,200 sq ft condo. New flooring, custom kitchen, full bathroom renovation.",
    progress: 30,
  });

  const p3 = await getOrCreateProject({
    organizationId: org1.id,
    builderId: builder1.id,
    clientId: client3.id,
    clientName: "Jorge Ramírez",
    clientEmail: "jorge@buildos.demo",
    name: "Ramirez Corporate Build-Out - Houston",
    address: "2900 N Loop W, Suite 800, Houston, TX 77092",
    status: "planning",
    startDate: "2026-04-01",
    notes: "Commercial office build-out, approximately 4,000 sq ft. Includes conference room, open workspace, and 6 private offices.",
    progress: 5,
  });

  await getOrCreateProject({
    organizationId: org2.id,
    builderId: builder2.id,
    clientName: "Familia Hernández",
    clientEmail: "hernandez@email.com",
    name: "Hernandez Beach House - Galveston",
    address: "1500 Seawall Blvd, Galveston, TX 77550",
    status: "completed",
    startDate: "2024-06-01",
    notes: "Vacation beach house, completed and delivered November 2025.",
    progress: 100,
  });

  // ── Contracts ───────────────────────────────────────────────
  async function getOrCreateContract(data: {
    projectId: number;
    title: string;
    fileUrl?: string | null;
    version?: string | null;
    status: "draft" | "sent" | "signed";
  }) {
    const [existing] = await db
      .select()
      .from(contractsTable)
      .where(and(eq(contractsTable.projectId, data.projectId), eq(contractsTable.title, data.title)));
    if (existing) return existing;
    const [created] = await db.insert(contractsTable).values(data).returning();
    return created;
  }

  await getOrCreateContract({ projectId: p1.id, title: "Main Contract - Silva Custom Home", fileUrl: "https://example.com/contracts/silva-main-v2.pdf", version: "v2.0", status: "signed" });
  await getOrCreateContract({ projectId: p1.id, title: "Premium Finishes Addendum", fileUrl: "https://example.com/contracts/silva-addendum.pdf", version: "v1.0", status: "sent" });
  await getOrCreateContract({ projectId: p2.id, title: "Gutierrez Remodel Contract", fileUrl: "https://example.com/contracts/gutierrez-main.pdf", version: "v1.0", status: "signed" });
  await getOrCreateContract({ projectId: p3.id, title: "Initial Proposal - Ramirez Build-Out", fileUrl: null, version: "v1.0", status: "draft" });

  // ── Change orders ───────────────────────────────────────────
  async function getOrCreateChangeOrder(data: {
    projectId: number;
    title: string;
    description?: string | null;
    amount: string;
    status: "draft" | "pending" | "approved" | "rejected";
    createdBy: number;
    approvedBy?: number | null;
    approvedAt?: Date | null;
  }) {
    const [existing] = await db
      .select()
      .from(changeOrdersTable)
      .where(and(eq(changeOrdersTable.projectId, data.projectId), eq(changeOrdersTable.title, data.title)));
    if (existing) return existing;
    const [created] = await db.insert(changeOrdersTable).values(data).returning();
    return created;
  }

  await getOrCreateChangeOrder({ projectId: p1.id, title: "Kitchen Upgrade - Carrara Marble", description: "Client requested switching original granite to imported Carrara marble throughout the kitchen, including backsplash and island.", amount: "45000", status: "approved", createdBy: builder1.id, approvedBy: client1.id, approvedAt: new Date("2026-01-15") });
  await getOrCreateChangeOrder({ projectId: p1.id, title: "Smart Home Automation System", description: "Full smart home system installation: intelligent lighting, motorized blinds, climate control, and integrated security system.", amount: "82000", status: "pending", createdBy: builder1.id });
  await getOrCreateChangeOrder({ projectId: p1.id, title: "Rooftop Terrace Expansion", description: "Rooftop terrace expansion with steel pergola, retractable awnings, and BBQ area.", amount: "38500", status: "rejected", createdBy: builder1.id });
  await getOrCreateChangeOrder({ projectId: p2.id, title: "Double-Pane Window Replacement", description: "Replace all existing windows with double-pane tempered glass for improved thermal and acoustic insulation.", amount: "28000", status: "approved", createdBy: builder1.id, approvedBy: client2.id, approvedAt: new Date("2026-01-20") });
  await getOrCreateChangeOrder({ projectId: p2.id, title: "Radiant Floor Heating", description: "Install hydronic radiant floor heating system in living room, dining area, and master bedroom.", amount: "35000", status: "pending", createdBy: builder1.id });

  // ── Photos ──────────────────────────────────────────────────
  const photoData = [
    { projectId: p1.id, fileUrl: "https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=800&q=80", caption: "Foundation complete - Week 3", visibleToClient: true, uploadedBy: builder1.id },
    { projectId: p1.id, fileUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80", caption: "First floor framing complete", visibleToClient: true, uploadedBy: builder1.id },
    { projectId: p1.id, fileUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80", caption: "Electrical rough-in progress - internal", visibleToClient: false, uploadedBy: builder1.id },
    { projectId: p1.id, fileUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80", caption: "Kitchen - approved Carrara marble sample", visibleToClient: true, uploadedBy: builder1.id },
    { projectId: p1.id, fileUrl: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80", caption: "Project overview - Week 8", visibleToClient: true, uploadedBy: builder1.id },
    { projectId: p2.id, fileUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80", caption: "Demo phase complete", visibleToClient: true, uploadedBy: builder1.id },
    { projectId: p2.id, fileUrl: "https://images.unsplash.com/photo-1564540586988-aa4e53c3d799?w=800&q=80", caption: "New windows installed - south wall", visibleToClient: true, uploadedBy: builder1.id },
  ];

  for (const photo of photoData) {
    const [existing] = await db.select().from(photosTable).where(and(eq(photosTable.projectId, photo.projectId), eq(photosTable.fileUrl, photo.fileUrl)));
    if (!existing) await db.insert(photosTable).values(photo);
  }

  // ── Activity logs ────────────────────────────────────────────
  const logData = [
    { projectId: p1.id, type: "project_created", description: 'Project "Silva Custom Home - West Houston" was created', createdBy: builder1.id, createdAt: new Date("2025-11-15") },
    { projectId: p1.id, type: "contract_uploaded", description: 'Contract "Main Contract - Silva Custom Home" was uploaded', createdBy: builder1.id, createdAt: new Date("2025-11-16") },
    { projectId: p1.id, type: "contract_signed", description: 'Contract "Main Contract - Silva Custom Home" was signed', createdBy: builder1.id, createdAt: new Date("2025-11-18") },
    { projectId: p1.id, type: "change_order_created", description: 'Change order "Kitchen Upgrade - Carrara Marble" was created', createdBy: builder1.id, createdAt: new Date("2026-01-10") },
    { projectId: p1.id, type: "change_order_approved", description: 'Change order "Kitchen Upgrade - Carrara Marble" was approved', createdBy: client1.id, createdAt: new Date("2026-01-15") },
    { projectId: p1.id, type: "photo_uploaded", description: '"Foundation complete - Week 3" was uploaded', createdBy: builder1.id, createdAt: new Date("2025-12-01") },
    { projectId: p1.id, type: "change_order_created", description: 'Change order "Smart Home Automation System" was created', createdBy: builder1.id, createdAt: new Date("2026-02-01") },
    { projectId: p2.id, type: "project_created", description: 'Project "Gutierrez Condo Full Remodel - Austin" was created', createdBy: builder1.id, createdAt: new Date("2026-01-08") },
    { projectId: p2.id, type: "contract_signed", description: 'Contract was signed by client', createdBy: client2.id, createdAt: new Date("2026-01-10") },
    { projectId: p3.id, type: "project_created", description: 'Project "Ramirez Corporate Build-Out - Houston" was created', createdBy: builder1.id, createdAt: new Date("2026-03-01") },
  ];

  for (const log of logData) {
    const [existing] = await db.select().from(activityLogsTable).where(and(eq(activityLogsTable.projectId, log.projectId), eq(activityLogsTable.type, log.type), eq(activityLogsTable.description, log.description)));
    if (!existing) await db.insert(activityLogsTable).values(log as any);
  }

  console.log("✅ Seed complete!");
  console.log("\n📋 Organizations:");
  console.log(`  [${org1.id}] ${org1.name} (${org1.slug})`);
  console.log(`  [${org2.id}] ${org2.name} (${org2.slug})`);
  console.log("\n📋 Demo credentials:");
  console.log("  Builder:  carlos@constructoramendoza.com / demo1234");
  console.log("  Client:   roberto@gmail.com / demo1234");
  console.log("  Builder2: ana@torresconstrucciones.com / demo1234");
  console.log("  Client2:  maria@buildos.demo / demo1234");
  console.log("  Client3:  jorge@buildos.demo / demo1234");
}

seed().catch(console.error).finally(() => process.exit());

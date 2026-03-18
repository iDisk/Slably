import {
  db,
  usersTable,
  projectsTable,
  contractsTable,
  changeOrdersTable,
  photosTable,
  activityLogsTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";

console.log("🌱 Seeding BuildOS database...");

async function getOrCreateUser(data: {
  name: string;
  email: string;
  password: string;
  role: "builder" | "client";
}) {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, data.email));

  if (existing) return existing;

  const passwordHash = await bcrypt.hash(data.password, 10);
  const [created] = await db
    .insert(usersTable)
    .values({ name: data.name, email: data.email, passwordHash, role: data.role })
    .returning();

  return created;
}

async function getOrCreateProject(data: {
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
}) {
  const [existing] = await db
    .select()
    .from(projectsTable)
    .where(
      and(
        eq(projectsTable.builderId, data.builderId),
        eq(projectsTable.name, data.name)
      )
    );

  if (existing) return existing;

  const [created] = await db.insert(projectsTable).values(data).returning();
  return created;
}

async function seed() {
  const builder1 = await getOrCreateUser({
    name: "Carlos Mendoza",
    email: "builder@buildos.demo",
    password: "demo1234",
    role: "builder",
  });

  const builder2 = await getOrCreateUser({
    name: "Ana Torres",
    email: "ana@buildos.demo",
    password: "demo1234",
    role: "builder",
  });

  const client1 = await getOrCreateUser({
    name: "Roberto Silva",
    email: "client@buildos.demo",
    password: "demo1234",
    role: "client",
  });

  const client2 = await getOrCreateUser({
    name: "María Gutierrez",
    email: "maria@buildos.demo",
    password: "demo1234",
    role: "client",
  });

  const client3 = await getOrCreateUser({
    name: "Jorge Ramírez",
    email: "jorge@buildos.demo",
    password: "demo1234",
    role: "client",
  });

  const p1 = await getOrCreateProject({
    builderId: builder1.id,
    clientId: client1.id,
    clientName: "Roberto Silva",
    clientEmail: "client@buildos.demo",
    name: "Casa Silva - Residencia Principal",
    address: "Av. Las Palmas 2340, Colonia San Pedro, CDMX",
    status: "active",
    startDate: "2025-11-15",
    notes: "Construcción de casa habitación de 3 pisos. Cliente requiere acabados premium. Atención especial a los plazos acordados.",
    progress: 65,
  });

  const p2 = await getOrCreateProject({
    builderId: builder1.id,
    clientId: client2.id,
    clientName: "María Gutierrez",
    clientEmail: "maria@buildos.demo",
    name: "Remodelación Departamento Gutierrez",
    address: "Calle Roble 87, Int. 4B, Polanco, CDMX",
    status: "active",
    startDate: "2026-01-08",
    notes: "Remodelación completa de departamento 120m². Cambio de pisos, cocina integral nueva, baños completos.",
    progress: 30,
  });

  const p3 = await getOrCreateProject({
    builderId: builder1.id,
    clientId: client3.id,
    clientName: "Jorge Ramírez",
    clientEmail: "jorge@buildos.demo",
    name: "Oficinas Corporativas Ramírez",
    address: "Blvd. Reforma 1890 Piso 8, Col. Juárez, CDMX",
    status: "planning",
    startDate: "2026-04-01",
    notes: "Proyecto de acondicionamiento de oficinas corporativas, aproximadamente 400m². Incluye sala de juntas, área abierta y 6 despachos privados.",
    progress: 5,
  });

  await getOrCreateProject({
    builderId: builder2.id,
    clientName: "Familia Hernández",
    clientEmail: "hernandez@email.com",
    name: "Casa de Playa Hernández",
    address: "Blvd. Costero 450, Cancún, Q. Roo",
    status: "completed",
    startDate: "2024-06-01",
    notes: "Casa vacacional terminada. Entregada en noviembre 2025.",
    progress: 100,
  });

  // Contracts — idempotent by project + title
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
      .where(
        and(
          eq(contractsTable.projectId, data.projectId),
          eq(contractsTable.title, data.title)
        )
      );
    if (existing) return existing;
    const [created] = await db.insert(contractsTable).values(data).returning();
    return created;
  }

  await getOrCreateContract({
    projectId: p1.id,
    title: "Contrato Principal - Casa Silva",
    fileUrl: "https://example.com/contracts/silva-main-v2.pdf",
    version: "v2.0",
    status: "signed",
  });

  await getOrCreateContract({
    projectId: p1.id,
    title: "Addendum Materiales Premium",
    fileUrl: "https://example.com/contracts/silva-addendum.pdf",
    version: "v1.0",
    status: "sent",
  });

  await getOrCreateContract({
    projectId: p2.id,
    title: "Contrato de Remodelación Gutierrez",
    fileUrl: "https://example.com/contracts/gutierrez-main.pdf",
    version: "v1.0",
    status: "signed",
  });

  await getOrCreateContract({
    projectId: p3.id,
    title: "Propuesta Inicial Oficinas Ramírez",
    fileUrl: null,
    version: "v1.0",
    status: "draft",
  });

  // Change orders — idempotent by project + title
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
      .where(
        and(
          eq(changeOrdersTable.projectId, data.projectId),
          eq(changeOrdersTable.title, data.title)
        )
      );
    if (existing) return existing;
    const [created] = await db.insert(changeOrdersTable).values(data).returning();
    return created;
  }

  await getOrCreateChangeOrder({
    projectId: p1.id,
    title: "Upgrade Cocina - Mármol Carrara",
    description: "El cliente solicitó cambiar el granito original por mármol Carrara importado en todas las áreas de cocina. Incluye backsplash y área de isla.",
    amount: "45000",
    status: "approved",
    createdBy: builder1.id,
    approvedBy: client1.id,
    approvedAt: new Date("2026-01-15"),
  });

  await getOrCreateChangeOrder({
    projectId: p1.id,
    title: "Sistema de Domótica Smart Home",
    description: "Instalación de sistema de domótica completo: iluminación inteligente, persianas motorizadas, control de clima y sistema de seguridad integrado.",
    amount: "82000",
    status: "pending",
    createdBy: builder1.id,
  });

  await getOrCreateChangeOrder({
    projectId: p1.id,
    title: "Ampliación Terraza Rooftop",
    description: "Ampliación del área de terraza en azotea, adición de pérgola metálica con lonas retráctiles y área de BBQ.",
    amount: "38500",
    status: "rejected",
    createdBy: builder1.id,
  });

  await getOrCreateChangeOrder({
    projectId: p2.id,
    title: "Cambio de Ventanas a Doble Vidrio",
    description: "Cambio de todas las ventanas actuales por ventanas con doble vidrio templado para mejor aislamiento térmico y acústico.",
    amount: "28000",
    status: "approved",
    createdBy: builder1.id,
    approvedBy: client2.id,
    approvedAt: new Date("2026-01-20"),
  });

  await getOrCreateChangeOrder({
    projectId: p2.id,
    title: "Calefacción de Piso Radiante",
    description: "Instalación de sistema de piso radiante hidráulico en sala, comedor y habitación principal.",
    amount: "35000",
    status: "pending",
    createdBy: builder1.id,
  });

  // Photos — idempotent by project + fileUrl
  const photoData = [
    { projectId: p1.id, fileUrl: "https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=800&q=80", caption: "Cimentación terminada - Semana 3", visibleToClient: true, uploadedBy: builder1.id },
    { projectId: p1.id, fileUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80", caption: "Estructura primer piso completada", visibleToClient: true, uploadedBy: builder1.id },
    { projectId: p1.id, fileUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80", caption: "Avance instalaciones eléctricas - uso interno", visibleToClient: false, uploadedBy: builder1.id },
    { projectId: p1.id, fileUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80", caption: "Cocina - muestra mármol Carrara aprobado", visibleToClient: true, uploadedBy: builder1.id },
    { projectId: p1.id, fileUrl: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80", caption: "Vista general del proyecto - Semana 8", visibleToClient: true, uploadedBy: builder1.id },
    { projectId: p2.id, fileUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80", caption: "Demolición inicial completada", visibleToClient: true, uploadedBy: builder1.id },
    { projectId: p2.id, fileUrl: "https://images.unsplash.com/photo-1564540586988-aa4e53c3d799?w=800&q=80", caption: "Nuevas ventanas instaladas - pared sur", visibleToClient: true, uploadedBy: builder1.id },
  ];

  for (const photo of photoData) {
    const [existing] = await db
      .select()
      .from(photosTable)
      .where(
        and(
          eq(photosTable.projectId, photo.projectId),
          eq(photosTable.fileUrl, photo.fileUrl)
        )
      );
    if (!existing) {
      await db.insert(photosTable).values(photo);
    }
  }

  // Activity logs — only insert if no logs exist for the project
  const logData = [
    { projectId: p1.id, type: "project_created", description: 'Proyecto "Casa Silva - Residencia Principal" fue creado', createdBy: builder1.id, createdAt: new Date("2025-11-15") },
    { projectId: p1.id, type: "contract_uploaded", description: 'Contrato "Contrato Principal - Casa Silva" fue subido', createdBy: builder1.id, createdAt: new Date("2025-11-16") },
    { projectId: p1.id, type: "contract_signed", description: 'Contrato "Contrato Principal - Casa Silva" fue firmado', createdBy: builder1.id, createdAt: new Date("2025-11-18") },
    { projectId: p1.id, type: "change_order_created", description: 'Change order "Upgrade Cocina - Mármol Carrara" fue creado', createdBy: builder1.id, createdAt: new Date("2026-01-10") },
    { projectId: p1.id, type: "change_order_approved", description: 'Change order "Upgrade Cocina - Mármol Carrara" fue aprobado', createdBy: client1.id, createdAt: new Date("2026-01-15") },
    { projectId: p1.id, type: "photo_uploaded", description: '"Cimentación terminada - Semana 3" fue subida', createdBy: builder1.id, createdAt: new Date("2025-12-01") },
    { projectId: p1.id, type: "change_order_created", description: 'Change order "Sistema de Domótica Smart Home" fue creado', createdBy: builder1.id, createdAt: new Date("2026-02-01") },
    { projectId: p2.id, type: "project_created", description: 'Proyecto "Remodelación Departamento Gutierrez" fue creado', createdBy: builder1.id, createdAt: new Date("2026-01-08") },
    { projectId: p2.id, type: "contract_signed", description: 'Contrato fue firmado por el cliente', createdBy: client2.id, createdAt: new Date("2026-01-10") },
    { projectId: p3.id, type: "project_created", description: 'Proyecto "Oficinas Corporativas Ramírez" fue creado', createdBy: builder1.id, createdAt: new Date("2026-03-01") },
  ];

  for (const log of logData) {
    const [existing] = await db
      .select()
      .from(activityLogsTable)
      .where(
        and(
          eq(activityLogsTable.projectId, log.projectId),
          eq(activityLogsTable.type, log.type),
          eq(activityLogsTable.description, log.description)
        )
      );
    if (!existing) {
      await db.insert(activityLogsTable).values(log as any);
    }
  }

  console.log("✅ Seed complete!");
  console.log("\n📋 Demo credentials:");
  console.log("  Builder:  builder@buildos.demo / demo1234");
  console.log("  Client:   client@buildos.demo / demo1234");
  console.log("  Builder2: ana@buildos.demo / demo1234");
  console.log("  Client2:  maria@buildos.demo / demo1234");
  console.log("  Client3:  jorge@buildos.demo / demo1234");
}

seed().catch(console.error).finally(() => process.exit());

import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, contractTemplatesTable, generatedDocumentsTable, organizationsTable, usersTable } from "@workspace/db";
import {
  ListTemplatesQuery,
  GetTemplateParams,
  DocumentProjectParams,
  DocumentParams,
  CreateDocumentBody,
  SignDocumentBody,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { checkProjectAccess } from "../lib/project-access.js";

const router: IRouter = Router();

// ─── helper ──────────────────────────────────────────────────────────────────
function replaceVars(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// ─── ENDPOINT 1 — GET /api/templates ─────────────────────────────────────────
router.get("/templates", async (req, res): Promise<void> => {
  const parsed = ListTemplatesQuery.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const rows = await db
    .select({
      id:       contractTemplatesTable.id,
      type:     contractTemplatesTable.type,
      language: contractTemplatesTable.language,
      title:    contractTemplatesTable.title,
    })
    .from(contractTemplatesTable)
    .where(eq(contractTemplatesTable.isActive, true));

  const { type, language } = parsed.data;
  const filtered = rows.filter((r) =>
    (!type     || r.type     === type) &&
    (!language || r.language === language)
  );

  res.json(filtered);
});

// ─── ENDPOINT 2 — GET /api/templates/:id ─────────────────────────────────────
router.get("/templates/:id", async (req, res): Promise<void> => {
  const params = GetTemplateParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [template] = await db
    .select()
    .from(contractTemplatesTable)
    .where(eq(contractTemplatesTable.id, params.data.id));

  if (!template) { res.status(404).json({ error: "Template not found" }); return; }

  res.json(template);
});

// ─── ENDPOINT 3 — POST /api/projects/:id/documents ───────────────────────────
router.post("/projects/:id/documents", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DocumentProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.id, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [template] = await db
    .select()
    .from(contractTemplatesTable)
    .where(eq(contractTemplatesTable.id, parsed.data.template_id));

  if (!template) { res.status(404).json({ error: "Template not found" }); return; }

  const [userRow] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
  const contractorName = userRow?.name ?? user.email;

  let org = { companyName: null as string | null, licenseNumber: null as string | null, state: null as string | null, phone: null as string | null, name: "" };
  if (user.organizationId) {
    const [row] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, user.organizationId));
    if (row) org = row;
  }

  const vars: Record<string, string> = {
    ...parsed.data.field_values,
    contractor_name:    contractorName,
    contractor_company: org.companyName    ?? org.name,
    contractor_address: org.name,
    contractor_license: org.licenseNumber  ?? "",
    contractor_state:   org.state          ?? "",
    contractor_phone:   org.phone          ?? "",
    project_address:    project.address,
    project_name:       project.name,
  };

  const finalContent = replaceVars(template.content, vars);

  const [doc] = await db.insert(generatedDocumentsTable).values({
    projectId:   project.id,
    templateId:  template.id,
    type:        template.type,
    language:    parsed.data.language,
    title:       parsed.data.title,
    content:     finalContent,
    status:      "draft",
    fieldValues: parsed.data.field_values,
  }).returning();

  res.status(201).json(doc);
});

// ─── ENDPOINT 4 — GET /api/projects/:id/documents ────────────────────────────
router.get("/projects/:id/documents", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DocumentProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const project = await checkProjectAccess(params.data.id, req.user!);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const docs = await db
    .select({
      id:                 generatedDocumentsTable.id,
      projectId:          generatedDocumentsTable.projectId,
      templateId:         generatedDocumentsTable.templateId,
      type:               generatedDocumentsTable.type,
      language:           generatedDocumentsTable.language,
      title:              generatedDocumentsTable.title,
      status:             generatedDocumentsTable.status,
      contractorSignedAt: generatedDocumentsTable.contractorSignedAt,
      clientSignedAt:     generatedDocumentsTable.clientSignedAt,
      signedAt:           generatedDocumentsTable.signedAt,
      createdAt:          generatedDocumentsTable.createdAt,
      updatedAt:          generatedDocumentsTable.updatedAt,
    })
    .from(generatedDocumentsTable)
    .where(eq(generatedDocumentsTable.projectId, params.data.id));

  res.json(docs);
});

// ─── ENDPOINT 5 — GET /api/projects/:id/documents/:docId ─────────────────────
router.get("/projects/:id/documents/:docId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DocumentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const project = await checkProjectAccess(params.data.id, req.user!);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [doc] = await db
    .select()
    .from(generatedDocumentsTable)
    .where(and(
      eq(generatedDocumentsTable.id,        params.data.docId),
      eq(generatedDocumentsTable.projectId, params.data.id),
    ));

  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }

  res.json(doc);
});

// ─── ENDPOINT 6 — POST /api/projects/:id/documents/:docId/sign ───────────────
router.post("/projects/:id/documents/:docId/sign", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DocumentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const project = await checkProjectAccess(params.data.id, req.user!);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = SignDocumentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db
    .select()
    .from(generatedDocumentsTable)
    .where(and(
      eq(generatedDocumentsTable.id,        params.data.docId),
      eq(generatedDocumentsTable.projectId, params.data.id),
    ));

  if (!existing) { res.status(404).json({ error: "Document not found" }); return; }

  const now = new Date();
  const ip  = req.ip ?? null;

  const updateData: Record<string, unknown> =
    parsed.data.role === "contractor"
      ? { contractorSignature: parsed.data.signature, contractorSignedAt: now, contractorIp: ip }
      : { clientSignature:     parsed.data.signature, clientSignedAt:     now, clientIp:     ip };

  const contractorSig = parsed.data.role === "contractor" ? parsed.data.signature : existing.contractorSignature;
  const clientSig     = parsed.data.role === "client"     ? parsed.data.signature : existing.clientSignature;

  if (contractorSig && clientSig) {
    updateData.signedAt = now;
    updateData.status   = "signed";
  }

  const [doc] = await db
    .update(generatedDocumentsTable)
    .set(updateData)
    .where(and(
      eq(generatedDocumentsTable.id,        params.data.docId),
      eq(generatedDocumentsTable.projectId, params.data.id),
    ))
    .returning();

  res.json(doc);
});

export default router;

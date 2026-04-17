import { Router } from 'express';
import { db } from '@workspace/db';
import { leads, leadActivities } from '@workspace/db';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { requireAuth } from '../lib/auth.js';
import { z } from 'zod';

const router = Router();

const LeadStatusEnum = z.enum(['new', 'contacted', 'quote_sent', 'negotiating', 'won', 'lost']);
const LeadSourceEnum = z.enum(['manual', 'meta_ads', 'referral', 'cpa', 'rfq', 'youtube', 'other']);
const ActivityTypeEnum = z.enum(['call', 'whatsapp', 'email', 'visit', 'note', 'status_change']);

const createLeadSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  source: LeadSourceEnum.default('manual'),
  estimatedValue: z.number().positive().optional(),
  notes: z.string().optional(),
  vertical: z.enum(['construction', 'real_estate']).default('construction'),
});

const updateLeadSchema = createLeadSchema.partial().extend({
  status: LeadStatusEnum.optional(),
  lostReason: z.string().optional(),
  projectId: z.number().optional(),
});

const createActivitySchema = z.object({
  type: ActivityTypeEnum,
  note: z.string().min(1),
});

// GET / — Lista de leads
router.get('/', requireAuth, async (req, res): Promise<void> => {
  const orgId = (req as any).user.organizationId;
  const { status, source } = req.query;

  const conditions = [
    eq(leads.organizationId, orgId),
    isNull(leads.deletedAt),
  ] as any[];

  if (status) conditions.push(eq(leads.status, status as string));
  if (source) conditions.push(eq(leads.source, source as string));

  const rows = await db
    .select()
    .from(leads)
    .where(and(...conditions))
    .orderBy(desc(leads.createdAt));

  res.json(rows);
});

// GET /:id — Lead con actividades
router.get('/:id', requireAuth, async (req, res): Promise<void> => {
  const orgId = (req as any).user.organizationId;
  const leadId = parseInt(req.params.id as string);

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(
      eq(leads.id, leadId),
      eq(leads.organizationId, orgId),
      isNull(leads.deletedAt)
    ))
    .limit(1);

  if (!lead) { res.status(404).json({ error: 'Lead not found' }); return; }

  const activities = await db
    .select()
    .from(leadActivities)
    .where(eq(leadActivities.leadId, leadId))
    .orderBy(desc(leadActivities.createdAt));

  res.json({ ...lead, activities });
});

// POST / — Crear lead
router.post('/', requireAuth, async (req, res): Promise<void> => {
  const parsed = createLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() }); return;
  }

  const user = (req as any).user;

  const [lead] = await db
    .insert(leads)
    .values({
      ...parsed.data,
      estimatedValue: parsed.data.estimatedValue?.toString(),
      organizationId: user.organizationId,
    })
    .returning();

  await db.insert(leadActivities).values({
    leadId: lead.id,
    organizationId: user.organizationId,
    type: 'note',
    note: 'Lead created',
    createdBy: user.id,
  });

  res.status(201).json(lead);
});

// PATCH /:id — Actualizar lead
router.patch('/:id', requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const leadId = parseInt(req.params.id as string);

  const parsed = updateLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() }); return;
  }

  const [current] = await db
    .select()
    .from(leads)
    .where(and(
      eq(leads.id, leadId),
      eq(leads.organizationId, user.organizationId),
      isNull(leads.deletedAt)
    ))
    .limit(1);

  if (!current) { res.status(404).json({ error: 'Lead not found' }); return; }

  const updateData: Record<string, any> = {
    ...parsed.data,
    estimatedValue: parsed.data.estimatedValue?.toString(),
    updatedAt: new Date(),
  };

  if (parsed.data.status === 'won' && !current.convertedAt) {
    updateData.convertedAt = new Date();
  }

  const [updated] = await db
    .update(leads)
    .set(updateData)
    .where(and(
      eq(leads.id, leadId),
      eq(leads.organizationId, user.organizationId)
    ))
    .returning();

  if (parsed.data.status && parsed.data.status !== current.status) {
    await db.insert(leadActivities).values({
      leadId,
      organizationId: user.organizationId,
      type: 'status_change',
      note: `Status changed: ${current.status} → ${parsed.data.status}`,
      statusFrom: current.status ?? undefined,
      statusTo: parsed.data.status,
      createdBy: user.id,
    });
  }

  res.json(updated);
});

// DELETE /:id — Soft delete
router.delete('/:id', requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  await db
    .update(leads)
    .set({ deletedAt: new Date() })
    .where(and(
      eq(leads.id, parseInt(req.params.id as string)),
      eq(leads.organizationId, user.organizationId)
    ));
  res.json({ ok: true });
});

// POST /:id/activities — Agregar actividad
router.post('/:id/activities', requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const leadId = parseInt(req.params.id as string);

  const parsed = createActivitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() }); return;
  }

  const [activity] = await db
    .insert(leadActivities)
    .values({
      leadId,
      organizationId: user.organizationId,
      type: parsed.data.type,
      note: parsed.data.note,
      createdBy: user.id,
    })
    .returning();

  res.status(201).json(activity);
});

export default router;

import { Router, type IRouter } from 'express';
import { z } from 'zod/v4';
import { eq } from 'drizzle-orm';
import { db, organizationsTable } from '@workspace/db';
import { requireAuth, type AuthRequest } from '../lib/auth.js';
import { getStripe, PLAN_PRICE_IDS } from '../lib/stripe.js';

const router: IRouter = Router();

const CheckoutBody = z.object({
  plan: z.enum(['starter', 'pro', 'business']),
});

router.post('/checkout', requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;

  if (user.role !== 'builder') {
    res.status(403).json({ error: 'Only builders can subscribe' });
    return;
  }

  if (!user.organizationId) {
    res.status(403).json({ error: 'Builder must belong to an organization' });
    return;
  }

  const parsed = CheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid plan' });
    return;
  }

  const { plan } = parsed.data;
  const priceId = PLAN_PRICE_IDS[plan];

  if (!priceId) {
    res.status(500).json({
      error: 'stripe_not_configured',
      message: 'Stripe price IDs not configured',
    });
    return;
  }

  const [org] = await db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.id, user.organizationId));

  if (!org) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }

  const stripe = getStripe();
  let stripeCustomerId = org.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { organizationId: String(org.id) },
    });
    stripeCustomerId = customer.id;
    await db.update(organizationsTable)
      .set({ stripeCustomerId })
      .where(eq(organizationsTable.id, org.id));
  }

  const appUrl = process.env.APP_URL ?? 'http://localhost:5173';

  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${appUrl}/pricing`,
    metadata: {
      organizationId: String(org.id),
      plan,
    },
    ...(plan === 'starter' && {
      subscription_data: { trial_period_days: 30 },
    }),
  };

  const session = await stripe.checkout.sessions.create(sessionParams);
  res.json({ url: session.url });
});

export default router;

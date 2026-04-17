import { Router, type IRouter } from 'express';
import express from 'express';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db, organizationsTable } from '@workspace/db';
import { getStripe, PLAN_PRICE_IDS } from '../lib/stripe.js';

const router: IRouter = Router();

router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res): Promise<void> => {
    const sig = req.headers['stripe-signature'] as string | undefined;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      res.status(400).json({ error: 'invalid_signature' });
      return;
    }

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch {
      res.status(400).json({ error: 'invalid_signature' });
      return;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const organizationId = Number(session.metadata?.organizationId);
          const plan = session.metadata?.plan;
          if (!organizationId || !plan) break;
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : (session.subscription as { id?: string })?.id ?? null;
          await db.update(organizationsTable)
            .set({
              subscriptionPlan:         plan,
              stripeSubscriptionId:     subscriptionId,
              stripeSubscriptionStatus: 'active',
            })
            .where(eq(organizationsTable.id, organizationId));
          break;
        }

        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription;
          const priceId = sub.items.data[0]?.price.id;
          const planName = Object.entries(PLAN_PRICE_IDS)
            .find(([, id]) => id === priceId)?.[0];
          if (!planName) break;
          await db.update(organizationsTable)
            .set({
              subscriptionPlan:         planName,
              stripeSubscriptionStatus: sub.status,
            })
            .where(eq(organizationsTable.stripeSubscriptionId, sub.id));
          break;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          await db.update(organizationsTable)
            .set({
              subscriptionPlan:         'free',
              stripeSubscriptionStatus: 'canceled',
            })
            .where(eq(organizationsTable.stripeSubscriptionId, sub.id));
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId =
            typeof invoice.customer === 'string'
              ? invoice.customer
              : (invoice.customer as { id?: string })?.id ?? '';
          if (!customerId) break;
          await db.update(organizationsTable)
            .set({ stripeSubscriptionStatus: 'past_due' })
            .where(eq(organizationsTable.stripeCustomerId, customerId));
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('[Stripe Webhook] Handler error:', err);
      res.status(500).json({ error: 'webhook_handler_error' });
      return;
    }

    res.json({ received: true });
  }
);

export default router;

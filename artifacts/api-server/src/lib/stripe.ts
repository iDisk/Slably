import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not set");
    _stripe = new Stripe(key, {
      apiVersion: "2026-03-25.dahlia"
    });
  }
  return _stripe;
}

export async function createStripeCustomer(
  email: string,
  name: string,
  organizationId: number
): Promise<string> {
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { organizationId: String(organizationId) }
  });
  return customer.id;
}

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, getPlanFromPriceId } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    console.error("[webhooks/stripe] Missing signature or STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Bad config" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error("[webhooks/stripe] Signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (event.type === "checkout.session.completed") {
    try {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const supabaseUserId = session.metadata?.supabase_user_id as string | undefined;

      if (!subscriptionId || !supabaseUserId) {
        console.error("[webhooks/stripe] checkout.session.completed missing subscription or metadata");
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price?.id;
      const plan = priceId ? getPlanFromPriceId(priceId) : "free";

      await supabase
        .from("profiles")
        .update({
          plan,
          stripe_customer_id: customerId ?? undefined,
          stripe_subscription_id: subscriptionId,
        })
        .eq("id", supabaseUserId);
    } catch (err) {
      console.error("[webhooks/stripe] checkout.session.completed handler", err);
    }
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (event.type === "customer.subscription.updated") {
    try {
      const subscription = event.data.object as Stripe.Subscription;
      const subscriptionId = subscription.id;
      const priceId = subscription.items.data[0]?.price?.id;
      const plan = priceId ? getPlanFromPriceId(priceId) : "free";

      await supabase
        .from("profiles")
        .update({ plan })
        .eq("stripe_subscription_id", subscriptionId);
    } catch (err) {
      console.error("[webhooks/stripe] customer.subscription.updated handler", err);
    }
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (event.type === "customer.subscription.deleted") {
    try {
      const subscription = event.data.object as Stripe.Subscription;
      const subscriptionId = subscription.id;

      await supabase
        .from("profiles")
        .update({ plan: "free", stripe_subscription_id: null })
        .eq("stripe_subscription_id", subscriptionId);
    } catch (err) {
      console.error("[webhooks/stripe] customer.subscription.deleted handler", err);
    }
    return NextResponse.json({ received: true }, { status: 200 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

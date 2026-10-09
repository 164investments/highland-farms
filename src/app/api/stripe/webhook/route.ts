import { NextResponse } from "next/server";
import { verifyStripeEvent, stripeLiveMode, stripeRequest } from "@/lib/payments/stripe";
import { reconcileSession, notifyPaidAttempt } from "@/lib/payments/service";
import { recordStripeRefund } from "@/lib/payments/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  const raw = await request.text();
  if (raw.length > 1048576) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  let event;
  try {
    event = verifyStripeEvent(raw, request.headers.get("stripe-signature") ?? "", secret);
    if (event.livemode !== stripeLiveMode()) throw new Error("Wrong payment mode");
  } catch { return NextResponse.json({ error: "Invalid webhook" }, { status: 400 }); }
  try {
    if (["checkout.session.completed", "checkout.session.expired", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed"].includes(event.type)) {
      const attempt = await reconcileSession(event.data.object.id);
      if (attempt) await notifyPaidAttempt(attempt);
    } else if (event.type === "charge.refunded") {
      // Fetch canonical cumulative amount. Duplicate and out-of-order events
      // must not add a refund twice or reduce an already recorded refund.
      const id = event.data.object.id;
      if (!/^ch_[A-Za-z0-9]+$/.test(id)) throw new Error("Invalid charge id");
      const charge = await stripeRequest<{ payment_intent: string | null; amount_refunded: number }>(`/v1/charges/${id}`);
      if (charge.payment_intent) await recordStripeRefund(charge.payment_intent, charge.amount_refunded);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe] webhook retry required", event.id, error instanceof Error ? error.name : "storage_error");
    return NextResponse.json({ error: "Please retry delivery" }, { status: 503 });
  }
}

import { after, NextResponse } from "next/server";
import { nativeCalendarEnabled } from "@/lib/booking/flag";
import { CheckoutError, parseCheckoutInput, checkoutRequestHash, prepareCheckout } from "@/lib/payments/prepare";
import { getAttemptByIdempotencyKey, reserveAttempt } from "@/lib/payments/store";
import { hostedSession, reconcileAttempt, notifyPaidAttempt } from "@/lib/payments/service";
import { stripeEnabled, stripeConfigured } from "@/lib/payments/stripe";
import { allowedCheckoutOrigin, paymentRateLimited } from "@/lib/payments/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!stripeEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    if (!allowedCheckoutOrigin(request)) return NextResponse.json({ error: "Unauthorized request origin." }, { status: 403 });
    if (paymentRateLimited(request, 12)) return NextResponse.json({ error: "Please wait a few minutes before trying again." }, { status: 429 });
    const raw = await request.text();
    if (raw.length > 65536) return NextResponse.json({ error: "Checkout request is too large." }, { status: 413 });
    let json: unknown;
    try { json = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid checkout details." }, { status: 400 }); }
    const input = parseCheckoutInput(json);
    if (input.kind !== "shop" && !nativeCalendarEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (input.website) return NextResponse.json({ error: "Please contact the farm to finish this request." }, { status: 400 });
    if (!stripeConfigured()) return NextResponse.json({ error: "Online payment isn't available right now. Please call the farm." }, { status: 503 });
    const hash = checkoutRequestHash(input);
    let attempt = await getAttemptByIdempotencyKey(input.idempotencyKey);
    if (attempt && attempt.request_hash !== hash) return NextResponse.json({ error: "Those checkout details changed. Please start a new payment." }, { status: 409 });
    if (!attempt) {
      const prepared = await prepareCheckout(input);
      if (prepared.quiet) return NextResponse.json(prepared.result);
      attempt = await reserveAttempt(prepared);
    }
    attempt = await reconcileAttempt(attempt);
    if (attempt.status === "paid") {
      after(() => notifyPaidAttempt(attempt!));
      return NextResponse.json({ success: true, ...attempt.result, amountCents: attempt.due_cents });
    }
    if (attempt.status === "expired") return NextResponse.json({ error: "That payment session expired. Please start again.", status: "expired" }, { status: 409 });
    if (attempt.status !== "pending") return NextResponse.json({ error: "Your payment is being checked. Please use the confirmation page before trying again.", status: attempt.status }, { status: 409 });
    const session = await hostedSession(attempt);
    if (session.status === "expired") {
      return NextResponse.json({ error: "That payment session expired. Please start again.", status: "expired" }, { status: 409 });
    }
    if (!session.url || new URL(session.url).origin !== "https://checkout.stripe.com") throw new Error("Unexpected Stripe checkout URL");
    return NextResponse.json({ checkoutUrl: session.url, sessionId: session.id, reference: attempt.reference });
  } catch (error) {
    if (error instanceof CheckoutError) return NextResponse.json({ error: error.message }, { status: error.status });
    const code = (error as { code?: string })?.code;
    if (code === "P0001") return NextResponse.json({ error: "That item or time is no longer available. Please choose again." }, { status: 409 });
    if (code === "22023") return NextResponse.json({ error: "Those checkout details changed. Please start a new payment." }, { status: 409 });
    // An unknown gateway outcome leaves the same durable attempt recoverable.
    console.error("[stripe] checkout could not complete", error instanceof Error ? error.name : code ?? "unknown");
    return NextResponse.json({ error: "We couldn't finish setting up payment. Please retry with the same details, or call the farm.", reuseIdempotencyKey: true }, { status: 503 });
  }
}

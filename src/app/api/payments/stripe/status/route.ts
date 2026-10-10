import { after, NextResponse } from "next/server";
import { reconcileSession, publicAttempt, notifyPaidAttempt } from "@/lib/payments/service";
import { stripeConfigured } from "@/lib/payments/stripe";
import { paymentRateLimited } from "@/lib/payments/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("session_id") ?? "";
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return NextResponse.json({ error: "Invalid receipt." }, { status: 400, headers });
  if (!stripeConfigured()) return NextResponse.json({ error: "Payment verification is unavailable." }, { status: 503, headers });
  if (paymentRateLimited(request, 120)) return NextResponse.json({ error: "Please wait before checking again." }, { status: 429, headers });
  try {
    const attempt = await reconcileSession(id);
    if (!attempt) return NextResponse.json({ error: "Receipt not found." }, { status: 404, headers });
    after(() => notifyPaidAttempt(attempt));
    return NextResponse.json(publicAttempt(attempt), { headers });
  } catch {
    return NextResponse.json({ error: "Payment verification is still in progress. Please check again." }, { status: 503, headers });
  }
}

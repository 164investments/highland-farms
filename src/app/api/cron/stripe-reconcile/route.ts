import { NextResponse } from "next/server";
import { listRecoverableAttempts, markReconciled } from "@/lib/payments/store";
import { reconcileAttempt, notifyPaidAttempt } from "@/lib/payments/service";
import { stripeConfigured } from "@/lib/payments/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!stripeConfigured()) return NextResponse.json({ skipped: "Stripe is not configured" });
  let checked = 0;
  let failed = 0;
  try {
    // Work is bounded so a slow gateway cannot consume the entire cron budget.
    const deadline = Date.now() + 180000;
    for (const attempt of await listRecoverableAttempts(50)) {
      if (Date.now() > deadline) break;
      try {
        const result = await reconcileAttempt(attempt);
        await notifyPaidAttempt(result);
        checked++;
      } catch { failed++; console.error("[stripe] reconciliation retry required", attempt.id); }
      finally {
        try { await markReconciled(attempt.id); }
        catch { failed++; console.error("[stripe] recovery queue rotation failed", attempt.id); }
      }
    }
    return NextResponse.json({ checked, failed }, { status: failed ? 503 : 200 });
  } catch { return NextResponse.json({ error: "Reconciliation is unavailable" }, { status: 503 }); }
}

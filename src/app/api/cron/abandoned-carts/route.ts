import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getVariant } from "@/app/shop/data";
import { toCents } from "@/lib/shop/money";
import { getStockMap } from "@/lib/shop/inventory";
import {
  renderReminder,
  renderReminderText,
  subjectFor,
  type ReminderLine,
} from "@/lib/shop/abandoned-cart-email";

/**
 * Cart reminders. Hourly.
 *
 * Two sends and then we stop:
 *   step 1 — ~1 hour after they went quiet. Early enough that the intent is
 *            still live, late enough that we're not mailing someone who stepped
 *            away for five minutes.
 *   step 2 — ~24 hours after. Last one.
 *
 * The rules that keep this from embarrassing the farm:
 *   - never mail a cart that has since been ordered
 *   - never mail an unsubscribed address
 *   - never mail the same step twice (the timestamp is written before the send)
 *   - never mail a cart whose items are all sold out, and drop the sold-out
 *     lines from one that's partly gone
 *   - never mail a cart older than a week; that's not a reminder, it's a cold
 *     email to someone who forgot us
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HOUR = 60 * 60 * 1000;
const STEP_1_AFTER = 1 * HOUR;
const STEP_2_AFTER = 24 * HOUR;
const TOO_OLD = 7 * 24 * HOUR;
/** Ceiling per run so a backlog or a bug can't turn into a mail blast. */
const MAX_SENDS_PER_RUN = 40;

const FROM = "Highland Farms <notifications@highlandfarmsoregon.com>";

let client: SupabaseClient | undefined;
function db(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("cart reminders need Supabase server credentials");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

interface CartRow {
  id: string;
  recovery_token: string;
  email: string;
  name: string | null;
  items: { variantId: string; quantity: number }[];
  updated_at: string;
  reminder_1_at: string | null;
  reminder_2_at: string | null;
}

function firstNameOf(row: CartRow): string {
  const first = (row.name ?? "").trim().split(/\s+/)[0];
  return first || "there";
}

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const result = { considered: 0, sent1: 0, sent2: 0, skipped: 0, failed: 0 };

  try {
    const { data, error } = await db()
      .from("shop_abandoned_carts")
      .select(
        "id, recovery_token, email, name, items, updated_at, reminder_1_at, reminder_2_at",
      )
      .is("recovered_at", null)
      .is("unsubscribed_at", null)
      .gt("updated_at", new Date(now - TOO_OLD).toISOString())
      .order("updated_at", { ascending: true })
      .limit(200);

    if (error) {
      console.error("[cart-reminders] read failed:", error.message);
      return NextResponse.json({ error: "read failed" }, { status: 500 });
    }

    const carts = (data ?? []) as CartRow[];
    result.considered = carts.length;
    if (carts.length === 0) return NextResponse.json({ ok: true, ...result });

    const stock = await getStockMap();
    const resend = new Resend(process.env.RESEND_API_KEY);

    // One query for everyone who has ordered since their cart was last touched.
    // Cheaper and safer than asking per cart.
    const { data: orders } = await db()
      .from("shop_orders")
      .select("customer_email, created_at")
      .gt("created_at", new Date(now - TOO_OLD).toISOString());
    const orderedAt = new Map<string, number>();
    for (const o of orders ?? []) {
      const email = (o.customer_email as string).toLowerCase();
      const at = new Date(o.created_at as string).getTime();
      orderedAt.set(email, Math.max(orderedAt.get(email) ?? 0, at));
    }

    let sends = 0;
    for (const cart of carts) {
      if (sends >= MAX_SENDS_PER_RUN) break;

      const idle = now - new Date(cart.updated_at).getTime();
      let step: 1 | 2 | null = null;
      if (!cart.reminder_1_at && idle >= STEP_1_AFTER) step = 1;
      else if (cart.reminder_1_at && !cart.reminder_2_at && idle >= STEP_2_AFTER) step = 2;
      if (!step) continue;

      // Bought since? Then this isn't an abandoned cart, it's a customer.
      const bought = orderedAt.get(cart.email.toLowerCase());
      if (bought && bought >= new Date(cart.updated_at).getTime()) {
        await db()
          .from("shop_abandoned_carts")
          .update({ recovered_at: new Date().toISOString() })
          .eq("id", cart.id);
        result.skipped += 1;
        continue;
      }

      // Re-derive every line from the catalog and drop what's gone. Mailing a
      // photo of something we can't sell is worse than not mailing at all.
      const lines: ReminderLine[] = [];
      let subtotalCents = 0;
      for (const item of cart.items ?? []) {
        const found = getVariant(item.variantId);
        if (!found) continue;
        const left = stock.has(item.variantId) ? stock.get(item.variantId)! : null;
        if (left === 0) continue;
        const unit = toCents(found.variant.price);
        subtotalCents += unit * item.quantity;
        lines.push({
          name: found.product.name,
          variantLabel: found.variant.label,
          image: found.product.image,
          quantity: item.quantity,
          unitPriceCents: unit,
          stockLeft: left,
        });
      }

      if (lines.length === 0) {
        result.skipped += 1;
        continue;
      }

      const payload = {
        firstName: firstNameOf(cart),
        recoveryToken: cart.recovery_token,
        lines,
        subtotalCents,
        step,
      };

      // Stamp BEFORE sending. A crash after the send would otherwise let the
      // next run mail the same person again; a crash after the stamp costs one
      // reminder, which is the cheaper mistake.
      const column = step === 1 ? "reminder_1_at" : "reminder_2_at";
      const { error: stampError } = await db()
        .from("shop_abandoned_carts")
        .update({ [column]: new Date().toISOString() })
        .eq("id", cart.id)
        .is(column, null);

      if (stampError) {
        console.error("[cart-reminders] stamp failed:", stampError.message);
        result.failed += 1;
        continue;
      }

      try {
        await resend.emails.send({
          from: FROM,
          to: [cart.email],
          subject: subjectFor(payload),
          html: renderReminder(payload),
          text: renderReminderText(payload),
          headers: {
            // One-click unsubscribe, honoured by Gmail and Outlook natively.
            "List-Unsubscribe": `<https://highlandfarmsoregon.com/shop/unsubscribe?token=${encodeURIComponent(cart.recovery_token)}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        sends += 1;
        if (step === 1) result.sent1 += 1;
        else result.sent2 += 1;
      } catch (err) {
        console.error(`[cart-reminders] send failed for cart ${cart.id}:`, err);
        result.failed += 1;
      }
    }

    console.log("[cart-reminders]", JSON.stringify(result));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cart-reminders] threw:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

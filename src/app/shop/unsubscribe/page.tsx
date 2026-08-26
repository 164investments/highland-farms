import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Check } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { CONTACT } from "@/lib/constants";

/**
 * One-click unsubscribe from cart reminders.
 *
 * CAN-SPAM requires a working opt-out that needs no account and no reply, and
 * that keeps working for at least 30 days after the send. A GET that acts is
 * the right call here despite the usual "GET shouldn't mutate" rule: mail
 * clients won't POST, and making someone fill in a form to stop email is the
 * pattern the law exists to prevent.
 */

export const metadata: Metadata = {
  title: "Unsubscribed | Highland Farms",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function unsubscribe(token: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  const db = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await db
    .from("shop_abandoned_carts")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("recovery_token", token);

  if (error) {
    console.error("[shop] unsubscribe failed:", error.message);
    return false;
  }
  return true;
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const ok = token ? await unsubscribe(token) : false;

  return (
    <main className="bg-cream pt-32 pb-20">
      <Container className="max-w-lg text-center">
        {ok ? (
          <>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest text-white">
              <Check className="h-5 w-5" />
            </span>
            <h1 className="mt-5 font-display text-2xl font-light text-charcoal">
              You&apos;re unsubscribed
            </h1>
            <p className="mt-3 text-sm text-muted font-sans">
              We won&apos;t send you any more cart reminders. Order confirmations
              still come through, since those are receipts for something you
              bought.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-light text-charcoal">
              We couldn&apos;t find that link
            </h1>
            <p className="mt-3 text-sm text-muted font-sans">
              It may have already been used. Call or text {CONTACT.phone} and
              we&apos;ll take care of it.
            </p>
          </>
        )}
        <Link
          href="/shop"
          className="mt-7 inline-flex min-h-[48px] items-center rounded-full bg-forest px-7 text-sm uppercase tracking-[0.12em] text-white font-sans"
        >
          Back to the farm store
        </Link>
      </Container>
    </main>
  );
}

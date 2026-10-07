import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { fieldCtaClass } from "@/components/ui/FieldGuide";
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
  title: "Unsubscribed",
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
    <div className="surface-paper bg-paper pt-[var(--header-h,104px)] font-sans text-ink">
      <section className="px-5 pb-16 pt-10 lg:px-16 lg:pt-20">
        <div className="mx-auto max-w-[560px]">
          {ok ? (
            <>
              <h1 className="field-heading m-0 font-display text-[32px] leading-[1.05] lg:text-[44px]">
                You&apos;re unsubscribed
              </h1>
              <p className="m-0 mt-3 text-[15px] leading-[1.6] text-ink-body">
                We won&apos;t send you any more cart reminders. Order confirmations still come through, since those
                are receipts for something you bought.
              </p>
            </>
          ) : (
            <>
              <h1 className="field-heading m-0 font-display text-[32px] leading-[1.05] lg:text-[44px]">
                We couldn&apos;t find that link
              </h1>
              <p className="m-0 mt-3 text-[15px] leading-[1.6] text-ink-body">
                It may have already been used. Call {CONTACT.phone} and we&apos;ll take care of it.
              </p>
            </>
          )}
          <Link href="/shop" className={`${fieldCtaClass} mt-7`}>
            Back to the farm shop
          </Link>
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { FieldArrow, Plate, fieldCtaClass, fieldEyebrowClass } from "@/components/ui/FieldGuide";
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
  // `.select("id")` returns the rows the update touched. A token that matches
  // nothing is not an error to Supabase, so zero rows must read as a failure.
  const { data, error } = await db
    .from("shop_abandoned_carts")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("recovery_token", token)
    .select("id");

  if (error) {
    console.error("[shop] unsubscribe failed:", error.message);
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}

const TEL = `tel:+1${CONTACT.phone.replace(/\D/g, "")}`;
const quietLinkClass =
  "text-ink-note underline decoration-leader decoration-1 underline-offset-4 transition-colors hover:text-ink-body";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const ok = token ? await unsubscribe(token) : false;

  return (
    <div className="surface-paper bg-paper pt-[var(--header-h,104px)] font-sans text-ink">
      <section className="px-5 pb-12 pt-4 lg:px-16 lg:pt-16">
        <div className="mx-auto max-w-[560px]">
          <Plate
            frameClassName="h-[118px] lg:h-[200px]"
            caption="The carved Highland cow and the Highland Farms sign."
          >
            <Image
              src="/images/farm/hero.jpg"
              alt="The carved Highland cow and the Highland Farms sign at the farm gate"
              fill
              sizes="(min-width: 640px) 540px, 100vw"
              className="object-cover"
              style={{ objectPosition: "35% 40%" }}
              priority
            />
          </Plate>
          {ok ? (
            <>
              <p className={`${fieldEyebrowClass} m-0 mt-3.5 text-[17px] leading-[1.2] lg:mt-5`}>
                Thanks for letting us know.
              </p>
              <h1 className="field-heading m-0 mt-1 font-display text-[30px] leading-[1.05] min-[360px]:text-[32px] lg:text-[44px]">
                You&apos;re unsubscribed.
              </h1>
              <p className="m-0 mt-2.5 text-[15px] leading-[1.6] text-ink-body">
                We won&apos;t send you any more cart reminders. Order confirmations still come through.
              </p>
              <Link href="/" className={`${fieldCtaClass} mt-4 w-full lg:mt-5`}>
                Back to Highland Farms
                <FieldArrow />
              </Link>
              <p className="m-0 mt-1 flex min-h-11 items-center font-sans text-[14px] leading-none">
                <Link href="/shop" className={quietLinkClass}>
                  Farm shop
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className={`${fieldEyebrowClass} m-0 mt-3.5 text-[17px] leading-[1.2] lg:mt-5`}>
                Sorry about this.
              </p>
              <h1 className="field-heading m-0 mt-1 font-display text-[30px] leading-[1.05] min-[360px]:text-[32px] lg:text-[44px]">
                That didn&apos;t go through.
              </h1>
              <p className="m-0 mt-2.5 text-[15px] leading-[1.6] text-ink-body">
                Nothing changed on our end, so a cart reminder may still arrive. Open the link in the email once
                more, or call and we&apos;ll take care of it.
              </p>
              <a href={TEL} className={`${fieldCtaClass} mt-4 w-full whitespace-nowrap lg:mt-5`}>
                Call {CONTACT.phone}
              </a>
              <p className="m-0 mt-1 flex min-h-11 items-center font-sans text-[14px] leading-none">
                <Link href="/" className={quietLinkClass}>
                  Back to Highland Farms
                </Link>
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

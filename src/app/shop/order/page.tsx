import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Mail, MapPin, ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CONTACT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Order From the Farm | Highland Farms",
  description:
    "Order Mangalitsa pork, Highland beef, farm eggs, and Highland Farms apparel direct from the farm in Brightwood, Oregon. Pick up on the farm.",
  robots: { index: false, follow: true },
};

const PHONE_HREF = `tel:${CONTACT.phone.replace(/[^\d]/g, "")}`;
const MAIL_HREF = `mailto:${CONTACT.emailAlt}?subject=${encodeURIComponent(
  "Farm store order",
)}`;

export default function ShopOrderPage() {
  return (
    <main className="bg-cream pt-32 pb-20 sm:pb-28">
      <Container className="max-w-3xl">
        <Link
          href="/shop"
          className="mb-10 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-forest font-sans"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to the farm store
        </Link>

        <SectionHeading
          align="left"
          eyebrow="From our pastures"
          title="Order direct from the farm"
          subtitle="Our online checkout is being rebuilt right now. Everything on the shelf is still available — call or email and we'll set your order aside for pickup at the farm."
          className="mb-10"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href={PHONE_HREF}
            className="flex flex-col gap-2 rounded-2xl bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-sage font-sans">
              <Phone className="h-4 w-4" />
              Call or text
            </span>
            <span className="text-2xl font-light text-forest">
              {CONTACT.phone}
            </span>
          </a>

          <a
            href={MAIL_HREF}
            className="flex flex-col gap-2 rounded-2xl bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-sage font-sans">
              <Mail className="h-4 w-4" />
              Email
            </span>
            <span className="break-all text-lg font-light text-forest">
              {CONTACT.emailAlt}
            </span>
          </a>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-white/60 p-6 text-sm leading-relaxed text-muted font-sans">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
          <p>
            Pickup is at the farm in Brightwood, about 50 minutes from Portland
            at the base of Mt. Hood. Tell us what you&apos;d like and when
            you&apos;re coming, and we&apos;ll have it packed and waiting.
          </p>
        </div>
      </Container>
    </main>
  );
}

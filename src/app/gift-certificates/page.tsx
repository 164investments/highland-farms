import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { nativeCalendarEnabled } from "@/lib/booking/flag";
import { Container } from "@/components/ui/Container";
import { GiftBody } from "./GiftBody";

export const metadata: Metadata = {
  title: "Gift Certificates | Highland Farms",
  description:
    "Give a Highland Farms private farm tour, Nordic Forest Spa session, or spa 3-visit pack. We email the code right away.",
};

export default function GiftCertificatesPage() {
  if (!nativeCalendarEnabled()) notFound();
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl">
        <p className="font-sans text-xs uppercase tracking-[0.28em] text-forest/70">Gift Certificates</p>
        <h1 className="mt-3 text-4xl text-forest">Give Highland Farms.</h1>
        <p className="mt-3 font-sans text-stone-600">
          A farm tour, a spa session, or a 3-visit spa pack. Pick one, and we&apos;ll
          email the code right away.
        </p>
        <div className="mt-8">
          <GiftBody />
        </div>
      </div>
    </Container>
  );
}

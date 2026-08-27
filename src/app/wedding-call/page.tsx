import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { nativeCalendarEnabled } from "@/lib/booking/flag";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Schedule a Wedding Call | Highland Farms",
  description:
    "Pick a time for a free 45-minute wedding call with our events team. Google Meet or in person at the farm in Brightwood, Oregon.",
};

export default function WeddingCallPage() {
  if (!nativeCalendarEnabled()) notFound();
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl">
        <p className="font-sans text-xs uppercase tracking-[0.28em] text-forest/70">Weddings at Highland Farms</p>
        <h1 className="mt-3 text-4xl text-forest">Let&apos;s talk about your wedding.</h1>
        <p className="mt-3 font-sans text-stone-600">
          A free 45-minute call with our events team: your date, your guest count,
          and whether William Wallace Lodge is the right fit. Video call on Google
          Meet, or come walk the property with us.
        </p>
        <div className="mt-8">
          <BookingFlow product="wedding-call" locationToggle />
        </div>
      </div>
    </Container>
  );
}

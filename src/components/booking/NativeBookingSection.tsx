import { nativeCalendarEnabled } from "@/lib/booking/flag";
import { BookingFlow } from "./BookingFlow";

export function NativeBookingSection({
  product,
}: {
  product: "farm-tour" | "nordic-spa";
}) {
  if (!nativeCalendarEnabled()) return null;
  return (
    <section id="book" className="mx-auto max-w-2xl px-4 py-12">
      <BookingFlow product={product} />
      <details className="mt-6 rounded-2xl border border-forest/15 p-5 sm:p-7 [&_summary::-webkit-details-marker]:hidden">
        <summary className="cursor-pointer list-none">
          <h3 className="text-2xl text-forest">Make it a Full Farm Day</h3>
          <p className="mt-1 font-sans text-sm text-stone-600">
            Private tour + spa session, $150 per person, one booking.
          </p>
        </summary>
        <div className="mt-5">
          <BookingFlow product="combo" />
        </div>
      </details>
    </section>
  );
}

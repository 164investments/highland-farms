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
    </section>
  );
}

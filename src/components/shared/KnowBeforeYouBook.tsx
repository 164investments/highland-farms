import { CONTACT } from "@/lib/constants";

type Product = "tour" | "spa";

const TOUR_ITEMS: string[] = [
  "Ages 5 and up are $75. Kids 4 and under come free and don't count toward your group.",
  `Online booking covers two or more paying guests. Coming as one adult with a little one? Call us at ${CONTACT.phoneAlt} and we'll set it up.`,
  "Wear closed-toe shoes you don't mind getting muddy. October to March, bring rain boots and a rain jacket. Tours run rain or shine.",
  "The farm paths aren't stroller or wheelchair friendly.",
  "Pull through the gate, park on the right in the gravel, and meet your guide at the Highland cow statue. If you're more than 10 minutes late, your tour may be shortened or cancelled at your expense.",
];

const SPA_ITEMS: string[] = [
  "Guests 16 and up.",
  "Bring a swimsuit. We provide robes and towels, and there are changing areas on site.",
  "Sessions are shared, up to 6 guests, and run a maximum of 90 minutes.",
  "Park on the right in the gravel after the gate. If you're more than 15 minutes late, your session may be shortened or cancelled at your expense.",
  "Rain or shine, your session runs. The spa isn't wheelchair, walker or stroller accessible.",
];

/**
 * "Know before you book": the answers that decide whether a visitor commits,
 * shown directly above the pricing-card booking button. Facts come from the
 * Hayden-confirmed ops sheet (agent-memory highland-farms support-chat-ops-facts
 * 2026-07-24). Keep them in sync with the FAQ entries in src/data/*.ts.
 */
export function KnowBeforeYouBook({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const items = product === "tour" ? TOUR_ITEMS : SPA_ITEMS;
  return (
    <div
      className={`rounded-lg border border-cream-dark/50 bg-cream/40 p-4 text-left sm:p-5 ${className}`}
    >
      <p className="mb-2 text-xs font-normal uppercase tracking-[0.18em] text-sage font-sans">
        Know before you book
      </p>
      <ul className="space-y-1.5 text-sm text-charcoal font-sans font-light leading-relaxed">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-forest" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Weather and finality framing shown under the booking button (no policy change). */
export function BookingPolicyNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-xs text-muted font-sans ${className}`}>
      Rain or shine, your visit runs. If we cancel for severe weather or for the
      safety of our animals or guests, we will refund or rebook you. All other
      bookings are final, so check your date and group size before you pay.
    </p>
  );
}

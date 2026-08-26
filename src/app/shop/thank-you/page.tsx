import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { CONTACT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Order confirmed | Highland Farms",
  robots: { index: false, follow: false },
};

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  // Display only — never treated as proof of an order.
  const orderNumber = (order ?? "").slice(0, 32);

  return (
    <main className="bg-cream pt-32 pb-20 sm:pb-28">
      <Container className="max-w-2xl text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest text-white">
          <Check className="h-6 w-6" />
        </span>

        <h1 className="mt-6 font-display text-3xl font-light tracking-tight text-charcoal sm:text-4xl">
          Thank you — your order is in
        </h1>

        {orderNumber && (
          <p className="mt-3 text-sm uppercase tracking-[0.12em] text-muted font-sans">
            Order {orderNumber}
          </p>
        )}

        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted font-sans">
          A receipt is on its way to your inbox. We&apos;ll call you when your
          order is packed and ready — usually the same day.
        </p>

        <p className="mt-4 text-sm text-muted font-sans">
          Questions? Call or text {CONTACT.phone}.
        </p>

        <Link
          href="/shop"
          className="mt-8 inline-flex min-h-[52px] items-center rounded-full bg-forest px-8 text-sm uppercase tracking-[0.12em] text-white shadow-sm transition-shadow hover:shadow-md font-sans"
        >
          Keep shopping
        </Link>
      </Container>
    </main>
  );
}

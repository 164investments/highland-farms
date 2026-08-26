"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Lock, MapPin, Minus, Plus, Plus as PlusIcon, Star, X } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { useCart } from "@/lib/shop/cart";
import { formatCents } from "@/lib/shop/money";
import { DELIVERY_MINIMUM_CENTS } from "@/lib/shop/fulfillment";
import { REVIEW_COUNT } from "@/components/shared/GoogleReviewsSection";
import { formatCentsShort } from "@/lib/shop/money";

export interface AddOn {
  variantId: string;
  slug: string;
  name: string;
  image: string;
  priceCents: number;
}

export function CartBody({ addOns }: { addOns: AddOn[] }) {
  const { detailed, subtotalCents, setQuantity, remove, add, ready } = useCart();
  const [restored, setRestored] = useState(false);

  // ?recover=<token> from a cart reminder. Rebuilds the cart from variant ids,
  // never from anything the email carried, so prices are always today's.
  const recoveryDone = useRef(false);
  useEffect(() => {
    if (!ready || recoveryDone.current) return;
    const token = new URLSearchParams(window.location.search).get("recover");
    if (!token) return;
    recoveryDone.current = true;

    void (async () => {
      try {
        const res = await fetch(`/api/shop/cart/recover?token=${encodeURIComponent(token)}`);
        const body = (await res.json()) as { items?: { variantId: string; quantity: number }[] };
        let added = 0;
        for (const item of body.items ?? []) {
          add(item.variantId, item.quantity);
          added += 1;
        }
        if (added > 0) setRestored(true);
      } catch {
        // The cart page still works; they just have to re-add.
      } finally {
        window.history.replaceState({}, "", "/shop/cart");
      }
    })();
  }, [ready, add]);
  const inCart = new Set(detailed.map((l) => l.variantId));
  const offers = addOns.filter((a) => !inCart.has(a.variantId)).slice(0, 3);

  return (
    <main className="bg-cream pt-32 pb-20 sm:pb-28">
      <Container className="max-w-3xl">
        <Link
          href="/shop"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-forest font-sans"
        >
          <ArrowLeft className="h-4 w-4" />
          Keep shopping
        </Link>

        <h1 className="font-display text-3xl font-light tracking-tight text-charcoal sm:text-4xl">
          Your cart
        </h1>

        {restored && (
          <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-charcoal shadow-sm font-sans">
            Picked up where you left off. Prices are today&apos;s.
          </p>
        )}

        {/* Until localStorage is read, render nothing rather than a wrong empty state. */}
        {!ready ? (
          <div className="mt-10 h-24" aria-hidden />
        ) : detailed.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-muted font-sans">Your cart is empty.</p>
            <Link
              href="/shop"
              className="mt-5 inline-flex min-h-[52px] items-center rounded-full bg-forest px-8 text-sm uppercase tracking-[0.12em] text-white shadow-sm transition-shadow hover:shadow-md font-sans"
            >
              Browse the farm store
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-8 space-y-3">
              {detailed.map((line) => (
                <li
                  key={line.variantId}
                  className="flex gap-4 rounded-2xl bg-white p-3.5 shadow-sm sm:p-4"
                >
                  <Link
                    href={`/shop/${line.slug}`}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-cream sm:h-24 sm:w-24"
                  >
                    <Image
                      src={line.image}
                      alt={line.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/shop/${line.slug}`}
                          className="block truncate text-[0.9375rem] text-charcoal hover:text-forest font-sans"
                        >
                          {line.name}
                        </Link>
                        {line.label && (
                          <p className="mt-0.5 text-xs uppercase tracking-[0.1em] text-muted font-sans">
                            {line.label}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(line.variantId)}
                        aria-label={`Remove ${line.name}`}
                        className="shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-cream hover:text-charcoal"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="flex items-center gap-1 rounded-full border border-cream-dark bg-white">
                        <button
                          type="button"
                          onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                          aria-label={`Decrease quantity of ${line.name}`}
                          className="rounded-full p-2 text-charcoal transition-colors hover:bg-cream"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[2ch] text-center text-sm text-charcoal font-sans">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                          aria-label={`Increase quantity of ${line.name}`}
                          className="rounded-full p-2 text-charcoal transition-colors hover:bg-cream"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <p className="text-[0.9375rem] font-medium text-forest font-sans">
                        {formatCents(line.lineTotalCents)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <span className="text-charcoal font-sans">Subtotal</span>
                <span className="text-lg font-medium text-forest font-sans">
                  {formatCents(subtotalCents)}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted font-sans">
                Free pickup at the farm in Brightwood, or $15 delivery around Mt.
                Hood and east Portland. We don&apos;t ship.
              </p>
              {/* Goal-gradient: name the actual gap instead of a static rule the
                  shopper has to do arithmetic on. Only shown when it's reachable
                  and true — pickup stays free either way. */}
              {subtotalCents < DELIVERY_MINIMUM_CENTS && (
                <p className="mt-2 text-xs font-medium text-forest font-sans">
                  You&apos;re {formatCents(DELIVERY_MINIMUM_CENTS - subtotalCents)}{" "}
                  from qualifying for local delivery — pickup is always free.
                </p>
              )}
              <Link
                href="/shop/checkout"
                className="mt-5 flex min-h-[54px] w-full items-center justify-center rounded-full bg-forest text-sm uppercase tracking-[0.12em] text-white shadow-sm transition-shadow hover:shadow-md font-sans"
              >
                Checkout
              </Link>

              {/* Reassurance at the point of commitment, not stranded in the
                  footer six screens down. */}
              <ul className="mt-4 space-y-1.5 text-xs text-muted font-sans">
                <li className="flex items-center gap-2">
                  <Star className="h-3 w-3 shrink-0 fill-forest text-forest" aria-hidden />
                  Loved by {REVIEW_COUNT}+ guests on Google
                </li>
                <li className="flex items-center gap-2">
                  <Lock className="h-3 w-3 shrink-0 text-sage" aria-hidden />
                  Card details go straight to Square. We never see them.
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 shrink-0 text-sage" aria-hidden />
                  We&apos;ll call you when it&apos;s packed and ready.
                </li>
              </ul>
            </div>

            {/* AOV, sequenced AFTER the primary CTA so it never competes with
                it. Also the one-tap way to clear the delivery minimum. */}
            {offers.length > 0 && (
              <div className="mt-5">
                <h2 className="mb-3 text-xs uppercase tracking-[0.12em] text-muted font-sans">
                  Add to your order
                </h2>
                <ul className="grid grid-cols-3 gap-3">
                  {offers.map((a) => (
                    <li key={a.variantId} className="rounded-2xl bg-white p-2.5 shadow-sm">
                      <Link href={`/shop/${a.slug}`} className="block">
                        <span className="relative block aspect-square overflow-hidden rounded-xl bg-cream">
                          <Image
                            src={a.image}
                            alt={a.name}
                            fill
                            sizes="33vw"
                            className="object-cover"
                          />
                        </span>
                        <span className="mt-2 block truncate text-xs text-charcoal font-sans">
                          {a.name}
                        </span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => add(a.variantId, 1)}
                        className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-full border border-cream-dark py-1.5 text-xs text-forest transition-colors hover:border-forest/50 font-sans"
                      >
                        <PlusIcon className="h-3 w-3" />
                        {formatCentsShort(a.priceCents)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </Container>
    </main>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Minus, Plus, X } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { useCart } from "@/lib/shop/cart";
import { formatCents } from "@/lib/shop/money";

export function CartBody() {
  const { detailed, subtotalCents, setQuantity, remove, ready } = useCart();

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
                Pickup or delivery is chosen at checkout.
              </p>
              <Link
                href="/shop/checkout"
                className="mt-5 flex min-h-[54px] w-full items-center justify-center rounded-full bg-forest text-sm uppercase tracking-[0.12em] text-white shadow-sm transition-shadow hover:shadow-md font-sans"
              >
                Checkout
              </Link>
            </div>
          </>
        )}
      </Container>
    </main>
  );
}

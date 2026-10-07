"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FieldStickyBar } from "@/components/field/StickyBar";
import {
  FieldArrow,
  FieldDrawing,
  FieldLeader,
  FieldQuoteView,
  FieldReviewLine,
  fieldCtaClass,
  type ResolvedFieldQuote,
} from "@/components/ui/FieldGuide";
import { BackArrowIcon, LockIcon } from "@/components/shop/icons";
import { QtyStepper } from "@/components/shop/QtyStepper";
import { DeliveryGoal } from "@/components/shop/DeliveryGoal";
import { FarmFavorites } from "@/components/shop/Favorites";
import { pushEvent, type StockRecord } from "@/components/shop/track";
import { useCart } from "@/lib/shop/cart";
import { formatCents, formatCentsShort } from "@/lib/shop/money";
import { DELIVERY_MINIMUM_CENTS } from "@/lib/shop/fulfillment";
import { getProduct, type Product } from "../data";

export interface AddOn {
  variantId: string;
  slug: string;
  title: string;
  image: string;
  priceCents: number;
  madeToOrder: boolean;
}

const keepShopping =
  "min-h-11 items-center gap-2 text-[14px] text-ink-note hover:text-pine";

export function CartBody({
  addOns,
  quote,
  reviewCount,
  favorites,
  stock,
}: {
  addOns: AddOn[];
  quote: ResolvedFieldQuote | null;
  reviewCount: number;
  /** Farm favorites in stock, for the empty cart. */
  favorites: Product[];
  stock: StockRecord;
}) {
  const { detailed, subtotalCents, count, setQuantity, remove, add, ready } = useCart();
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

  // Add to reach $50: in-stock items closest to the gap first, then the rest
  // from the other side; hidden once the cart qualifies.
  const inCart = new Set(detailed.map((l) => l.variantId));
  const gap = Math.max(0, DELIVERY_MINIMUM_CENTS - subtotalCents);
  const free = addOns.filter((a) => !inCart.has(a.variantId));
  const offers =
    gap === 0
      ? []
      : [
          ...free.filter((a) => a.priceCents >= gap).sort((a, b) => a.priceCents - b.priceCents),
          ...free.filter((a) => a.priceCents < gap).sort((a, b) => b.priceCents - a.priceCents),
        ].slice(0, 3);

  const addOffer = (a: AddOn) => {
    add(a.variantId, 1);
    const p = getProduct(a.slug);
    pushEvent("add_to_cart", {
      ecommerce: {
        currency: "USD",
        value: a.priceCents / 100,
        items: [
          {
            item_id: a.slug,
            item_name: p?.name ?? a.title,
            item_category: p?.category,
            price: a.priceCents / 100,
            quantity: 1,
          },
        ],
      },
    });
  };

  const note = (a: AddOn) =>
    [
      a.madeToOrder ? "Made to order" : null,
      subtotalCents + a.priceCents >= DELIVERY_MINIMUM_CENTS
        ? `Gets you to ${formatCentsShort(subtotalCents + a.priceCents)}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

  const goalBlock = <DeliveryGoal subtotalCents={subtotalCents} />;
  const offerList = (layout: "grid" | "list") =>
    offers.length === 0 ? null : layout === "grid" ? (
      <ul className="m-0 mt-4 grid list-none grid-cols-3 gap-6 p-0">
        {offers.map((a) => (
          <li key={a.variantId}>
            <Link href={`/shop/${a.slug}`} className="block">
              <div className="border border-frame bg-paper-light p-2">
                <div className="relative aspect-square overflow-hidden">
                  <Image src={a.image} alt="" fill sizes="240px" className="object-cover" />
                </div>
              </div>
              <p className="m-0 mt-2 font-display text-[19px] font-medium leading-tight">{a.title}</p>
            </Link>
            {note(a) && <p className="m-0 text-[12px] text-ink-note">{note(a)}</p>}
            <button
              type="button"
              onClick={() => addOffer(a)}
              aria-label={`Add to cart: ${a.title}, ${formatCentsShort(a.priceCents)}`}
              className="mt-1.5 flex h-11 items-center gap-1.5 border border-pine px-4 text-[13px] font-semibold text-pine hover:bg-paper-shade"
            >
              + {formatCentsShort(a.priceCents)}
            </button>
          </li>
        ))}
      </ul>
    ) : (
      <ul className="m-0 list-none p-0">
        {offers.map((a) => (
          <li key={a.variantId} className="flex items-center gap-3 border-b border-rule py-2">
            <Link href={`/shop/${a.slug}`} className="h-14 w-14 shrink-0 border border-frame bg-paper-light p-[3px]">
              <span className="relative block h-full w-full overflow-hidden">
                <Image src={a.image} alt="" fill sizes="56px" className="object-cover" />
              </span>
            </Link>
            <span className="min-w-0 flex-1">
              <Link href={`/shop/${a.slug}`} className="block font-display text-[18px] font-medium leading-tight">
                {a.title}
              </Link>
              {note(a) && <span className="text-[12px] text-ink-note">{note(a)}</span>}
            </span>
            <button
              type="button"
              onClick={() => addOffer(a)}
              aria-label={`Add to cart: ${a.title}, ${formatCentsShort(a.priceCents)}`}
              className="flex h-11 shrink-0 items-center border border-pine px-3 text-[13px] font-semibold text-pine hover:bg-paper-shade"
            >
              + {formatCentsShort(a.priceCents)}
            </button>
          </li>
        ))}
      </ul>
    );

  return (
    <div className="surface-paper bg-paper pt-[var(--header-h,104px)] font-sans text-ink">
      <section className="px-5 pb-12 pt-2 lg:px-16 lg:pb-24 lg:pt-8">
        <div className="mx-auto max-w-[1312px]">
          {/* The empty cart's one action is its own button; this link is for a filled cart. */}
          {ready && detailed.length > 0 && (
            <Link href="/shop" className={`hidden lg:inline-flex ${keepShopping}`}>
              <BackArrowIcon />
              Keep shopping
            </Link>
          )}

          {restored && (
            <p className="m-0 mt-3 border-y border-rule py-2.5 text-[14px] text-ink-body">
              Picked up where you left off. Prices are today&apos;s.
            </p>
          )}

          {/* Until localStorage is read, render nothing rather than a wrong empty state. */}
          {!ready ? (
            <div className="mt-3 h-40" aria-hidden />
          ) : detailed.length === 0 ? (
            <div className="mt-8 lg:mt-12">
              <div className="flex flex-col items-start gap-4">
                <FieldDrawing name="highland-calf" className="w-[140px] lg:w-[200px]" sizes="200px" />
                <h1 className="field-heading m-0 font-display text-[32px] leading-none lg:text-[52px]">
                  Nothing in your cart yet.
                </h1>
                <Link href="/shop" className={fieldCtaClass}>
                  Browse the farm shop
                  <FieldArrow />
                </Link>
              </div>
              {/* Someone who opens the cart first can still start an order in one tap. */}
              <FarmFavorites products={favorites} stock={stock} className="mt-12 lg:mt-20" />
            </div>
          ) : (
            <div className="mt-3 lg:mt-4 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-16">
              {/* 1. The order, as ledger lines */}
              <div>
                <div className="flex items-end justify-between gap-4 border-b border-ink pb-2">
                  <h1 className="field-heading m-0 font-display text-[32px] leading-none lg:text-[52px]">Your order</h1>
                  <p className="m-0 text-[13px] text-ink-meta">
                    {count} {count === 1 ? "item" : "items"}
                  </p>
                </div>
                <ul className="m-0 list-none p-0">
                  {detailed.map((line) => {
                    const product = getProduct(line.slug);
                    const title = product?.title ?? line.name;
                    const unit = formatCentsShort(line.unitPriceCents);
                    const sub = [line.label ?? product?.detail, `${unit} each`].filter(Boolean).join(" · ");
                    return (
                      <li key={line.variantId} className="flex gap-3 border-b border-rule py-2.5 lg:gap-5 lg:py-4">
                        <Link
                          href={`/shop/${line.slug}`}
                          className="h-[72px] w-[72px] shrink-0 border border-frame bg-paper-light p-[3px] lg:h-24 lg:w-24"
                        >
                          <span className="relative block h-full w-full overflow-hidden">
                            <Image src={line.image} alt="" fill sizes="96px" className="object-cover" />
                          </span>
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/shop/${line.slug}`}
                              className="font-display text-[20px] font-medium leading-[1.12] lg:text-[23px]"
                            >
                              {title}
                            </Link>
                            <span className="pt-0.5 text-[15px] font-semibold">{formatCents(line.lineTotalCents)}</span>
                          </div>
                          <p className="m-0 text-[12px] text-ink-note lg:text-[13px]">{sub}</p>
                          <div className="mt-1.5 flex items-center justify-between">
                            <QtyStepper
                              value={line.quantity}
                              size="cart"
                              label={title.toLowerCase()}
                              onChange={(n) => setQuantity(line.variantId, n)}
                            />
                            <button
                              type="button"
                              onClick={() => remove(line.variantId)}
                              aria-label={`Remove ${title}`}
                              className="flex min-h-11 min-w-11 items-center justify-end text-[13px] text-ink-note"
                            >
                              <span className="border-b border-rule">Remove</span>
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Desktop: add to reach $50, under the lines */}
                <div className="mt-8 hidden lg:block">
                  {goalBlock}
                  {offerList("grid")}
                </div>
              </div>

              {/* 2. The summary at the commitment point */}
              <aside className="mt-4 border border-frame bg-paper-light p-5 lg:sticky lg:top-[120px] lg:mt-0 lg:p-8">
                <dl className="m-0 text-[15px]">
                  <div className="flex items-baseline gap-2">
                    <dt className="text-ink-body">Subtotal</dt>
                    <FieldLeader />
                    <dd className="m-0 font-semibold">{formatCents(subtotalCents)}</dd>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <dt className="text-ink-body">Farm pickup</dt>
                    <FieldLeader />
                    <dd className="m-0 font-semibold text-fern">Free</dd>
                  </div>
                </dl>
                <Link
                  id="checkout-btn"
                  href="/shop/checkout"
                  className={`${fieldCtaClass} mt-4 w-full`}
                >
                  Check out · {formatCents(subtotalCents)}
                  <FieldArrow />
                </Link>

                <ul className="m-0 mt-3.5 list-none space-y-2 p-0 text-[13px] leading-[1.45] text-ink-body">
                  <li>
                    <FieldReviewLine tier="nearCta" count={reviewCount} starSize={12} className="text-[13px] text-ink-body lg:text-[13px]" />
                  </li>
                  <li className="flex items-start gap-2.5">
                    <LockIcon size={14} className="mt-0.5 shrink-0 text-fern" />
                    Card details go straight to Square. We never see them.
                  </li>
                </ul>
                {quote && <FieldQuoteView {...quote} rule size="sm" className="mt-5" />}
              </aside>

              <Link href="/shop" className={`mt-4 inline-flex lg:hidden ${keepShopping}`}>
                <BackArrowIcon />
                Keep shopping
              </Link>

              {/* Phone: add-ons after the summary, so they never compete with Check out */}
              <div className="mt-9 lg:hidden">
                {goalBlock}
                {offerList("list")}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* The bar's observer looks up #checkout-btn once, at mount. That button
          renders only after the stored cart is read (and, from a recovery
          email, after the async restore), so remount the bar when it appears;
          otherwise a fresh load leaves the bar on top of the real Check out. */}
      <FieldStickyBar
        key={ready && detailed.length > 0 ? "cart" : "empty"}
        enabled={ready && detailed.length > 0}
        hideWhenVisible="#checkout-btn"
        primary={{ label: `Check out · ${formatCents(subtotalCents)}`, href: "/shop/checkout" }}
      />
    </div>
  );
}

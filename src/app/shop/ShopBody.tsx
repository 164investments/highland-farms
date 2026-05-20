"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MapPin, Check } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BOOKING_LINKS } from "@/lib/constants";
import { CATEGORIES, PRODUCTS, type CategoryKey, type Product } from "./data";
import { GoogleReviewsSection } from "@/components/shared/GoogleReviewsSection";
import { ReviewBadge } from "@/components/shared/ReviewBadge";

type NavKey = "featured" | CategoryKey;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

function pushEvent(event: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...payload });
}

function toGA4Item(p: Product, index: number) {
  return {
    item_id: p.url.split("/").pop(),
    item_name: p.name,
    item_category: p.category,
    price: p.price ?? 0,
    index,
  };
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        pushEvent("select_item", {
          ecommerce: { items: [toGA4Item(product, index)] },
        })
      }
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-cream">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
            product.soldOut ? "opacity-60" : ""
          }`}
        />
        {product.badges && product.badges.length > 0 && !product.soldOut && (
          <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
            {product.badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-white/95 px-2.5 py-0.5 text-[0.625rem] font-normal uppercase tracking-[0.12em] text-forest shadow-sm font-sans"
              >
                {badge}
              </span>
            ))}
          </div>
        )}
        {product.soldOut && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-charcoal/90 px-4 py-1.5 text-xs font-normal uppercase tracking-[0.15em] text-white font-sans">
              Sold Out
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <h3 className="text-[0.9375rem] font-normal leading-tight text-charcoal font-sans">
          {product.name}
        </h3>
        <div className="mt-auto pt-2.5">
          {product.price !== null ? (
            <p className="text-[1.0625rem] font-medium text-forest font-sans">
              ${product.price.toFixed(2)}
              {product.priceNote && (
                <span className="ml-1.5 text-[0.6875rem] font-normal uppercase tracking-wider text-muted">
                  {product.priceNote}
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted font-sans">Inquire</p>
          )}
        </div>
      </div>
    </a>
  );
}

interface PillSpec {
  key: NavKey;
  label: string;
  count: number;
}

function CategoryNav({
  pills,
  active,
  onJump,
}: {
  pills: PillSpec[];
  active: NavKey | null;
  onJump: (key: NavKey) => void;
}) {
  return (
    <div className="sticky top-[var(--header-h,80px)] z-30 border-y border-cream-dark/40 bg-background/95 backdrop-blur-md">
      <Container>
        <div className="flex gap-2 overflow-x-auto py-3 sm:justify-center [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {pills.map((p) => {
            const isActive = active === p.key;
            return (
              <button
                key={p.key}
                onClick={() => onJump(p.key)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-[0.7rem] font-normal uppercase tracking-[0.12em] transition-all duration-200 font-sans ${
                  isActive
                    ? "border-forest bg-forest text-white shadow-sm"
                    : "border-cream-dark bg-white text-charcoal hover:border-forest/40 hover:text-forest"
                }`}
              >
                {p.label}
                <span
                  className={`ml-1.5 text-[0.625rem] ${
                    isActive ? "text-white/70" : "text-muted"
                  }`}
                >
                  {p.count}
                </span>
              </button>
            );
          })}
        </div>
      </Container>
    </div>
  );
}

export function ShopBody() {
  const [active, setActive] = useState<NavKey | null>("featured");
  const sectionRefs = useRef<Record<NavKey, HTMLElement | null>>({
    featured: null,
    plush: null,
    apparel: null,
    mangalitsa: null,
    beef: null,
    pantry: null,
  });
  const viewLogged = useRef(false);

  const featured = PRODUCTS.filter((p) => p.featured && !p.soldOut);
  const totalCount = PRODUCTS.length;

  const pills: PillSpec[] = [
    { key: "featured", label: "Favorites", count: featured.length },
    ...CATEGORIES.map((c) => ({
      key: c.key as NavKey,
      label: c.shortLabel,
      count: PRODUCTS.filter((p) => p.category === c.key).length,
    })),
  ];

  useEffect(() => {
    if (viewLogged.current) return;
    viewLogged.current = true;
    pushEvent("view_item_list", {
      ecommerce: {
        item_list_name: "Farm Store",
        items: PRODUCTS.map((p, i) => toGA4Item(p, i)),
      },
    });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const key = visible.target.getAttribute("data-cat") as NavKey | null;
          if (key) setActive(key);
        }
      },
      {
        rootMargin: "-25% 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      }
    );

    (Object.keys(sectionRefs.current) as NavKey[]).forEach((k) => {
      const el = sectionRefs.current[k];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const jumpTo = (key: NavKey) => {
    const el = sectionRefs.current[key];
    if (!el) return;
    pushEvent("select_promotion", {
      promotion_id: `shop_category_${key}`,
      promotion_name:
        key === "featured"
          ? "Favorites"
          : CATEGORIES.find((c) => c.key === key)?.label,
      creative_slot: "sticky_pill_nav",
    });
    const headerOffset = 140;
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <>
      {/* Trust strip now lives in the hero (page.tsx) */}

      {/* Sticky category nav — above everything */}
      <CategoryNav pills={pills} active={active} onJump={jumpTo} />

      {/* Featured Row */}
      <section
        ref={(el) => {
          sectionRefs.current.featured = el;
        }}
        data-cat="featured"
        id="cat-featured"
        className="scroll-mt-32 bg-background py-10 lg:py-14"
      >
        <Container>
          <div className="mb-6 flex items-baseline justify-between gap-4 sm:mb-8">
            <div>
              <p className="text-xs font-normal uppercase tracking-[0.18em] text-sage sm:text-[0.8125rem]">
                Bestsellers
              </p>
              <h2 className="mt-1 text-[1.75rem] font-light leading-tight tracking-tight sm:text-[2rem]">
                Farm Favorites
              </h2>
            </div>
            <p className="shrink-0 text-xs text-muted font-sans sm:text-sm">
              {totalCount} products in store
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {featured.map((p, i) => (
              <ProductCard key={p.name} product={p} index={i} />
            ))}
          </div>
        </Container>
      </section>

      {/* Categorized sections */}
      <div className="bg-background">
        {CATEGORIES.map((cat, catIdx) => {
          const inCategory = PRODUCTS.filter((p) => p.category === cat.key);
          if (inCategory.length === 0) return null;
          return (
            <section
              key={cat.key}
              ref={(el) => {
                sectionRefs.current[cat.key] = el;
              }}
              data-cat={cat.key}
              id={`cat-${cat.key}`}
              className={`scroll-mt-32 py-10 lg:py-14 ${
                catIdx % 2 === 0 ? "bg-cream/30" : ""
              }`}
            >
              <Container>
                <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
                  <div className="max-w-2xl">
                    <h2 className="text-[1.75rem] font-light leading-tight tracking-tight sm:text-[2rem]">
                      {cat.label}
                    </h2>
                    <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted font-sans">
                      {cat.story}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-muted font-sans sm:text-sm">
                    {inCategory.length} {inCategory.length === 1 ? "item" : "items"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
                  {inCategory.map((p, i) => (
                    <ProductCard key={p.name} product={p} index={i} />
                  ))}
                </div>
              </Container>
            </section>
          );
        })}
      </div>

      {/* Google Reviews — social proof */}
      <GoogleReviewsSection topic="all" max={6} />


      {/* Gift Certificates - photo cards, per-card CTA, trust strip, social proof */}
      <section className="bg-forest py-14 lg:py-20 text-white">
        <Container>
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-normal uppercase tracking-[0.18em] text-sage-light sm:text-[0.8125rem]">
              Gift the farm · Birthdays, anniversaries & holidays
            </p>
            <h2 className="text-[1.75rem] font-light leading-tight tracking-tight sm:text-[2rem]">
              Gift Certificates
            </h2>
            <p className="mx-auto mt-2.5 max-w-xl text-[0.9375rem] leading-relaxed text-white/80 font-sans">
              Give a tour, a sauna ritual, or a night under the cedars.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
            {[
              {
                image: "/images/farm/cows.jpg",
                title: "Farm Tour",
                desc: "Private 60-min Highland Cow encounter for up to six.",
                price: "From $150",
                utm: "farm-tour",
              },
              {
                image: "/images/spa/spa-1.jpg",
                title: "Nordic Spa",
                desc: "90-min wood-burning sauna + cold plunge ritual.",
                price: "$75 / person",
                utm: "nordic-spa",
              },
              {
                image: "/images/farm/lodge-bridge.jpg",
                title: "Farm Stay",
                desc: "A night at the Lodge, Cottage, or Airstream Camp.",
                price: "Choose any amount",
                utm: "farm-stay",
              },
            ].map((card) => (
              <a
                key={card.title}
                href={`${BOOKING_LINKS.giftCertificates}?utm_source=hf_site&utm_medium=shop&utm_content=gift-${card.utm}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  pushEvent("select_promotion", {
                    promotion_id: `gift-${card.utm}`,
                    promotion_name: `Gift Certificate - ${card.title}`,
                    creative_slot: "shop_gift_section",
                  })
                }
                className="group overflow-hidden rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-sm transition hover:border-white/30 hover:bg-white/[0.07]"
              >
                <div className="relative aspect-[5/3] w-full overflow-hidden">
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-forest/40 to-transparent" />
                </div>
                <div className="p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-normal text-white font-sans">
                      {card.title}
                    </h3>
                    <span className="text-sm text-sage-light font-sans">
                      {card.price}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/75 font-sans">
                    {card.desc}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-white font-sans">
                    Gift this
                    <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </span>
                </div>
              </a>
            ))}
          </div>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/80 font-sans">
            <li className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-sage-light" aria-hidden />
              Delivered instantly by email
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-sage-light" aria-hidden />
              Never expires
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-sage-light" aria-hidden />
              Email or print to give
            </li>
          </ul>
          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <Button
              href={BOOKING_LINKS.giftCertificates}
              size="lg"
              external
              className="bg-white text-charcoal hover:bg-cream"
            >
              Purchase Gift Certificates
            </Button>
            <ReviewBadge variant="pill" />
          </div>
        </Container>
      </section>

      {/* Cross-sell to experiences */}
      <section className="bg-background py-14 lg:py-20">
        <Container>
          <SectionHeading
            eyebrow="Visit the farm"
            title="More than a store"
            subtitle="Most of our shop customers first met us in person. Come meet the cows, sit in the sauna, or stay the night."
            className="!mb-10"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
            {[
              {
                href: "/farm-tours",
                image: "/images/farm/cows.jpg",
                title: "Highland Cow Tours",
                desc: "Private 60-min farm tours. From $150 for two.",
              },
              {
                href: "/nordic-spa",
                image: "/images/spa/spa-1.jpg",
                title: "Nordic Forest Spa",
                desc: "Wood-burning sauna + cold plunge. 90 min, $75.",
              },
              {
                href: "/stay",
                image: "/images/farm/lodge-bridge.jpg",
                title: "Stay the Night",
                desc: "Lodge, Cottage, or Airstream Camp.",
              },
            ].map((card) => (
              <a
                key={card.title}
                href={card.href}
                className="group relative block aspect-[4/3] overflow-hidden rounded-2xl"
              >
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <h3 className="text-xl font-normal font-sans">{card.title}</h3>
                  <p className="mt-1 text-sm text-white/80 font-sans">
                    {card.desc}
                  </p>
                </div>
              </a>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 text-center text-xs text-muted font-sans sm:flex-row sm:gap-6 sm:text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-forest" />
              <span>21261 East Little River Road, Brightwood, OR</span>
            </div>
            <span className="hidden sm:inline">·</span>
            <span>50 minutes from Portland</span>
          </div>
        </Container>
      </section>
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Star, Leaf, Home, Truck, Gift, MapPin } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FadeIn } from "@/components/ui/FadeIn";
import { BOOKING_LINKS } from "@/lib/constants";
import { CATEGORIES, PRODUCTS, type CategoryKey, type Product } from "./data";

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
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-500 hover:-translate-y-0.5 hover:shadow-md"
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
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {product.badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-white/95 px-2.5 py-1 text-[0.625rem] font-normal uppercase tracking-[0.12em] text-forest shadow-sm font-sans"
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
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-normal leading-snug text-charcoal font-sans">
          {product.name}
        </h3>
        <div className="mt-auto pt-3">
          {product.price !== null ? (
            <p className="text-base font-normal text-forest font-sans">
              ${product.price.toFixed(2)}
              {product.priceNote && (
                <span className="ml-1.5 text-xs text-muted font-sans">
                  / {product.priceNote}
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

function CategoryNav({
  active,
  onJump,
}: {
  active: CategoryKey | null;
  onJump: (key: CategoryKey) => void;
}) {
  return (
    <div className="sticky top-[var(--header-h,80px)] z-30 -mx-4 mt-0 border-y border-cream-dark/40 bg-background/95 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <Container className="!px-0">
        <div className="flex gap-2 overflow-x-auto py-3 sm:justify-center [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((cat) => {
            const isActive = active === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => onJump(cat.key)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-[0.7rem] font-normal uppercase tracking-[0.12em] transition-all duration-300 font-sans ${
                  isActive
                    ? "border-forest bg-forest text-white shadow-sm"
                    : "border-cream-dark bg-white text-charcoal hover:border-forest/40 hover:text-forest"
                }`}
              >
                {cat.shortLabel}
              </button>
            );
          })}
        </div>
      </Container>
    </div>
  );
}

export function ShopBody() {
  const [active, setActive] = useState<CategoryKey | null>(null);
  const sectionRefs = useRef<Record<CategoryKey, HTMLElement | null>>({
    plush: null,
    apparel: null,
    mangalitsa: null,
    beef: null,
    pantry: null,
  });
  const viewLogged = useRef(false);

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
          const key = visible.target.getAttribute("data-cat") as CategoryKey | null;
          if (key) setActive(key);
        }
      },
      {
        rootMargin: "-30% 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      }
    );

    CATEGORIES.forEach((c) => {
      const el = sectionRefs.current[c.key];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const jumpTo = (key: CategoryKey) => {
    const el = sectionRefs.current[key];
    if (!el) return;
    pushEvent("select_promotion", {
      promotion_id: `shop_category_${key}`,
      promotion_name: CATEGORIES.find((c) => c.key === key)?.label,
      creative_slot: "sticky_pill_nav",
    });
    const headerOffset = 140;
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const featured = PRODUCTS.filter((p) => p.featured && !p.soldOut);

  return (
    <>
      {/* Trust Strip */}
      <section className="border-b border-cream-dark/40 bg-cream py-5">
        <Container>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-center text-xs text-charcoal font-sans sm:flex sm:flex-wrap sm:justify-center sm:gap-8 sm:text-sm">
            <div className="flex items-center justify-center gap-2">
              <Star className="h-4 w-4 fill-forest text-forest" />
              <span>
                <span className="font-medium">4.9</span> from 146 reviews
              </span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Leaf className="h-4 w-4 text-forest" />
              <span>Pasture-raised at Mt. Hood</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Home className="h-4 w-4 text-forest" />
              <span>Family-run farm</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Truck className="h-4 w-4 text-forest" />
              <span>On-farm pickup or ship</span>
            </div>
          </div>
        </Container>
      </section>

      {/* Featured Row */}
      {featured.length > 0 && (
        <section className="bg-background py-14 lg:py-20">
          <Container>
            <FadeIn>
              <div className="mb-10 text-center">
                <p className="mb-2 text-lg font-normal text-sage font-script">
                  Most-loved
                </p>
                <h2 className="text-2xl font-light tracking-tight sm:text-3xl">
                  Farm Favorites
                </h2>
              </div>
            </FadeIn>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {featured.map((p, i) => (
                <FadeIn key={p.name} delay={i * 0.05}>
                  <ProductCard product={p} index={i} />
                </FadeIn>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Sticky category nav */}
      <CategoryNav active={active} onJump={jumpTo} />

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
              className={`scroll-mt-32 py-14 lg:py-20 ${
                catIdx % 2 === 1 ? "bg-cream/30" : ""
              }`}
            >
              <Container>
                <FadeIn>
                  <div className="mx-auto mb-10 max-w-2xl text-center">
                    <h2 className="text-2xl font-light tracking-tight sm:text-3xl lg:text-[2rem]">
                      {cat.label}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-muted font-sans sm:text-base">
                      {cat.story}
                    </p>
                  </div>
                </FadeIn>
                <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
                  {inCategory.map((p, i) => (
                    <FadeIn key={p.name} delay={Math.min(i * 0.04, 0.2)}>
                      <ProductCard product={p} index={i} />
                    </FadeIn>
                  ))}
                </div>
              </Container>
            </section>
          );
        })}
      </div>

      {/* Gift Certificates - 3 card layout */}
      <section className="bg-forest py-16 lg:py-24 text-white">
        <Container>
          <div className="mb-10 text-center">
            <p className="mb-2 text-lg font-normal text-sage-light font-script">
              The gift of Highland Farms
            </p>
            <h2 className="text-2xl font-light tracking-tight sm:text-3xl lg:text-[2.25rem]">
              Gift Certificates
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/80 font-sans sm:text-base">
              Give the experience of the farm. Redeemable for a tour, spa session, or overnight stay.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
            {[
              {
                icon: Gift,
                title: "Farm Tour",
                desc: "Private 60-minute Highland Cow encounter. From $150.",
              },
              {
                icon: Leaf,
                title: "Nordic Spa",
                desc: "90-minute wood-burning sauna + cold plunge. $75/person.",
              },
              {
                icon: Home,
                title: "Farm Stay",
                desc: "Overnight at the Lodge, Cottage, or Airstream Camp.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-white/15 bg-white/[0.04] p-6 backdrop-blur-sm"
              >
                <card.icon className="h-6 w-6 text-sage-light" />
                <h3 className="mt-4 text-lg font-normal text-white font-sans">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/75 font-sans">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button
              href={BOOKING_LINKS.giftCertificates}
              size="lg"
              external
              className="bg-white text-charcoal hover:bg-cream"
            >
              Purchase Gift Certificates
            </Button>
          </div>
        </Container>
      </section>

      {/* Cross-sell to experiences */}
      <section className="bg-background py-16 lg:py-24">
        <Container>
          <SectionHeading
            eyebrow="Visit the farm"
            title="More than a store"
            subtitle="Most of our shop customers first met us in person. Come meet the cows, sit in the sauna, or stay the night."
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
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
          <div className="mt-12 flex flex-col items-center justify-center gap-3 text-center text-xs text-muted font-sans sm:flex-row sm:gap-6 sm:text-sm">
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

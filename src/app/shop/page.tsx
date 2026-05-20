import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Beef,
  Gift,
  Shirt,
  Egg,
  Sparkles,
  Star,
  Leaf,
  Home,
  Truck,
  Snowflake,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ShopBody } from "./ShopBody";
import { PRODUCTS } from "./data";
import {
  FIVE_STAR_COUNT,
} from "@/components/shared/GoogleReviewsSection";

export const metadata: Metadata = {
  title: "Farm Store — Highland Farms Oregon",
  description:
    "Heritage Mangalitsa pork, pasture-raised Highland beef, fresh eggs, farm-made plush, and apparel from Highland Farms in Brightwood, Oregon. Gift certificates for farm tours, Nordic spa, and stays.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Farm Store — Highland Farms Oregon",
    description:
      "Heritage Mangalitsa pork, pasture-raised Highland beef, fresh eggs, plush, and apparel. Plus gift certificates for tours, spa, and stays.",
    images: [
      {
        url: "/images/shop/princess-fiona-plush.jpg",
        width: 1067,
        height: 1067,
        alt: "Princess Fiona White Highland Cow Plush",
      },
    ],
  },
};

function StructuredData() {
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Highland Farms Farm Store",
    itemListElement: PRODUCTS.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: p.name,
        image: `https://highlandfarmsoregon.com${p.image}`,
        url: p.url,
        category: p.category,
        ...(p.price !== null && {
          offers: {
            "@type": "Offer",
            price: p.price,
            priceCurrency: "USD",
            availability: p.soldOut
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
            url: p.url,
          },
        }),
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
    />
  );
}

export default function ShopPage() {
  return (
    <>
      <StructuredData />

      {/* Hero — copy + 3 CTAs left, cow portrait right (fades into cream on the left edge) */}
      <section className="relative isolate overflow-hidden bg-cream pt-[calc(var(--header-h,100px)+1.5rem)] pb-12 sm:pt-[calc(var(--header-h,100px)+2.5rem)] sm:pb-16 lg:pb-20">
        <div className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-full md:w-[60%] lg:w-[55%]">
          <Image
            src="/images/farm/shop-hero-cow.jpg"
            alt=""
            fill
            priority
            fetchPriority="high"
            sizes="(max-width: 768px) 100vw, 60vw"
            className="object-cover object-[60%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-cream via-cream/70 to-cream/0 md:from-cream md:via-cream/40 md:to-transparent" />
        </div>

        <Container>
          <div className="max-w-2xl">
            <p className="text-xs font-normal uppercase tracking-[0.18em] text-sage sm:text-[0.8125rem]">
              Brightwood · Oregon
            </p>
            <h1 className="mt-3 text-5xl leading-[1.02] tracking-tight text-charcoal sm:text-6xl lg:text-[5rem]">
              Farm Store
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-charcoal/80 font-sans sm:text-[1.0625rem]">
              Pasture-raised Highland beef, heritage Mangalitsa pork, farm
              eggs, apparel, and gifts from our Brightwood farm. Order online
              for farm pickup or insulated shipping.
            </p>

            {/* CTAs — same height row, no wrap on desktop */}
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:flex-wrap">
              <Button
                href="#cat-featured"
                size="lg"
                className="bg-forest text-white hover:bg-forest/90"
              >
                Shop Bestsellers
              </Button>
              <Button
                href="#cat-mangalitsa"
                size="lg"
                className="border border-charcoal/25 bg-white/80 text-charcoal hover:border-charcoal/50 hover:bg-white"
              >
                Shop Meat Boxes
              </Button>
              <Button
                href="/contact"
                size="lg"
                className="border border-charcoal/25 bg-white/80 text-charcoal hover:border-charcoal/50 hover:bg-white"
              >
                Pickup at the Farm
              </Button>
            </div>

            {/* Inline trust strip — 5 items, white pill below the CTAs */}
            <dl className="mt-8 inline-flex max-w-full flex-wrap items-start gap-x-7 gap-y-3 rounded-2xl bg-white/90 px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] backdrop-blur-sm sm:px-6">
              {FIVE_STAR_COUNT > 0 && (
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex items-center gap-0.5 shrink-0" aria-hidden>
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-3 w-3 fill-forest text-forest"
                        strokeWidth={1.5}
                      />
                    ))}
                  </span>
                  <div className="font-sans">
                    <dt className="text-[0.6875rem] font-medium uppercase tracking-[0.1em] leading-tight text-charcoal">
                      {FIVE_STAR_COUNT} 5-Star Reviews
                    </dt>
                    <dd className="mt-0.5 text-[0.625rem] uppercase tracking-[0.08em] text-charcoal/55">
                      Google verified
                    </dd>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Leaf
                  className="mt-0.5 h-4 w-4 text-forest shrink-0"
                  strokeWidth={1.5}
                />
                <div className="font-sans">
                  <dt className="text-[0.6875rem] font-medium uppercase tracking-[0.1em] leading-tight text-charcoal">
                    Pasture-raised
                  </dt>
                  <dd className="mt-0.5 text-[0.625rem] uppercase tracking-[0.08em] text-charcoal/55">
                    No hormones
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Home
                  className="mt-0.5 h-4 w-4 text-forest shrink-0"
                  strokeWidth={1.5}
                />
                <div className="font-sans">
                  <dt className="text-[0.6875rem] font-medium uppercase tracking-[0.1em] leading-tight text-charcoal">
                    Family-run
                  </dt>
                  <dd className="mt-0.5 text-[0.625rem] uppercase tracking-[0.08em] text-charcoal/55">
                    Since 2019
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Truck
                  className="mt-0.5 h-4 w-4 text-forest shrink-0"
                  strokeWidth={1.5}
                />
                <div className="font-sans">
                  <dt className="text-[0.6875rem] font-medium uppercase tracking-[0.1em] leading-tight text-charcoal">
                    Farm pickup
                  </dt>
                  <dd className="mt-0.5 text-[0.625rem] uppercase tracking-[0.08em] text-charcoal/55">
                    &amp; Shipping
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Snowflake
                  className="mt-0.5 h-4 w-4 text-forest shrink-0"
                  strokeWidth={1.5}
                />
                <div className="font-sans">
                  <dt className="text-[0.6875rem] font-medium uppercase tracking-[0.1em] leading-tight text-charcoal">
                    Insulated
                  </dt>
                  <dd className="mt-0.5 text-[0.625rem] uppercase tracking-[0.08em] text-charcoal/55">
                    Shipping
                  </dd>
                </div>
              </div>
            </dl>
          </div>
        </Container>
      </section>

      {/* Shop By Category — photo tiles with floating icon medallion + label below */}
      <section className="bg-background pb-12 pt-4 lg:pb-16">
        <Container>
          <p className="mb-8 text-center text-xs font-normal uppercase tracking-[0.18em] text-sage sm:text-[0.8125rem]">
            Shop by category
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-12 lg:grid-cols-5">
            {[
              {
                href: "#cat-beef",
                image: "/images/shop/tenderloin-steak.jpg",
                title: "Meat & Boxes",
                Icon: Beef,
              },
              {
                href: "#cat-mangalitsa",
                image: "/images/shop/mangalitsa-thick-cut-bacon.jpg",
                title: "Mangalitsa",
                Icon: Gift,
              },
              {
                href: "#cat-plush",
                image: "/images/shop/mr-finley-plush.jpg",
                title: "Plush & Gifts",
                Icon: Sparkles,
              },
              {
                href: "#cat-apparel",
                image: "/images/shop/dream-hoodie.png",
                title: "Apparel",
                Icon: Shirt,
              },
              {
                href: "#cat-pantry",
                image: "/images/shop/eggs.jpg",
                title: "Pantry",
                Icon: Egg,
              },
            ].map((tile) => (
              <Link key={tile.title} href={tile.href} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                  <Image
                    src={tile.image}
                    alt={tile.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-charcoal/20" />
                  {/* Floating icon medallion — overlaps the bottom edge */}
                  <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2">
                    <div className="rounded-full bg-cream p-3 shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-charcoal/5 transition-transform group-hover:-translate-y-0.5">
                      <tile.Icon
                        className="h-5 w-5 text-forest"
                        strokeWidth={1.5}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-8 text-center">
                  <h3 className="text-[0.6875rem] font-medium uppercase tracking-[0.15em] text-charcoal font-sans sm:text-xs">
                    {tile.title}
                  </h3>
                  <p className="mt-1 text-xs italic text-charcoal/60 font-sans">
                    Shop now <span aria-hidden className="not-italic transition-transform group-hover:translate-x-0.5 inline-block">→</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Everything else (client) */}
      <ShopBody />
    </>
  );
}

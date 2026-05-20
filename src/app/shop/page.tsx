import type { Metadata } from "next";
import Image from "next/image";
import { ShopBody } from "./ShopBody";
import { PRODUCTS } from "./data";

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

      {/* Hero — slim collection-style banner */}
      <section className="relative flex h-[240px] items-end overflow-hidden pt-[var(--header-h,100px)] sm:h-[280px]">
        <Image
          src="/images/farm/farm-store-hero.jpg"
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover object-[center_55%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/25 via-charcoal/40 to-charcoal/65" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-6 text-white sm:px-6 sm:pb-8 lg:px-8">
          <h1 className="text-4xl font-normal leading-[1.05] tracking-tight sm:text-5xl">
            Farm Store
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/90 font-sans sm:text-base">
            Heritage Mangalitsa pork, pasture-raised Highland beef, and
            farm-made gifts — ship anywhere or pick up at the farm.
          </p>
        </div>
      </section>

      {/* Everything else (client) */}
      <ShopBody />
    </>
  );
}

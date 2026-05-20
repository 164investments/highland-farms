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

      {/* Hero */}
      <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden pt-[var(--header-h,120px)]">
        <Image
          src="/images/farm/highland-cows-hero.jpg"
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-charcoal/45" />

        <div className="relative z-10 mx-auto max-w-3xl px-4 py-12 text-center text-white">
          <p className="mb-4 text-xl font-normal text-white/80 font-script">
            Highland Farms Oregon
          </p>
          <h1 className="text-4xl font-normal leading-tight sm:text-5xl md:text-6xl">
            Bring the Farm Home
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/85 font-sans font-light sm:text-lg">
            Heritage Mangalitsa pork, pasture-raised Highland beef, eggs from
            our hens, plus farm-made plush, apparel, and gifts.
          </p>
        </div>
      </section>

      {/* Everything else (client) */}
      <ShopBody />
    </>
  );
}

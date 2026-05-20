import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
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

      {/* Title band — typographic, no hero photo (matches high-converting WNF collection pattern) */}
      <section className="bg-background pt-[calc(var(--header-h,100px)+1.5rem)] pb-6 sm:pt-[calc(var(--header-h,100px)+2rem)] sm:pb-8">
        <Container>
          <p className="text-xs font-normal uppercase tracking-[0.18em] text-sage sm:text-[0.8125rem]">
            Brightwood · Oregon
          </p>
          <h1 className="mt-2 text-[2rem] font-light leading-[1.05] tracking-tight text-charcoal sm:text-4xl">
            Farm Store
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted font-sans sm:text-base">
            Heritage Mangalitsa pork, pasture-raised Highland beef, and
            farm-made gifts — ship anywhere or pick up at the farm.
          </p>
        </Container>
      </section>

      {/* Everything else (client) */}
      <ShopBody />
    </>
  );
}

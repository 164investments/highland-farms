import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MapPin, Truck } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PRODUCTS, getProduct, fromPrice } from "../data";
import { getStockMap } from "@/lib/shop/inventory";
import { toCents, formatCents } from "@/lib/shop/money";
import { DELIVERY_FEE_CENTS, PICKUP_LOCATION } from "@/lib/shop/fulfillment";
import { AddToCart } from "./AddToCart";

export const revalidate = 60;

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: "Not found | Highland Farms" };

  const price = formatCents(toCents(fromPrice(product)));
  return {
    title: `${product.name} | Highland Farms Farm Store`,
    description: `${product.name} from Highland Farms in Brightwood, Oregon — ${price}. Farm pickup or local delivery.`,
    alternates: { canonical: `https://highlandfarmsoregon.com/shop/${product.slug}` },
    openGraph: {
      title: `${product.name} | Highland Farms`,
      images: [`https://highlandfarmsoregon.com${product.image}`],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const stock = await getStockMap();
  const variants = product.variants.map((v) => ({
    id: v.id,
    label: v.label,
    priceCents: toCents(v.price),
    stock: stock.has(v.id) ? stock.get(v.id)! : null,
  }));
  const soldOut = variants.every((v) => v.stock === 0);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: `https://highlandfarmsoregon.com${product.image}`,
    category: product.category,
    brand: { "@type": "Brand", name: "Highland Farms" },
    offers: {
      "@type": "Offer",
      price: fromPrice(product),
      priceCurrency: "USD",
      availability: soldOut
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      url: `https://highlandfarmsoregon.com/shop/${product.slug}`,
    },
  };

  return (
    <main className="bg-cream pt-32 pb-20 sm:pb-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <Container className="max-w-5xl">
        <Link
          href="/shop"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-forest font-sans"
        >
          <ArrowLeft className="h-4 w-4" />
          Farm store
        </Link>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-white shadow-sm">
            <Image
              src={product.image}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className={`object-cover ${soldOut ? "opacity-60" : ""}`}
            />
            {soldOut && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="rounded-full bg-charcoal/90 px-5 py-2 text-xs uppercase tracking-[0.15em] text-white font-sans">
                  Sold Out
                </span>
              </div>
            )}
          </div>

          <div>
            {product.badges && product.badges.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {product.badges.map((b) => (
                  <span
                    key={b}
                    className="rounded-full bg-white px-2.5 py-0.5 text-[0.625rem] uppercase tracking-[0.12em] text-forest shadow-sm font-sans"
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}

            <h1 className="font-display text-3xl font-light leading-tight tracking-tight text-charcoal sm:text-4xl">
              {product.name}
            </h1>

            {product.priceNote && (
              <p className="mt-2 text-xs uppercase tracking-[0.12em] text-muted font-sans">
                {product.priceNote}
              </p>
            )}

            <AddToCart
              productName={product.name}
              slug={product.slug}
              category={product.category}
              optionName={product.optionName}
              variants={variants}
            />

            <dl className="mt-8 space-y-3 border-t border-cream-dark/60 pt-6 text-sm font-sans">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                <div>
                  <dt className="text-charcoal">Free farm pickup</dt>
                  <dd className="text-muted">{PICKUP_LOCATION.address}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                <div>
                  <dt className="text-charcoal">
                    Local delivery {formatCents(DELIVERY_FEE_CENTS)}
                  </dt>
                  <dd className="text-muted">
                    Mt. Hood corridor and east Portland — we check your ZIP at
                    checkout. We don&apos;t ship.
                  </dd>
                </div>
              </div>
            </dl>
          </div>
        </div>
      </Container>
    </main>
  );
}

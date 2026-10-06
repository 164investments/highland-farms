import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { EventCategoryCards } from "@/components/shared/EventCategoryCards";
import { weddingPortfolio } from "@/data/wedding-portfolio";
import { StructuredData } from "@/components/layout/StructuredData";

export const metadata: Metadata = {
  title: "Wedding Portfolio",
  description:
    "Browse real weddings at Highland Farms, Oregon. See how couples have celebrated their love in our forest and farm setting at the base of Mt. Hood.",
  alternates: { canonical: "/wedding-portfolio" },
  openGraph: {
    title: "Wedding Portfolio — Highland Farms Oregon",
    description:
      "Browse real weddings at Highland Farms, Oregon. See how couples have celebrated their love in our forest and farm setting.",
    images: [
      {
        url: "/images/weddings/couple.jpg",
        width: 1200,
        height: 630,
        alt: "Wedding couple at Highland Farms",
      },
    ],
  },
};

export default function WeddingPortfolioPage() {
  return (
    <>
      <StructuredData pathname="/wedding-portfolio" />
      {/* Portfolio Grid */}
      <section className="pt-[calc(var(--header-h,120px)+3rem)] pb-20 lg:pb-28 bg-background">
        <Container>
          <SectionHeading
            as="h1"
            eyebrow="Real Weddings"
            title="Wedding Portfolio"
            subtitle="Every love story is unique. Browse real celebrations at Highland Farms and imagine your own."
          />

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {weddingPortfolio.map((couple) => (
              <Link
                key={couple.slug}
                href={`/wedding-portfolio/${couple.slug}`}
                className="group block overflow-hidden rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-500"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Image
                    src={couple.coverImage}
                    alt={`${couple.names} wedding at Highland Farms`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h2 className="text-2xl font-normal text-white">
                      {couple.names}
                    </h2>
                    <p className="mt-1 text-sm font-light text-white/70 font-sans tracking-wide">
                      View Gallery &rarr;
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 bg-cream">
        <Container className="max-w-3xl text-center">
          <h2 className="text-3xl font-normal sm:text-4xl">
            Ready to Write Your Own Story?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-muted font-sans font-light leading-relaxed">
            Highland Farms weddings are all-inclusive. We handle the venue,
            accommodations, and coordination so you can focus on each other.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button href="/weddings">Learn About Weddings</Button>
            <Button href="/weddings#contact" variant="outline">
              Get Your Custom Quote
            </Button>
          </div>
        </Container>
      </section>

      <EventCategoryCards />
    </>
  );
}

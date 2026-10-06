import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Users, BedDouble, Bath } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { ReviewBadge } from "@/components/shared/ReviewBadge";
import { EventCategoryCards } from "@/components/shared/EventCategoryCards";
import { properties } from "@/data/properties";
import { StructuredData } from "@/components/layout/StructuredData";

const propertyIllustrations: Record<string, string> = {
  lodge: "/images/illustrations/lodge-illustration.png",
  cottage: "/images/illustrations/cottage-illustration.png",
  "whole-farm": "/images/illustrations/farm-scene.png",
};

export const metadata: Metadata = {
  title: { absolute: "Farm Stay near Mt. Hood, Oregon | Highland Farms" },
  description:
    "Stay on a working Highland cow farm in Brightwood. William Wallace Lodge, Bonnie Lass Cottage, or the whole farm. About an hour from Portland, near Mt. Hood.",
  alternates: { canonical: "/stay" },
  openGraph: {
    title: "Farm Stay near Mt. Hood, Oregon | Highland Farms",
    description:
      "Stay on a working Highland cow farm in Brightwood. William Wallace Lodge, Bonnie Lass Cottage, or the whole farm. About an hour from Portland, near Mt. Hood.",
    url: "https://highlandfarmsoregon.com/stay",
    type: "website",
    images: [
      {
        url: "/images/properties/whole-farm.jpg",
        width: 1200,
        height: 630,
        alt: "Highland Farms accommodations in Brightwood, Oregon",
      },
    ],
  },
};

export default function StayPage() {
  return (
    <>
      <StructuredData pathname="/stay" />
      {/* Hero */}
      <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden pt-[var(--header-h,120px)]">
        <Image
          src="/images/properties/hero.jpg"
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/35" />

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center text-white">
          <p className="mb-4 text-xl font-normal text-white/80 font-script">
            About an hour from Portland &middot; about 25 min from Government Camp
          </p>
          <h1 className="text-4xl font-normal leading-tight sm:text-5xl md:text-6xl">
            Stay at Highland Farms
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/85 leading-relaxed font-sans font-light">
            Escape to the heart of the forest. From a cozy cottage and rustic
            camp to a private lodge — or the whole farm — every stay sits
            beneath towering evergreens, alongside winding creeks and
            a tranquil pond at the base of Mt. Hood.
          </p>
          <div className="mt-8" data-hero-cta>
            <Button
              href="#stays"
              size="lg"
              className="bg-white text-charcoal hover:bg-cream"
            >
              Find your dates
            </Button>
          </div>
          <div className="mt-6 flex justify-center">
            <ReviewBadge variant="card" />
          </div>
        </div>
      </section>

      {/* Book Direct Banner */}
      <section className="bg-charcoal/90 py-4 text-center backdrop-blur-sm">
        <p className="mx-auto max-w-2xl px-4 text-sm font-light text-white/85 font-sans">
          Book direct with the farm. You see the full total, cleaning included, before you reserve.
        </p>
        <p className="mt-1 text-[10px] font-light text-white/50 tracking-[0.1em] uppercase font-sans">
          No outside pets allowed
        </p>
      </section>

      <section className="bg-cream-light py-7">
        <Container className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-3xl">A Highland Farms Thanksgiving</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">November 24–28, 2026. Four nights, holiday meals, Nordic spa and time on the farm.</p>
          </div>
          <Button href="/thanksgiving" className="shrink-0">See the packages</Button>
        </Container>
      </section>

      {/* Properties */}
      <section id="stays" className="scroll-mt-24 py-20 lg:py-28 bg-background">
        <Container>
          <SectionHeading
            eyebrow="The Accommodations"
            title="Find Your Perfect Stay"
          />

          <div className="space-y-16">
            {properties.map((property, i) => (
              <div
                key={property.slug}
                className={`flex flex-col gap-8 lg:flex-row lg:items-center ${
                  i % 2 === 1 ? "lg:flex-row-reverse" : ""
                }`}
              >
                {/* Image */}
                <div className="flex-1">
                  <Link href={property.bookingUrl} className="block group">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                      <Image
                        src={property.imageSrc}
                        alt={property.name}
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
                          property.slug === "whole-farm"
                            ? "object-[center_60%]"
                            : ""
                        }`}
                      />
                      <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/5 transition-colors" />
                    </div>
                  </Link>
                </div>

                {/* Details */}
                <div className="flex-1">
                  {propertyIllustrations[property.slug] && (
                    <div className="mb-4">
                      <Image
                        src={propertyIllustrations[property.slug]}
                        alt=""
                        width={180}
                        height={110}
                        className="h-20 w-auto opacity-60"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                  <h3 className="text-3xl font-normal text-charcoal">
                    {property.name}
                  </h3>
                  <p className="mt-1 text-base italic text-muted font-sans">
                    {property.tagline}
                  </p>

                  {/* Stats */}
                  <div className="mt-4 flex items-center gap-6 text-sm text-muted font-sans">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {property.guests} Guests
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BedDouble className="h-4 w-4" />
                      {property.bedrooms} Bedrooms
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Bath className="h-4 w-4" />
                      {property.baths} Bathrooms
                    </span>
                  </div>

                  <p className="mt-4 text-base text-muted leading-relaxed font-sans">
                    {property.description}
                  </p>

                  {/* Highlights */}
                  <ul className="mt-4 grid grid-cols-2 gap-2">
                    {property.highlights.map((h) => (
                      <li
                        key={h}
                        className="text-sm text-charcoal font-sans flex items-center gap-2"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-forest shrink-0" />
                        {h}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    <Button href={property.bookingUrl}>
                      View &amp; Book
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <EventCategoryCards />
    </>
  );
}

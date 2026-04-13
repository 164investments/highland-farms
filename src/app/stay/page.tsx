import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Users, BedDouble, Bath } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { EventCategoryCards } from "@/components/shared/EventCategoryCards";
import { properties } from "@/data/properties";

const propertyIllustrations: Record<string, string> = {
  lodge: "/images/illustrations/lodge-illustration.png",
  cottage: "/images/illustrations/cottage-illustration.png",
  "whole-farm": "/images/illustrations/farm-scene.png",
};

export const metadata: Metadata = {
  title: "Farm Stays — Brightwood, Oregon",
  description:
    "Book a farm stay at Highland Farms near Portland, Oregon. Choose from William Wallace Lodge, Bonnie Lass Cottage, or reserve the whole farm for up to 16 guests. 50 minutes from Portland, 20 minutes from Mt. Hood in Brightwood.",
  alternates: { canonical: "/stay" },
  openGraph: {
    title: "Stay at Highland Farms — Farm Stays in Brightwood, Oregon",
    description:
      "Four unique forest accommodations at the base of Mt. Hood. Book direct for the best rate.",
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
            50 min from Portland &middot; 20 min from Mt. Hood
          </p>
          <h1 className="text-4xl font-normal leading-tight sm:text-5xl md:text-6xl">
            Stay at Highland Farms
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/85 leading-relaxed font-sans font-light">
            Escape to the heart of the forest. Two unique accommodations await,
            nestled beneath towering evergreens, alongside winding creeks and a
            tranquil pond at the base of majestic Mt. Hood.
          </p>
        </div>
      </section>

      {/* Book Direct Banner */}
      <section className="bg-charcoal/90 py-4 text-center backdrop-blur-sm">
        <p className="text-xs font-light text-white/80 tracking-[0.15em] uppercase font-sans">
          Book Direct for the Best Rate &mdash; No Hidden Fees
        </p>
        <p className="mt-1 text-[10px] font-light text-white/50 tracking-[0.1em] uppercase font-sans">
          No outside pets allowed
        </p>
      </section>

      {/* Properties */}
      <section className="py-20 lg:py-28 bg-background">
        <Container>
          <SectionHeading
            eyebrow="The Accommodations"
            title="Find Your Perfect Stay"
            subtitle="(Summer Dates Open April 1st)"
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

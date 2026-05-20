import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Users, BedDouble, Bath, ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ImageCarousel } from "@/components/gallery/ImageCarousel";
import { HospitableWidget } from "@/components/stay/HospitableWidget";
import { properties } from "@/data/properties";

export function generateStaticParams() {
  return properties.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return params.then(({ slug }) => {
    const property = properties.find((p) => p.slug === slug);
    if (!property) return { title: "Not Found" };

    return {
      title: `${property.name} — Farm Stay`,
      description: property.description,
      alternates: { canonical: `/stay/${slug}` },
      openGraph: {
        title: `${property.name} — Farm Stay at Highland Farms Oregon`,
        description: property.description,
        images: [
          {
            url: property.imageSrc,
            width: 1200,
            height: 630,
            alt: property.name,
          },
        ],
      },
    };
  });
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = properties.find((p) => p.slug === slug);

  if (!property) notFound();

  const propertyGallery: Record<string, { src: string; alt: string }[]> = {
    "whole-farm": [
      { src: "/images/properties/whole-farm.jpg", alt: "The Whole Farm aerial view" },
      { src: "/images/properties/lodge-winter.jpg", alt: "Lodge in winter with snow-covered grounds and pond" },
      { src: "/images/properties/cottage.jpg", alt: "William Wallace Lodge exterior" },
      { src: "/images/properties/lodge.jpg", alt: "Bonnie Lass Cottage exterior" },
      { src: "/images/properties/lodge-living-pro.jpg", alt: "Lodge living room with Chesterfield sofas, stone fireplace, and curved iron-truss ceiling" },
      { src: "/images/properties/cottage-living-spiral.jpg", alt: "Cottage living room with spiral staircase and retro red fridge" },
      { src: "/images/properties/gallery-7.jpg", alt: "Aerial view of Highland Farms property" },
    ],
    lodge: [
      { src: "/images/properties/cottage.jpg", alt: "William Wallace Lodge exterior" },
      { src: "/images/properties/lodge-living-pro.jpg", alt: "Living room with Chesterfield sofas, curved iron-truss ceiling, and stone fireplace" },
      { src: "/images/properties/lodge-dining-pro.jpg", alt: "Formal dining room with stone fireplace and seating for ten" },
      { src: "/images/properties/lodge-kitchen-pro.jpg", alt: "Full chef's kitchen with oak cabinets, granite island, and French doors to the deck" },
      { src: "/images/properties/lodge-master-bedroom-pro.jpg", alt: "Master bedroom with vaulted cedar ceiling, king bed, and forest-view sitting area" },
      { src: "/images/properties/lodge-bedroom-cedar.jpg", alt: "Bedroom with cedar herringbone wood paneling and queen plaid bed" },
      { src: "/images/properties/lodge-bedroom-ladder.jpg", alt: "Bedroom with vaulted ceiling, Mt. Hood painting, and ladder up to a hidden loft" },
      { src: "/images/properties/lodge-twin-bedroom-pro.jpg", alt: "Twin bedroom with lumberjack plaid bedding and vaulted wood ceiling" },
      { src: "/images/properties/lodge-master-bath-pro.jpg", alt: "Master bathroom with vaulted wood ceiling, soaking tub, and glass shower" },
      { src: "/images/properties/lodge-bath-vaulted.jpg", alt: "Guest bath with vaulted wood-beam ceiling and glass shower stall" },
      { src: "/images/properties/lodge-shuffleboard.jpg", alt: "Game room with full-length shuffleboard table and floor-to-ceiling forest windows" },
      { src: "/images/properties/lodge-deck.jpg", alt: "Wrap-around deck with lounge chairs" },
      { src: "/images/properties/lodge-winter.jpg", alt: "Lodge in winter from the pond" },
    ],
    cottage: [
      { src: "/images/properties/lodge.jpg", alt: "Bonnie Lass Cottage exterior" },
      { src: "/images/properties/cottage-living-spiral.jpg", alt: "Cottage living room with spiral staircase, retro red fridge, and cedar-plank ceiling" },
      { src: "/images/properties/cottage-living-garage.jpg", alt: "Living room with garage door open to forest, leather sofa, and tree-trunk side table" },
      { src: "/images/properties/cottage-kitchen-pro.jpg", alt: "Cottage kitchen with spiral staircase to the loft, white cabinets, and pine ceiling" },
      { src: "/images/properties/cottage-master-bedroom-pro.jpg", alt: "Cottage master bedroom with cedar-plank walls, king bed, and feather wall hanging" },
      { src: "/images/properties/cottage-bedroom-cedar.jpg", alt: "Cedar-walled bedroom with antique dresser and sliding-door forest view" },
      { src: "/images/properties/cottage-loft-bedroom-pro.jpg", alt: "Loft bedroom with sloped white ceiling and green-curtained dormer window" },
      { src: "/images/properties/cottage-loft-twins.jpg", alt: "Loft sleeping platform with twin beds tucked under the eaves" },
      { src: "/images/properties/cottage-bathroom-pro.jpg", alt: "Cottage bathroom with green tile shower, brass fixtures, and pine walls" },
      { src: "/images/properties/cottage-exterior-2.jpg", alt: "Cottage exterior with gambrel roof" },
    ],
    camp: [
      { src: "/images/properties/camp-1.jpg", alt: "Airstream trailer under the evergreens" },
      { src: "/images/properties/camp-interior-kitchen-dining.jpg", alt: "Airstream interior with full kitchen and rear dining nook" },
      { src: "/images/properties/camp-interior-bedroom.jpg", alt: "Airstream rear sleeping nook with forest view" },
      { src: "/images/properties/camp-interior-lounge.jpg", alt: "Airstream lounge with TV and view through to the bedroom" },
      { src: "/images/properties/camp-interior-galley.jpg", alt: "Airstream galley kitchen looking back toward the bedroom" },
      { src: "/images/properties/camp-interior-dining-door.jpg", alt: "Airstream dining nook with open door to the forest path" },
      { src: "/images/properties/camp-interior-lounge-wide.jpg", alt: "Wide view of the Airstream lounge and dining area" },
      { src: "/images/properties/camp-4.jpg", alt: "Airstream nestled in fall foliage" },
      { src: "/images/properties/camp-6.jpg", alt: "Airstream campsite in the forest" },
      { src: "/images/properties/camp-7.jpg", alt: "Family meeting the Highland cows" },
    ],
  };

  const carouselImages = propertyGallery[property.slug] || [
    { src: property.imageSrc, alt: `${property.name}` },
  ];

  return (
    <>
      {/* Back link + Hero */}
      <section className="pt-24 pb-4 bg-background">
        <Container>
          <Link
            href="/stay"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-forest transition-colors font-sans"
          >
            <ArrowLeft className="h-4 w-4" />
            All Accommodations
          </Link>
        </Container>
      </section>

      {/* Gallery */}
      <section className="pb-12 bg-background">
        <Container>
          <ImageCarousel images={carouselImages} aspectRatio="video" />
        </Container>
      </section>

      {/* Property Details + Booking Widget */}
      <section className="py-12 bg-background">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px] max-w-5xl mx-auto">
            {/* Left: Details */}
            <div>
              <h1 className="text-3xl font-normal sm:text-4xl">
                {property.name}
              </h1>
              <p className="mt-2 text-lg italic text-muted font-sans">
                {property.tagline}
              </p>

              {/* Stats */}
              <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-charcoal font-sans">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-forest" />
                  {property.guests} Guests
                </span>
                <span className="flex items-center gap-1.5">
                  <BedDouble className="h-4 w-4 text-forest" />
                  {property.bedrooms} Bedrooms
                </span>
                <span className="flex items-center gap-1.5">
                  <Bath className="h-4 w-4 text-forest" />
                  {property.baths} Baths
                </span>
              </div>

              <div className="mt-6 h-px bg-cream-dark" />

              <p className="mt-6 text-base text-muted leading-relaxed font-sans">
                {property.description}
              </p>

              {/* Highlights */}
              <div className="mt-6">
                <h3 className="text-xs font-light uppercase tracking-[0.15em] text-muted font-sans mb-3">
                  Highlights
                </h3>
                <ul className="space-y-2">
                  {property.highlights.map((h) => (
                    <li
                      key={h}
                      className="text-sm text-muted font-sans flex items-center gap-2"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-forest shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 h-px bg-cream-dark" />

              {/* Activities */}
              <div className="mt-6">
                <h3 className="text-xs font-light uppercase tracking-[0.15em] text-muted font-sans mb-3">
                  While You&apos;re Here
                </h3>
                <div className="space-y-2">
                  <Button href="/farm-tours" variant="ghost" className="w-full justify-start text-sm px-0">
                    Highland Cow Farm Tours &rarr;
                  </Button>
                  <Button href="/nordic-spa" variant="ghost" className="w-full justify-start text-sm px-0">
                    Nordic Forest Spa &rarr;
                  </Button>
                  <Button href="/weddings" variant="ghost" className="w-full justify-start text-sm px-0">
                    Weddings &amp; Events &rarr;
                  </Button>
                </div>
              </div>
            </div>

            {/* Right: Booking Widget */}
            <div>
              <div className="lg:sticky lg:top-24">
                <div className="rounded-xl border border-cream-dark bg-white p-3">
                  <p className="text-center text-xs font-light tracking-[0.15em] uppercase text-muted font-sans mb-3">
                    Book Direct &mdash; Best Rate Guaranteed
                  </p>
                  <HospitableWidget
                    widgetUrl={property.hospitable_widget_url || ""}
                    propertyName={property.name}
                  />
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Other Properties */}
      <section className="py-20 lg:py-28 bg-warm-white">
        <Container>
          <h2 className="text-center text-2xl font-normal mb-10 sm:text-3xl">
            Explore Other Accommodations
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties
              .filter((p) => p.slug !== property.slug)
              .map((p) => (
                <Link
                  key={p.slug}
                  href={p.bookingUrl}
                  className="group overflow-hidden rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-500"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={p.imageSrc}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
                        p.slug === "whole-farm"
                          ? "object-[center_60%]"
                          : ""
                      }`}
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-normal text-charcoal font-display">
                      {p.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted font-sans">
                      {p.guests} Guests &middot; {p.bedrooms} Beds &middot; {p.baths} Baths
                    </p>
                    <p className="mt-3 text-sm font-light text-forest group-hover:text-forest-light transition-colors font-sans tracking-wide">
                      View &amp; Book &rarr;
                    </p>
                  </div>
                </Link>
              ))}
          </div>
        </Container>
      </section>
    </>
  );
}

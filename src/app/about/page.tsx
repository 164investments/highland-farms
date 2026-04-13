import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Bed, UtensilsCrossed, Wifi, Car } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { ImageCarousel } from "@/components/gallery/ImageCarousel";
import { EventCategoryCards } from "@/components/shared/EventCategoryCards";

export const metadata: Metadata = {
  title: "About The Farm — Highland Farms Brightwood, Oregon",
  description:
    "The story of Highland Farms — from a California ranch dream to a five-acre forest property at the base of Mt. Hood. Scottish Highland Cows, forest lodging for 16 guests, Nordic spa, and unforgettable experiences in Brightwood, Oregon.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About The Farm — Highland Farms Brightwood, Oregon",
    description:
      "The story of Highland Farms — from a California ranch dream to a five-acre forest property at the base of Mt. Hood.",
    images: [
      {
        url: "/images/farm/about-hero.jpg",
        width: 1200,
        height: 630,
        alt: "Highland Farms property at the base of Mt. Hood",
      },
    ],
  },
};

const amenities = [
  { icon: Bed, label: "Lodging for 16", description: "Two unique accommodations across the property" },
  { icon: UtensilsCrossed, label: "Full Time Hospitality Team", description: "Our hospitality team believes in unreasonable hospitality" },
  { icon: Wifi, label: "WiFi Access", description: "Stay connected throughout the property" },
  { icon: Car, label: "Event Parking", description: "Ample parking for guests and vendors" },
];

const galleryImages = [
  { src: "/images/farm/farm-aerial-new.jpg", alt: "Aerial drone view of Highland Farms with mountains" },
  { src: "/images/farm/lodge-bridge.jpg", alt: "Lodge with wooden bridge at golden hour" },
  { src: "/images/farm/barn-exterior.jpg", alt: "Modern barn with cedar accents and geometric windows" },
  { src: "/images/farm/hot-tub-aerial.jpg", alt: "Cedar hot tub and deck from above" },
  { src: "/images/farm/airstream-golden.jpg", alt: "Airstream nestled in the forest at golden hour" },
  { src: "/images/farm/forest-creek.jpg", alt: "Forest creek with ferns and mossy stones" },
  { src: "/images/farm/farm-aerial-2.jpg", alt: "Aerial view of Highland Farms with Mt. Hood foothills" },
  { src: "/images/farm/cottage-snow.jpg", alt: "Cottage exterior in winter snow among the evergreens" },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden pt-[var(--header-h,120px)]">
        <Image
          src="/images/farm/about-hero.jpg"
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
            Our Story
          </p>
          <h1 className="text-4xl font-normal leading-tight sm:text-5xl md:text-6xl">
            The Farm
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/85 leading-relaxed font-sans font-light italic">
            &ldquo;We created Highland Farms with the intention of providing a space
            where loved ones can come together to reconnect with nature and each other.&rdquo;
          </p>
        </div>
      </section>

      {/* The Origin Story */}
      <section className="py-20 lg:py-28 bg-background">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-lg font-normal text-sage font-script mb-3">
                The Story of a Farm
              </p>
              <h2 className="text-3xl font-normal sm:text-4xl">
                From a California Ranch to Mt. Hood
              </h2>
              <p className="mt-5 text-base text-muted leading-relaxed font-sans">
                Every farm has a story — that of Highland Farms begins on a ranch
                600 miles south of Mount Hood, located halfway between the fertile
                fields of the Central Valley and the Pacific Ocean. The Church ranch
                in Salinas, California, cultivated a deep love and passion for farm
                life, the smells of the earth, and the cowboy lifestyle in Connor
                McWilliams. This passion coupled itself with an enterprising plan in
                young Connor&apos;s mind: hang a shingle as a general contractor until the
                moment that career can yield a farm and livestock of his own.
              </p>
              <p className="mt-4 text-base text-muted leading-relaxed font-sans">
                Work in the construction industry naturally led to experience in
                hospitality and design, and being a natural dreamer, Connor
                couldn&apos;t imagine owning a property without creating a hospitality
                experience to share with the world. This vision led to the creation
                of Highland Farms; an overgrown property uncovered from decades of
                nature&apos;s re-wilding at the base of Mt. Hood. Highland Farms needed
                someone with a dream to see its full potential:
              </p>
              <div className="mt-4 space-y-3 text-base text-muted leading-relaxed font-sans italic pl-4 border-l-2 border-cream-dark">
                <p>The potential of its natural spring-fed pond, a sanctuary for rest, retreat, and rejuvenation for animals and humans alike.</p>
                <p>The potential of its old-growth trees fringing the property, draped in moss and quiet.</p>
                <p>The potential of its perfect location, tucked into the heart of Oregon&apos;s majestic trees and glacier lakes and sitting directly between Mt. Hood and Oregon&apos;s Rose City.</p>
                <p>The potential of its field and forest, where guests of the farm can marvel at Scottish Highland cattle foraging amongst the trees, weathering the winter, and welcoming their calves in the front pastures.</p>
                <p>The potential to be a place for man, a place for nature, a place for everything and everything in its place.</p>
                <p className="not-italic font-medium">This is Highland Farms.</p>
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
              <Image
                src="/images/farm/farm-life.jpg"
                alt="Connor with a Highland Cow calf at Highland Farms"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* The Vision */}
      <section className="py-20 lg:py-28 bg-cream">
        <Container className="max-w-3xl">
          <div className="text-center">
            <h2 className="text-lg font-normal text-sage font-script mb-3">
              The Vision
            </h2>
          </div>

          <blockquote className="text-center">
            <p className="text-xl font-normal leading-relaxed text-charcoal sm:text-2xl font-display">
              &ldquo;A place for man, a place for nature,
              a place for everything and everything in its place. This is Highland Farms.&rdquo;
            </p>
          </blockquote>
        </Container>
      </section>

      {/* The Farm & Animals */}
      <section className="py-20 lg:py-28 bg-warm-white">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl lg:order-1">
              <Image
                src="/images/farm/farm-animals.jpg"
                alt="Guests petting Scottish Highland Cows in the barn at Highland Farms"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>

            <div>
              <p className="text-lg font-normal text-sage font-script mb-3">
                Cultivate &amp; Connect
              </p>
              <h2 className="text-3xl font-normal sm:text-4xl">The Animals</h2>
              <p className="mt-5 text-base text-muted leading-relaxed font-sans">
                Curate an event you won&apos;t forget by incorporating the loving
                animals of Highland Farms. Whether taking photos beside Scottish
                Highland Cows, enjoying the farm amenities, or having your leadership
                team unwind with the farm animals in nature, farm proprietor Connor
                McWilliams and his incredible team help guests get up close to the
                animals that call the farm home.
              </p>
              <p className="mt-4 text-base text-muted leading-relaxed font-sans">
                Our gentle Scottish Highland Cows are the stars, but they share the
                property with Icelandic Sheep, White Peacocks, guardian dogs,
                chickens, and Guinea Fowl. Whether you&apos;re here for a wedding, a farm
                tour, or a weekend stay — the animals are always there to brighten
                your day.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button href="/farm-tours" variant="outline" size="sm">
                  Book a Farm Tour
                </Button>
                <Button href="/nordic-spa" variant="outline" size="sm">
                  Book a Spa Session
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Property Amenities */}
      <section className="py-20 lg:py-28 bg-background">
        <Container>
          <SectionHeading
            eyebrow="The Lay of the Land"
            title="Property Amenities"
          />

          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {amenities.map((amenity) => (
              <div key={amenity.label} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cream">
                  <amenity.icon className="h-6 w-6 text-forest" />
                </div>
                <h3 className="mt-4 text-base font-normal text-charcoal font-sans">
                  {amenity.label}
                </h3>
                <p className="mt-1 text-sm text-muted font-sans">
                  {amenity.description}
                </p>
              </div>
            ))}
          </div>

          {/* Property Map */}
          <div className="mt-16">
            <div className="relative mx-auto max-w-4xl overflow-hidden rounded-xl bg-forest/15 p-6 sm:p-10">
              <Image
                src="/images/farm/property-map.webp"
                alt="Hand-drawn map of Highland Farms showing the lodge, cottage, barn, wedding area, pond, walking paths, pastures, and forest"
                width={1320}
                height={880}
                sizes="(max-width: 1024px) 100vw, 896px"
                className="w-full h-auto"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* Accommodations */}
      <section className="py-20 lg:py-28 bg-cream">
        <Container>
          <SectionHeading
            eyebrow="Stay With Us"
            title="The Accommodations"
            subtitle="Two unique spaces designed for comfort and connection."
          />

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 max-w-3xl mx-auto">
            {[
              {
                name: "William Wallace Lodge",
                tagline: "Relax & Reminisce",
                description:
                  "Our cedar mill lodge is a warm and inviting retreat where scenic meals, fireside conversations, and lasting memories are made.",
                href: "/stay/lodge",
                illustration: "/images/illustrations/lodge-illustration.png",
              },
              {
                name: "Bonnie Lass Cottage",
                tagline: "Retreat & Converse",
                description:
                  "A cozy retreat neighboring our barn pasture where the Scottish Highland Cows greet you in the morning and relax with you in the evenings.",
                href: "/stay/cottage",
                illustration: "/images/illustrations/cottage-illustration.png",
              },
            ].map((acc) => (
              <Link
                key={acc.name}
                href={acc.href}
                className="group block rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex justify-center mb-4">
                  <Image
                    src={acc.illustration}
                    alt=""
                    width={200}
                    height={120}
                    className="h-24 w-auto opacity-70 group-hover:opacity-90 transition-opacity"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-xl font-normal text-charcoal font-display">
                  {acc.name}
                </h3>
                <p className="mt-1 text-sm italic text-sage font-display">
                  {acc.tagline}
                </p>
                <p className="mt-3 text-sm text-muted leading-relaxed font-sans">
                  {acc.description}
                </p>
                <p className="mt-4 text-sm font-light text-forest group-hover:text-forest-light transition-colors font-sans tracking-wide">
                  View &amp; Book &rarr;
                </p>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* The Forest Valley */}
      <section className="py-20 lg:py-28 bg-warm-white">
        <Container className="max-w-3xl text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/images/illustrations/mt-hood-white.png"
              alt=""
              width={320}
              height={160}
              className="h-28 w-auto opacity-60"
              aria-hidden="true"
            />
          </div>
          <p className="text-lg font-normal text-sage font-script mb-3">
            Explore &amp; Engage
          </p>
          <h2 className="text-3xl font-normal sm:text-4xl">
            Experience Mt. Hood Territory
          </h2>
          <p className="mt-5 text-base text-muted leading-relaxed font-sans">
            Brightwood, Oregon, sits in a forested valley midway between Mount Hood
            and the fertile Willamette Valley. Perched on a sloping foothill above
            the confluence of the Sandy and Salmon Rivers, Highland Farms shares the
            same views witnessed by the fur traders and trappers that established
            the infamous Oregon Trail.
          </p>
          <p className="mt-4 text-base text-muted leading-relaxed font-sans">
            Just 50 minutes from Portland and 20 minutes from Mt. Hood, Highland
            Farms is accessible yet feels worlds away from the city. Experience the
            Mount Hood Territory at your doorstep.
          </p>
        </Container>
      </section>

      {/* Property Gallery */}
      <section className="py-20 lg:py-28 bg-background">
        <Container>
          <SectionHeading title="The Property" subtitle="Five enchanted acres where nature and experience meet." />
          <ImageCarousel images={galleryImages} aspectRatio="video" />
        </Container>
      </section>

      <EventCategoryCards />
    </>
  );
}

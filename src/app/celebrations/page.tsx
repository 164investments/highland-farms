import type { Metadata } from "next";
import Image from "next/image";
import { PartyPopper, Heart, Cake, GlassWater, Users, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ContactForm } from "@/components/forms/ContactForm";
import { EventCategoryCards } from "@/components/shared/EventCategoryCards";
import { CONTACT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Celebrations & Events — Highland Farms Oregon",
  description:
    "Host your engagement party, birthday, rehearsal dinner, anniversary, or special celebration at Highland Farms in Brightwood, Oregon. Scottish Highland Cows, forest setting, Nordic spa, and on-site lodging near Portland.",
  alternates: { canonical: "/celebrations" },
  openGraph: {
    title: "Celebrations & Events — Highland Farms Oregon",
    description:
      "Host your engagement party, birthday, rehearsal dinner, or special celebration at Highland Farms in Brightwood, Oregon.",
    images: [
      {
        url: "/images/events/celebrations-hero.jpg",
        width: 1200,
        height: 630,
        alt: "Celebration event at Highland Farms",
      },
    ],
  },
};

const eventTypes = [
  {
    icon: Heart,
    title: "Engagement Parties",
    description: "Celebrate your engagement amongst Scottish Highland Cows and towering trees. Our elegant farm hosts intimate gatherings where loved ones toast to your future in Oregon's most magical setting.",
  },
  {
    icon: Cake,
    title: "Birthday Parties & Mitzvahs",
    description: "Celebrate life's milestones surrounded by Scottish Highland Cows and nature's beauty. Our elegant farm transforms birthdays and mitzvahs into once-in-a-lifetime moments filled with pure joy.",
  },
  {
    icon: GlassWater,
    title: "Rehearsal Dinners",
    description: "Share an unforgettable meal beneath glittering crystal chandeliers in our rustic barn, where our Scottish Highland Cows and graceful White Peacocks make your rehearsal dinner a unique experience.",
  },
  {
    icon: PartyPopper,
    title: "Anniversaries",
    description: "Renew your vows or celebrate a milestone anniversary in the place where nature meets celebration.",
  },
  {
    icon: Sparkles,
    title: "Celebrations of Life",
    description: "Honor a loved one in a peaceful, beautiful setting surrounded by nature as the Scottish Highland Cows lend their quiet presence.",
  },
  {
    icon: Users,
    title: "Retreats & Reunions",
    description: "Family reunions, wellness retreats, corporate off-sites and creative workshops centered around the energy of the farm and its loving animals.",
  },
];

export default function CelebrationsPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden pt-[var(--header-h,120px)]">
        <Image
          src="/images/events/celebrations-hero.jpg"
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
            Gather Together
          </p>
          <h1 className="text-4xl font-normal leading-tight sm:text-5xl md:text-6xl">
            Celebrations
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/85 leading-relaxed font-sans font-light">
            From intimate gatherings to milestone celebrations, our elegant farm
            creates an unforgettable setting where loved ones gather to celebrate
            life&apos;s big moments.
          </p>
          <div className="mt-8">
            <Button href="/contact" size="lg" className="bg-white text-charcoal hover:bg-cream">
              Plan Your Event
            </Button>
          </div>
        </div>
      </section>

      {/* Event Types */}
      <section className="py-20 lg:py-28 bg-background">
        <Container>
          <SectionHeading
            eyebrow="What We Host"
            title="Enchanted Gatherings"
            subtitle="Highland Farms is a fully immersed, all-inclusive forest stage for your celebration."
          />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {eventTypes.map((event) => (
              <div
                key={event.title}
                className="rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cream">
                  <event.icon className="h-5 w-5 text-forest" />
                </div>
                <h3 className="mt-4 text-lg font-normal text-charcoal font-sans">
                  {event.title}
                </h3>
                <p className="mt-2 text-sm text-muted leading-relaxed font-sans">
                  {event.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Inquiry Form */}
      <section className="py-20 lg:py-28 bg-background">
        <Container className="max-w-4xl">
          <SectionHeading
            eyebrow="Plan Your Celebration"
            title="Let's Plan Your Celebration"
            subtitle="Every celebration at Highland Farms is tailored to your dreams. Share your vision with us and we'll make it happen."
          />
          <div className="mx-auto max-w-xl rounded-xl border border-cream-dark bg-white p-6 sm:p-8 shadow-sm">
            <ContactForm
              defaultEventType="celebration"
              heading=""
              subtitle=""
              ctaText="Plan My Event"
            />
          </div>
          <p className="mt-6 text-center text-sm text-muted font-sans">
            Prefer to talk? Call us at{" "}
            <a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`} className="text-forest font-medium hover:text-forest-light transition-colors">
              {CONTACT.phone}
            </a>
          </p>
        </Container>
      </section>

      <EventCategoryCards />
    </>
  );
}

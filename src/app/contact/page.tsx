import type { Metadata } from "next";
import Image from "next/image";
import { Phone, Mail, MapPin, Instagram, Clock } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ContactForm } from "@/components/forms/ContactForm";
import { EventCategoryCards } from "@/components/shared/EventCategoryCards";
import { CONTACT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact Us — Highland Farms Oregon",
  description:
    "Contact Highland Farms for weddings, farm tours, Nordic spa sessions, and farm stays in Brightwood, Oregon. Located 50 minutes from Portland at the base of Mt. Hood. Call (831) 214-2053.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Us — Highland Farms Oregon",
    description:
      "Contact Highland Farms for weddings, farm tours, Nordic spa sessions, and farm stays in Brightwood, Oregon.",
    images: [
      {
        url: "/images/farm/contact-hero.jpg",
        width: 1200,
        height: 630,
        alt: "Highland Farms in Brightwood, Oregon",
      },
    ],
  },
};

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[40vh] items-center justify-center overflow-hidden pt-[var(--header-h,120px)]">
        <Image
          src="/images/farm/contact-hero.jpg"
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/35" />

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center text-white">
          <h1 className="text-4xl font-normal leading-tight sm:text-5xl">
            Get in Touch
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/85 leading-relaxed font-sans font-light">
            We&apos;d love to hear from you. Reach out to start planning your
            Highland Farms experience.
          </p>
        </div>
      </section>

      {/* Contact Info + Form */}
      <section className="py-20 lg:py-28 bg-background">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Left: Contact Info */}
            <div>
              <h2 className="text-2xl font-normal sm:text-3xl">
                Contact Information
              </h2>
              <p className="mt-4 text-base text-muted leading-relaxed font-sans">
                Whether you&apos;re planning a wedding, booking a farm tour, or
                just have a question — we&apos;re here to help.
              </p>

              <div className="mt-8 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cream shrink-0">
                    <Phone className="h-5 w-5 text-forest" />
                  </div>
                  <div>
                    <h3 className="text-sm font-normal text-charcoal font-sans">Phone</h3>
                    <a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`} className="block text-base text-muted hover:text-forest transition-colors font-sans">
                      {CONTACT.phone}
                    </a>
                    <span className="block text-xs text-muted/70 font-sans">Weddings &amp; Events</span>
                    <a href={`tel:${CONTACT.phoneAlt.replace(/[^\d+]/g, "")}`} className="block text-base text-muted hover:text-forest transition-colors font-sans mt-1">
                      {CONTACT.phoneAlt}
                    </a>
                    <span className="block text-xs text-muted/70 font-sans">General Inquiries</span>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cream shrink-0">
                    <Mail className="h-5 w-5 text-forest" />
                  </div>
                  <div>
                    <h3 className="text-sm font-normal text-charcoal font-sans">Email</h3>
                    <a href={`mailto:${CONTACT.email}`} className="block text-base text-muted hover:text-forest transition-colors font-sans">
                      {CONTACT.email}
                    </a>
                    <a href={`mailto:${CONTACT.emailAlt}`} className="block text-base text-muted hover:text-forest transition-colors font-sans">
                      {CONTACT.emailAlt}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cream shrink-0">
                    <MapPin className="h-5 w-5 text-forest" />
                  </div>
                  <div>
                    <h3 className="text-sm font-normal text-charcoal font-sans">Address</h3>
                    <p className="text-base text-muted font-sans">{CONTACT.fullAddress}</p>
                    <p className="text-sm text-muted/80 font-sans mt-1">
                      50 min from Portland &middot; 20 min from Mt. Hood
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cream shrink-0">
                    <Instagram className="h-5 w-5 text-forest" />
                  </div>
                  <div>
                    <h3 className="text-sm font-normal text-charcoal font-sans">Instagram</h3>
                    <a
                      href={CONTACT.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base text-muted hover:text-forest transition-colors font-sans"
                    >
                      {CONTACT.instagramHandle}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cream shrink-0">
                    <Clock className="h-5 w-5 text-forest" />
                  </div>
                  <div>
                    <h3 className="text-sm font-normal text-charcoal font-sans">Response Time</h3>
                    <p className="text-base text-muted font-sans">We typically respond within 24 hours</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Real Inquiry Form */}
            <div className="rounded-xl border border-cream-dark bg-white p-6 sm:p-8 shadow-sm">
              <ContactForm
                heading="Send Us a Message"
                subtitle="Tell us about your event or question and we'll get back to you shortly."
                ctaText="Send Message"
              />
            </div>
          </div>
        </Container>
      </section>

      <EventCategoryCards />
    </>
  );
}

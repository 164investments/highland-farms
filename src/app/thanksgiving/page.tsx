import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Mail } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { FAQAccordion } from "@/components/shared/FAQAccordion";
import { StructuredData } from "@/components/layout/StructuredData";
import { thanksgiving, thanksgivingInquiryHref } from "@/data/thanksgiving";
import { FIVE_STAR_COUNT, GOOGLE_REVIEW_LINK } from "@/lib/reviews";
import styles from "./thanksgiving.module.css";

export const metadata: Metadata = {
  title: "Thanksgiving Stay Package 2026 — Mt. Hood, Oregon",
  description: "Spend November 24–28 at Highland Farms. A four-night Thanksgiving stay with dinner, breakfast, Nordic spa, a farm tour and family photos. Packages for 8 or 20 guests.",
  alternates: { canonical: "/thanksgiving" },
  openGraph: {
    title: thanksgiving.title,
    description: "November 24–28, 2026. Four nights, a farm-to-table Thanksgiving dinner, forest spa and time together at the base of Mt. Hood. Lodge $5,000; whole farm $11,000.",
    url: "https://highlandfarmsoregon.com/thanksgiving",
    type: "website",
    images: [{ url: "/images/thanksgiving/highland-farms-thanksgiving-table.jpg", width: 1536, height: 1024, alt: "Watercolor illustration of a Thanksgiving table in an Oregon cedar forest" }],
  },
  twitter: { card: "summary_large_image", title: thanksgiving.title, description: "A four-night holiday on the farm, November 24–28, 2026.", images: ["/images/thanksgiving/highland-farms-thanksgiving-table.jpg"] },
};

const inquiryClass = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-forest px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-charcoal focus-visible:outline-forest";

export default function ThanksgivingPage() {
  return (
    <div className={styles.page}>
      <StructuredData pathname="/thanksgiving" />
      <section className="bg-forest pt-[calc(var(--header-h,120px)+32px)] pb-12 text-white lg:pb-20 lg:pt-[calc(var(--header-h,120px)+56px)]">
        <Container>
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
            <div>
              <p className="mb-5 text-sm text-white/85">{thanksgiving.dates} <span className="mx-2" aria-hidden>·</span> Four nights</p>
              <h1 className="font-display max-w-xl text-[2.8rem] leading-[1.04] sm:text-6xl lg:text-[4.4rem]">{thanksgiving.title}</h1>
              <p className="mt-6 max-w-md text-base leading-relaxed text-white/90 lg:text-lg">Gather around our table this year. A holiday dinner rooted in the farm, a warm sauna, and four quiet nights with the people you love.</p>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/85">At the base of Mt. Hood in Brightwood, Oregon. All the time together, without hosting the holiday yourself.</p>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <a href="#packages" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-warm-white px-7 py-3 text-sm font-medium text-forest transition-colors hover:bg-cream">See the packages <ArrowUpRight className="h-4 w-4" aria-hidden /></a>
                <span className="text-sm text-white/90">From $5,000 for four nights</span>
              </div>
            </div>
            <figure>
              <Image src="/images/thanksgiving/highland-farms-thanksgiving-table.jpg" alt="Watercolor Thanksgiving table with autumn produce in a cedar forest, with a Highland cow in the distance" width={1536} height={1024} sizes="(max-width: 1024px) 100vw, 55vw" priority fetchPriority="high" className="h-auto w-full rounded-lg" />
              <figcaption className="mt-2 text-right text-xs text-white/75">A Thanksgiving illustration inspired by life on the farm</figcaption>
            </figure>
          </div>
        </Container>
      </section>

      <div className="bg-cream-light py-5">
        <Container className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-center text-sm text-charcoal">
          <span>Four nights at the farm</span><span>Dinner, breakfast &amp; experiences included</span>
          <a href={GOOGLE_REVIEW_LINK} target="_blank" rel="noopener noreferrer" className="underline decoration-forest/40 underline-offset-4 hover:text-forest">{FIVE_STAR_COUNT} five-star Google reviews</a>
        </Container>
      </div>

      <section id="packages" className="scroll-mt-[calc(var(--header-h,120px)+24px)] py-14 lg:py-20">
        <Container>
          <div className="mb-9 max-w-2xl">
            <h2 className="font-display text-4xl sm:text-5xl">Two ways to gather</h2>
            <p className="mt-4 text-base leading-relaxed text-muted">Choose the Lodge for eight or reserve the whole farm for twenty. Both packages include the same Thanksgiving meals and farm experiences.</p>
          </div>
          <div className="grid gap-7 md:grid-cols-2">
            {thanksgiving.packages.map((pkg) => (
              <article key={pkg.id} className="overflow-hidden rounded-xl border border-cream-dark bg-warm-white">
                <div className="relative aspect-[16/9]">
                  <Image src={pkg.image} alt={pkg.alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                </div>
                <div className="flex h-auto flex-col p-6 sm:p-8">
                  <p className="text-sm text-forest">{pkg.accommodation} <span aria-hidden>·</span> Family of {pkg.guests}</p>
                  <h3 className="font-display mt-3 text-3xl sm:text-4xl">{pkg.name}</h3>
                  <p className="mt-4 text-[2.5rem] leading-none font-display text-charcoal">${pkg.price.toLocaleString("en-US")}</p>
                  <p className="mt-2 text-sm text-muted">Four-night package for {pkg.guests} guests</p>
                  <p className="mt-5 min-h-[3.25rem] text-base leading-relaxed text-charcoal">{pkg.description}</p>
                  <a href={thanksgivingInquiryHref(pkg.name, pkg.guests)} className={`${inquiryClass} mt-6`}>Ask about the {pkg.id === "lodge" ? "Lodge" : "whole farm"} <Mail className="h-4 w-4" aria-hidden /></a>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted">Optional upgrades are additional. The team will confirm availability, applicable taxes, payment details and the stay package’s cancellation terms before you book. An inquiry does not reserve the stay.</p>
        </Container>
      </section>

      <section className="bg-cream-light py-14 lg:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <h2 className="font-display text-4xl sm:text-5xl">The holiday,<br />taken care of.</h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-muted">A table worth lingering at. A forest to unwind in. Time to reconnect between the meals and the memories.</p>
              <div className="relative mt-8 aspect-[4/3] overflow-hidden rounded-lg">
                <Image src="/images/farm/cows.jpg" alt="A Highland cow and calf near the barn at Highland Farms" fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" />
              </div>
              <p className="mt-2 text-xs text-muted">Meet the farm’s Highland cows on your guided tour.</p>
            </div>
            <div>
              <p className="mb-6 text-sm font-medium text-forest">Included in both packages</p>
              <ul className="space-y-6">
                {thanksgiving.inclusions.map((item) => (
                  <li key={item.title} className="flex gap-4">
                    <Check className="mt-1 h-5 w-5 shrink-0 text-forest" aria-hidden />
                    <div><h3 className="font-sans text-base font-medium">{item.title}</h3><p className="mt-1 text-base leading-relaxed text-muted">{item.description}</p></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-14 lg:py-20">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
              <Image src="/images/spa/spa-exterior-deck-plunge.jpg" alt="Nordic spa sauna deck and cold plunge among the trees at Highland Farms" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
            </div>
            <div>
              <h2 className="font-display text-4xl sm:text-5xl">A few extra comforts</h2>
              <p className="mt-5 text-base leading-relaxed text-muted">Add a little more to your holiday. Ask about pricing for these optional upgrades when you inquire.</p>
              <ul className="mt-6 space-y-4 text-base text-charcoal">{thanksgiving.upgrades.map((item) => <li key={item} className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-forest" aria-hidden />{item}</li>)}</ul>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-warm-white py-14 lg:py-20">
        <Container className="max-w-3xl">
          <h2 className="font-display mb-7 text-4xl sm:text-5xl">Before you gather</h2>
          <div className="[&_p]:text-base"><FAQAccordion items={[...thanksgiving.faqs]} /></div>
        </Container>
      </section>

      <section id="inquire" className="bg-forest py-14 text-white lg:py-20">
        <Container className="max-w-3xl text-center">
          <p className="text-sm text-white/85">{thanksgiving.dates}</p>
          <h2 className="font-display mt-4 text-4xl sm:text-5xl">Bring your people.<br />We’ll set the table.</h2>
          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-white/90">Tell us how many are coming and which package you have in mind. We’ll help you plan your Thanksgiving on the farm.</p>
          <a href={thanksgivingInquiryHref()} className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-warm-white px-7 py-3 text-sm font-medium text-forest hover:bg-cream">Inquire about Thanksgiving <Mail className="h-4 w-4" aria-hidden /></a>
          <p className="mt-4 text-sm text-white/85">Or email <a className="break-all underline underline-offset-4" href={`mailto:${thanksgiving.email}`}>{thanksgiving.email}</a></p>
          <Link href="/stay" className="mt-7 inline-block text-sm text-white/80 underline underline-offset-4">See the accommodations</Link>
        </Container>
      </section>
    </div>
  );
}

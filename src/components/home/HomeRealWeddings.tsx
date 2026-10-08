import Image from "next/image";
import {
  FieldArrow,
  FieldLink,
  FieldQuoteView,
  FieldSectionHeader,
  Plate,
  fieldMonthYear,
} from "@/components/ui/FieldGuide";
import { cn } from "@/lib/utils";
import { resolveFieldQuote } from "@/components/field/Reviews";
import { weddingPortfolio } from "@/data/wedding-portfolio";
import { HOME_PHOTOGRAPHER_QUOTE } from "./quotes";
import { numberWord } from "./home-data";

/** Confirmed real weddings only (the board's ledger; Jen & Ryan and Hannah & Max are not shown). */
const REAL_SLUGS = ["maya-justin", "olivia-connor", "riley-jordan", "sydney-casey"] as const;

/** Three named thumbs, no frame repeated from the lead; the pasture-fence frame carries the coos. */
const THUMBS = [
  {
    slug: "riley-jordan",
    src: "/images/weddings/riley-jordan/01.jpg",
    alt: "Riley and Jordan at the pasture fence with two Highland cows",
    position: "50% 75%",
    className: undefined as string | undefined,
  },
  {
    slug: "maya-justin",
    src: "/images/weddings/maya-justin/06.jpg",
    alt: "Guests on the patio",
    position: "50% 85%",
    className: undefined,
  },
  {
    slug: "sydney-casey",
    src: "/images/weddings/sydney-casey/06.jpg",
    alt: "Vows inside a ring of flower petals",
    position: "47% 50%",
    className: undefined,
  },
] as const;

const textLinkClass = "border-b border-pine-line pb-0.5 text-[15px] font-medium text-pine";

/**
 * Real weddings (board B8, pick A): the heading, one lead plate (Olivia &
 * Connor's long table), three named thumbs (one shows the coos), the one
 * link to the journal. Then the one wedding review, from a working wedding
 * photographer.
 */
export function HomeRealWeddings() {
  const couples = REAL_SLUGS.flatMap((slug) => {
    const c = weddingPortfolio.find((w) => w.slug === slug);
    return c ? [c] : [];
  });
  const years = new Set(couples.map((c) => c.date?.slice(0, 4)).filter(Boolean));
  const year = years.size === 1 ? [...years][0] : null;
  // "Four of our 2025 couples", as the portfolio says it: a sample, never the year's total.
  const heading = `${numberWord(couples.length)} of our ${year ? `${year} ` : ""}couples`;
  const lead = couples.find((c) => c.slug === "olivia-connor");
  const quote = resolveFieldQuote(HOME_PHOTOGRAPHER_QUOTE, { role: "Wedding" });
  const thumbs = THUMBS.flatMap((t) => {
    const c = couples.find((w) => w.slug === t.slug);
    return c ? [{ ...t, names: c.names }] : [];
  });

  return (
    <section aria-labelledby="real-title" className="px-5 pb-12 lg:px-16 lg:pb-20">
      <div className="mx-auto max-w-[1312px] border-t border-rule pt-8 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:pt-12">
        <FieldSectionHeader
          id="real-title"
          size="md"
          eyebrow="Real weddings"
          title={heading}
          className="lg:col-start-2 lg:row-start-1"
          eyebrowClassName="lg:text-[20px]"
          titleClassName="text-[28px] leading-[1.05] lg:text-[40px]"
        />

        {/* One lead plate (the long table, guests, forest and Lodge in one frame); the plate is the link. */}
        {lead && (
          <FieldLink
            href={`/wedding-portfolio/${lead.slug}`}
            className="mt-4 block lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mt-0"
            aria-label={`${lead.names}, ${lead.date ? fieldMonthYear(lead.date) : ""}`}
          >
            <Plate
              frameClassName="aspect-[16/9] lg:aspect-auto lg:h-[420px]"
              caption={`${lead.names}, ${lead.date ? fieldMonthYear(lead.date) : ""}.`}
            >
              <Image
                src="/images/weddings/olivia-connor/01.jpg"
                alt="Guests raise their glasses along one long table under the trees, with the Lodge behind"
                fill
                sizes="(min-width: 1440px) 520px, (min-width: 1024px) 38vw, calc(100vw - 54px)"
                className="object-cover object-[55%_50%]"
              />
            </Plate>
          </FieldLink>
        )}

        <div className="lg:col-start-2 lg:row-start-2">
          <ul className="m-0 mt-3 grid list-none grid-cols-3 gap-2.5 p-0 lg:mt-7 lg:gap-5">
            {thumbs.map((t) => (
              <li key={t.slug}>
                <FieldLink href={`/wedding-portfolio/${t.slug}`} className="group block">
                  <div className="aspect-square border border-frame bg-paper-light p-1 min-[380px]:aspect-[4/5] lg:p-2">
                    <div className="relative h-full w-full overflow-hidden">
                      <Image
                        src={t.src}
                        alt={t.alt}
                        fill
                        sizes="(min-width: 1024px) 14vw, 30vw"
                        className={cn("object-cover", t.className)}
                        style={{ objectPosition: t.position }}
                      />
                    </div>
                  </div>
                  <span className="mt-1.5 block font-display text-[14px] font-semibold leading-[1.12] text-ink min-[380px]:text-[15px] lg:text-[19px]">
                    {t.names}
                  </span>
                </FieldLink>
              </li>
            ))}
          </ul>
          <FieldLink href="/wedding-portfolio" className="mt-1 inline-flex min-h-11 items-center gap-2 self-start lg:mt-3">
            <span className={textLinkClass}>See every real wedding</span>
            <FieldArrow size={16} className="text-pine" />
          </FieldLink>
        </div>

        {quote && (
          <FieldQuoteView
            {...quote}
            size="lg"
            className="mt-10 border-t border-rule pt-7 lg:col-span-2 lg:row-start-3 lg:mx-auto lg:mt-14 lg:max-w-[900px] lg:pt-10 lg:text-center"
            quoteClassName="text-[23px] lg:text-[34px]"
            metaClassName="mt-3"
          />
        )}
      </div>
    </section>
  );
}

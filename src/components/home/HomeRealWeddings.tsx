import Image from "next/image";
import {
  FieldArrow,
  FieldLink,
  FieldQuoteView,
  FieldSectionHeader,
  Plate,
  fieldMonthYear,
} from "@/components/ui/FieldGuide";
import { resolveFieldQuote } from "@/components/field/Reviews";
import { weddingPortfolio } from "@/data/wedding-portfolio";
import { HOME_PHOTOGRAPHER_QUOTE } from "./quotes";
import { numberWord } from "./home-data";

/** Confirmed real weddings only (the board's ledger; Jen & Ryan and Hannah & Max are not shown). */
const REAL_SLUGS = ["maya-justin", "olivia-connor", "riley-jordan", "sydney-casey"] as const;

const textLinkClass = "border-b border-pine-line pb-0.5 text-[15px] font-medium text-pine";

/**
 * Real weddings: the heading, then the toast plate (it leads its text on
 * phones, as every plate on the page does), then each couple with its month
 * and, where the portfolio data names one, the photographer. Then the one
 * wedding review, from a working wedding photographer.
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
  const sydney = couples.find((c) => c.slug === "sydney-casey");
  const quote = resolveFieldQuote(HOME_PHOTOGRAPHER_QUOTE, { role: "Wedding" });

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

        <Plate
          className="mt-5 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mt-0"
          frameClassName="h-[220px] lg:h-[420px]"
          caption={`${sydney?.names ?? ""}’s toast, ${sydney?.date ? fieldMonthYear(sydney.date) : ""}.`}
        >
          <Image
            src="/images/weddings/sydney-casey/01.jpg"
            alt="Sydney and Casey raise their arms at a long table set with candles and flowers, on the flagstone in the forest"
            fill
            sizes="(min-width: 1440px) 520px, (min-width: 1024px) 38vw, calc(100vw - 54px)"
            className="object-cover object-[55%_45%]"
          />
        </Plate>

        <div className="lg:col-start-2 lg:row-start-2">
          <ul className="m-0 mt-5 flex list-none flex-col border-t border-rule p-0 lg:mt-7">
            {couples.map((c) => (
              <li key={c.slug} className="border-b border-rule">
                <FieldLink
                  href={`/wedding-portfolio/${c.slug}`}
                  className="flex min-h-[60px] flex-col justify-center py-2.5 lg:min-h-[64px] lg:flex-row lg:items-center lg:justify-start lg:gap-5"
                >
                  <span className="flex items-center gap-1.5 font-display text-[21px] font-semibold leading-tight text-ink lg:w-[230px] lg:shrink-0 lg:text-[24px]">
                    {c.names}
                    <FieldArrow size={15} strokeWidth={1.8} className="shrink-0 text-pine" />
                  </span>
                  <span className="font-sans text-[13px] text-ink-body lg:text-[15px]">
                    {[c.date ? fieldMonthYear(c.date) : "", c.photographer ? `Photographs by ${c.photographer.name}` : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </FieldLink>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-col lg:mt-4 lg:flex-row lg:gap-8">
            <FieldLink href="/wedding-portfolio" className="inline-flex min-h-11 items-center gap-2 self-start">
              <span className={textLinkClass}>See every real wedding</span>
              <FieldArrow size={16} className="text-pine" />
            </FieldLink>
            <FieldLink href="/weddings" className="inline-flex min-h-11 items-center gap-2 self-start">
              <span className={textLinkClass}>See how a wedding weekend works</span>
              <FieldArrow size={16} className="text-pine" />
            </FieldLink>
          </div>
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

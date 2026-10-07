import Image from "next/image";
import { cn } from "@/lib/utils";
import { FieldArrow, Plate, fieldCtaClass } from "@/components/ui/FieldGuide";
import { FieldReview } from "@/components/field/Reviews";
import { THANKSGIVING_QUOTE } from "@/lib/review-quotes";
import { packageCtaLabel, perGuest, thanksgiving, thanksgivingInquiryHref } from "@/data/thanksgiving";

const SLEEPS_WORD: Record<number, string> = { 8: "eight", 20: "twenty" };
const labelRow =
  "pt-3 pb-1 font-sans text-[11px] uppercase tracking-[0.14em] text-ink-meta lg:text-[12px]";
const col2 = "border-l border-rule pl-3 lg:pl-5";
/** One real photo per package (Lodge exterior; the Whole Farm from above). Filename trap: properties/cottage.jpg is the Lodge. */
const PKG_PHOTO: Record<string, { src: string; alt: string; caption: string; className: string }> = {
  lodge: {
    src: "/images/properties/cottage.jpg",
    alt: "Cedar-sided William Wallace Lodge with its wrap-around deck",
    caption: "William Wallace Lodge",
    className: "object-[45%_55%]",
  },
  "whole-farm": {
    src: "/images/properties/whole-farm.jpg",
    alt: "The Highland Farms buildings in a clearing among forested hills, seen from above",
    caption: "The farm, from above",
    className: "object-[50%_78%]",
  },
};

function PkgPlate({ id }: { id: string }) {
  const ph = PKG_PHOTO[id];
  if (!ph) return null;
  return (
    <Plate caption={ph.caption} captionClassName="text-[14px] lg:text-[15px]">
      <div className="relative aspect-[16/9] lg:aspect-[4/3]">
        <Image src={ph.src} alt={ph.alt} fill sizes="(min-width: 1024px) 420px, calc(100vw - 56px)" className={cn("object-cover", ph.className)} />
      </div>
    </Plate>
  );
}

const col1 = "pr-3 lg:pr-5";

/**
 * The two packages as one comparison sheet: a real two-column table so each
 * value lines up with its counterpart on a phone. Only the stay and the spa
 * sessions differ; everything else is the shared stack above.
 */
export function PackageCompare() {
  const pkgs = thanksgiving.packages;
  const cell = (i: number) => (i === 0 ? col1 : col2);

  return (
    <section
      id="packages"
      aria-labelledby="tg-packages-title"
      className="scroll-mt-[calc(var(--header-h,60px)+16px)]"
    >
      <div className="mx-auto max-w-[1440px] px-5 lg:px-10 min-[90rem]:px-16">
        <div className="border-t border-rule pb-12 pt-10 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-16 lg:pb-24 lg:pt-20">
          <div className="lg:col-start-1">
            <h2 id="tg-packages-title" className="field-heading m-0 text-[30px] leading-[1.05] text-ink lg:text-[44px]">
              Two ways to gather
            </h2>
            <p className="m-0 mt-3 font-sans text-[15px] leading-[1.55] text-ink-body lg:max-w-[600px] lg:text-[17px]">
              Dinner, breakfast, the farm tour, the photoshoot and your itinerary come with both. Only two
              things change: where you sleep and how much spa time you get.
            </p>

            {/* Phones: the two packages stack full width, same labels in the same order. */}
            <div className="mt-6 flex flex-col gap-8 sm:hidden">
              {pkgs.map((pkg) => (
                <article key={pkg.id} aria-label={pkg.name} className="border-t border-rule pt-4">
                  <PkgPlate id={pkg.id} />
                  <div className="mt-3" />
                  <span className="block font-sans text-[11px] uppercase tracking-[0.14em] text-pine">Sleeps {pkg.sleeps}</span>
                  <h3 className="field-heading m-0 mt-1 text-[26px] leading-[1.05] text-ink">{pkg.name}</h3>
                  <p className="m-0 mt-2 font-display text-[17px] italic leading-[1.3] text-ink-body">{pkg.forWho}</p>
                  <p className="m-0 mt-3 font-display text-[32px] font-semibold leading-none text-ink">
                    ${pkg.price.toLocaleString("en-US")}
                  </p>
                  <p className="m-0 mt-1.5 font-sans text-[12px] leading-[1.4] text-ink-note">
                    for four nights, plus applicable taxes
                  </p>
                  <p className="m-0 mt-1 font-sans text-[12px] leading-[1.4] text-ink-body">
                    About ${perGuest(pkg).toLocaleString("en-US")} a person with all {SLEEPS_WORD[pkg.sleeps] ?? pkg.sleeps}
                  </p>
                  <p className={cn(labelRow, "m-0")}>Where you sleep</p>
                  <p className="m-0 font-sans text-[14px] leading-[1.5] text-ink">{pkg.description}</p>
                  <p className={cn(labelRow, "m-0")}>Nordic spa</p>
                  <p className="m-0 font-sans text-[15px] font-semibold text-ink">{pkg.spa}</p>
                  <a
                    href={thanksgivingInquiryHref(pkg)}
                    data-cta={`tg-${pkg.id}`}
                    className={cn(fieldCtaClass, "mt-4 w-full text-center")}
                  >
                    {packageCtaLabel(pkg)}
                  </a>
                </article>
              ))}
            </div>

            <table className="mt-6 hidden w-full table-fixed sm:table border-collapse text-left lg:mt-8 lg:max-w-[880px]">
              <caption className="sr-only">Compare the two Thanksgiving packages</caption>
              <thead>
                <tr aria-hidden="true">
                  {pkgs.map((pkg, i) => (
                    <td key={pkg.id} className={cn("pb-3 align-top", cell(i))}>
                      <PkgPlate id={pkg.id} />
                    </td>
                  ))}
                </tr>
                <tr>
                  {pkgs.map((pkg, i) => (
                    <th key={pkg.id} scope="col" className={cn("pb-3 align-bottom font-normal", cell(i))}>
                      <span className="block font-sans text-[11px] uppercase tracking-[0.14em] text-pine lg:text-[12px]">
                        Sleeps {pkg.sleeps}
                      </span>
                      <span className="mt-1 block font-display text-[24px] font-semibold leading-[1.05] text-ink max-[359px]:text-[21px] lg:text-[32px]">
                        {pkg.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {pkgs.map((pkg, i) => (
                    <td
                      key={pkg.id}
                      className={cn(
                        "pt-3 align-top font-display text-[16px] italic leading-[1.3] text-ink-body lg:text-[19px]",
                        cell(i),
                      )}
                    >
                      {pkg.forWho}
                    </td>
                  ))}
                </tr>
                <tr>
                  {pkgs.map((pkg, i) => (
                    <td key={pkg.id} className={cn("border-b border-rule pb-4 pt-4 align-top", cell(i))}>
                      <span className="block font-display text-[30px] font-semibold leading-none text-ink lg:text-[38px]">
                        ${pkg.price.toLocaleString("en-US")}
                      </span>
                      <span className="mt-1.5 block font-sans text-[12px] leading-[1.4] text-ink-note lg:text-[13px]">
                        for four nights, plus applicable taxes
                      </span>
                      <span className="mt-1 block font-sans text-[12px] leading-[1.4] text-ink-body lg:text-[13px]">
                        About ${perGuest(pkg).toLocaleString("en-US")} a person with all {SLEEPS_WORD[pkg.sleeps] ?? pkg.sleeps}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr aria-hidden="true">
                  <td colSpan={2} className={labelRow}>
                    Where you sleep
                  </td>
                </tr>
                <tr>
                  {pkgs.map((pkg, i) => (
                    <td
                      key={pkg.id}
                      className={cn(
                        "border-b border-rule pb-3.5 align-top font-sans text-[13px] leading-[1.5] text-ink lg:text-[15px]",
                        cell(i),
                      )}
                    >
                      <span className="sr-only">Where you sleep: </span>
                      {pkg.description}
                    </td>
                  ))}
                </tr>
                <tr aria-hidden="true">
                  <td colSpan={2} className={labelRow}>
                    Nordic spa
                  </td>
                </tr>
                <tr>
                  {pkgs.map((pkg, i) => (
                    <td
                      key={pkg.id}
                      className={cn(
                        "border-b border-rule pb-3.5 font-sans text-[15px] font-semibold text-ink",
                        cell(i),
                      )}
                    >
                      <span className="sr-only">Nordic spa: </span>
                      {pkg.spa}
                    </td>
                  ))}
                </tr>
                <tr data-hero-cta>
                  {pkgs.map((pkg, i) => (
                    <td key={pkg.id} className={cn("pt-4 align-top", cell(i))}>
                      <a
                        href={thanksgivingInquiryHref(pkg)}
                        data-cta={`tg-${pkg.id}`}
                        className={cn(
                          fieldCtaClass,
                          "h-auto min-h-[52px] w-full px-3 py-2.5 text-center text-[14px] leading-tight lg:px-5 lg:text-[15px]",
                        )}
                      >
                        {packageCtaLabel(pkg)}
                        <FieldArrow className="hidden lg:block" />
                      </a>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <FieldReview
            spec={THANKSGIVING_QUOTE}
            role={THANKSGIVING_QUOTE.topic}
            className="mt-8 border-t border-rule pt-5 lg:col-start-2 lg:mt-0 lg:self-center lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
            quoteClassName="text-[19px] lg:text-[24px]"
          />
        </div>
      </div>
    </section>
  );
}

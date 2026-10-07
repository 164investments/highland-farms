import Image from "next/image";
import {
  FieldCatalogue,
  FieldNo,
  FieldQuoteView,
  FieldSection,
  FieldSectionHeader,
  Plate,
  fieldMonthYear,
  type FieldCatalogueItem,
} from "@/components/ui/FieldGuide";
import { resolveFieldQuote } from "@/components/field/Reviews";
import { REVIEWS } from "@/lib/reviews";
import { weddingPortfolio } from "@/data/wedding-portfolio";
import { HOME_COO_QUOTE } from "./quotes";

/** Reviews that name Connor (Connor, Conor, Conner), counted from the snapshot. */
function connorReviewCount(): number {
  return REVIEWS.filter((r) => /\b(connor|conor|conner)\b/i.test(r.text ?? "")).length;
}

function couple(slug: string) {
  const c = weddingPortfolio.find((w) => w.slug === slug);
  return { names: c?.names ?? "", when: c?.date ? fieldMonthYear(c.date) : "" };
}

interface ReasonPhoto {
  src: string;
  alt: string;
  position: string;
  caption: string;
}

function ReasonPlate({ photo }: { photo: ReasonPhoto }) {
  return (
    <Plate frameClassName="h-[226px] lg:h-[400px]" caption={photo.caption}>
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes="(min-width: 1440px) 400px, (min-width: 1024px) 28vw, calc(100vw - 54px)"
        className={`object-cover ${photo.position}`}
      />
    </Plate>
  );
}

/**
 * "Why couples marry here": four numbered reasons in Connor's order (coos,
 * forest, your people, Connor). Reasons 1 to 3 carry a photo of a confirmed
 * real couple, named with the month from the portfolio data. Reason 1 carries
 * the one wedding review that proves the coos are in the photos.
 */
export function HomeReasons() {
  const riley = couple("riley-jordan");
  const maya = couple("maya-justin");
  const sydney = couple("sydney-casey");
  const cooQuote = resolveFieldQuote(HOME_COO_QUOTE, { role: "Wedding" });

  const items: FieldCatalogueItem[] = [
    {
      id: "coos",
      media: (
        <ReasonPlate
          photo={{
            src: "/images/weddings/riley-jordan/04.jpg",
            alt: "A bride and groom at the pasture fence between a black and a white Highland cow",
            position: "object-[50%_62%]",
            caption: `${riley.names} with two of the herd, ${riley.when}.`,
          }}
        />
      ),
      title: "The coos",
      body: "Our Scottish Highland coos are your honorary wedding guests, and they can be in your photos.",
      footer: cooQuote && (
        <FieldQuoteView
          {...cooQuote}
          size="sm"
          className="mt-4 border-t border-rule pt-3.5"
          quoteClassName="lg:text-[20px]"
        />
      ),
    },
    {
      id: "forest",
      media: (
        <ReasonPlate
          photo={{
            src: "/images/weddings/maya-justin/01.jpg",
            alt: "A bride and groom among tall mossy trees and ferns, her train lifting",
            position: "object-[45%_62%] lg:object-[42%_55%]",
            caption: `${maya.names} in the forest, ${maya.when}.`,
          }}
        />
      ),
      title: "The whimsical forest",
      body: "Say your vows under tall firs and moss, on five private acres.",
    },
    {
      id: "people",
      media: (
        <ReasonPlate
          photo={{
            src: "/images/weddings/sydney-casey/04.jpg",
            alt: "A bride hugs her bridesmaids in a cedar-walled bedroom",
            position: "object-[50%_32%] lg:object-[50%_40%]",
            caption: `Getting ready on the farm. ${sydney.names}, ${sydney.when}.`,
          }}
        />
      ),
      title: "Your people stay",
      body: "Up to 125 guests for the day, and up to 20 of your closest people can sleep on the farm.",
    },
  ];

  return (
    <FieldSection
      rule="double"
      pad="none"
      titleId="why-title"
      aria-label="Why couples marry here"
      innerClassName="pt-10 pb-12 lg:pt-20 lg:pb-20"
    >
      <FieldSectionHeader
        id="why-title"
        size="lg"
        eyebrow="Weddings at Highland Farms"
        title="Why couples marry here"
        eyebrowClassName="text-[17px] lg:text-[22px]"
        titleClassName="text-[34px] lg:mt-2 lg:text-[56px]"
      />

      <FieldCatalogue items={items} columns={3} className="mt-7 lg:mt-12" />

      {/* No. 4: Connor. No call link here: the free call sits beside the form (CONSISTENCY #8). */}
      <div className="mt-9 grid grid-cols-[76px_minmax(0,1fr)] gap-x-4 border-t border-rule pt-6 lg:mt-12 lg:grid-cols-[104px_minmax(0,1fr)] lg:items-center lg:gap-x-8 lg:pt-8">
        <div className="self-start border border-frame bg-paper-light p-[5px] lg:p-[7px]">
          <Image
            src="/images/team/connor-mcwilliams.jpg"
            alt="Connor, who owns Highland Farms, smiling outdoors"
            width={192}
            height={192}
            sizes="(min-width: 1024px) 90px, 66px"
            className="block aspect-square h-auto w-full object-cover"
          />
        </div>
        <div>
          <FieldNo n={4} />
          <h3 className="field-heading m-0 mt-0.5 font-display text-[26px] leading-tight text-ink lg:text-[30px]">
            Connor
          </h3>
          <p className="m-0 mt-1.5 font-sans text-[15px] leading-[1.6] text-ink-body lg:max-w-[640px] lg:text-[16px]">
            Connor owns the farm, and your first call is with him. Guests name Connor in{" "}
            {connorReviewCount()} Google reviews.
          </p>
        </div>
      </div>
    </FieldSection>
  );
}

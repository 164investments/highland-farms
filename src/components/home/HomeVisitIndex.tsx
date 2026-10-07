import Image from "next/image";
import {
  FieldArrow,
  FieldDrawing,
  FieldLeader,
  FieldLink,
  FieldNo,
  FieldQuoteView,
  FieldSectionHeader,
  fieldTextLinkClass,
} from "@/components/ui/FieldGuide";
import { cn } from "@/lib/utils";
import { resolveFieldQuote } from "@/components/field/Reviews";
import { TOUR_PARTY_SIZES } from "@/data/farm-tours";
import { properties } from "@/data/properties";
import { BOOKING_PRODUCTS } from "@/lib/booking/products";
import { PRODUCTS, fromPrice } from "@/app/shop/data";
import { HOME_VISIT_QUOTE } from "./quotes";

const linkText = cn(fieldTextLinkClass, "text-[14px] lg:text-[15px]");

function guests(slug: string): number {
  return properties.find((p) => p.slug === slug)?.guests ?? 0;
}

interface VisitDoor {
  id: string;
  name: string;
  price: string;
  href: string;
  image: { src: string; alt: string; position: string };
  blurb: string;
  facts: string;
  cta: string;
}

function buildDoors(): VisitDoor[] {
  const [two, three] = TOUR_PARTY_SIZES;
  const tourFirst = two.total;
  const tourEach = three.total - two.total;
  const spa = BOOKING_PRODUCTS["nordic-spa"];
  const spaPrice = spa.pricePerPersonCents / 100;
  const tour = BOOKING_PRODUCTS["farm-tour"];
  const storeFrom = Math.min(...PRODUCTS.map(fromPrice));
  const whole = guests("whole-farm");
  return [
    {
      id: "tour",
      name: "Farm tour",
      price: `$${tourFirst} for two`,
      href: "/farm-tours",
      image: {
        src: "/images/farm/cow-2.jpg",
        alt: "A guide and two guests pet a Highland calf in the barn",
        position: "object-[50%_62%]",
      },
      blurb: "A private hour with our Scottish Highland cows. Feed them, brush them, pet them, rain or shine.",
      facts: `${tour.durationMin} minutes · ${tour.minParty} to ${tour.maxParty} guests · $${tourEach} each after two`,
      cta: "See the farm tour",
    },
    {
      id: "spa",
      name: "Nordic spa",
      price: `$${spaPrice} per person`,
      href: "/nordic-spa",
      image: {
        src: "/images/spa/spa-2.jpg",
        alt: "The black spa cabin, cedar deck and steel cold plunge under the trees",
        position: "object-[50%_70%] lg:object-[58%_60%]",
      },
      blurb: "Ninety minutes of wood-burning sauna, wet sauna and cold plunge, in the forest.",
      facts: `Up to ${spa.maxParty} a session · ages 16 and up · robes and towels provided`,
      cta: "See the spa",
    },
    {
      id: "stays",
      name: "Farm stays",
      price: `Sleeps ${guests("camp")} to ${whole}`,
      href: "/stay",
      image: {
        // properties/cottage.jpg is the William Wallace Lodge (filename trap).
        src: "/images/properties/cottage.jpg",
        alt: "The William Wallace Lodge, a cedar house with a wraparound deck among the firs",
        position: "object-[40%_60%]",
      },
      blurb: "The William Wallace Lodge, the Bonnie Lass Cottage and the Camp, or the whole farm for your group.",
      facts: `Lodge ${guests("lodge")} · Cottage ${guests("cottage")} · Camp ${guests("camp")} · whole farm ${whole}`,
      cta: "See the stays",
    },
    {
      id: "store",
      name: "Farm store",
      price: `From $${storeFrom}`,
      href: "/shop",
      image: {
        src: "/images/shop/mr-finley-plush.jpg",
        alt: "Mr. Finley, a ginger Highland cow plush with the farm’s leather ear tag",
        position: "object-[50%_50%]",
      },
      blurb: "Highland cow plush, farm tees and eggs from our hens.",
      facts: "Farm pickup or local delivery · we don’t ship",
      cta: "Browse the store",
    },
  ];
}

/**
 * "Visiting the farm": the second door, a numbered index of tour, spa, stays
 * and store with each price on a dotted leader. Numbers come from the booking,
 * property and shop data. The peacock plate is the page's one ornament.
 */
export function HomeVisitIndex() {
  const doors = buildDoors();
  const quote = resolveFieldQuote(HOME_VISIT_QUOTE, { role: "Stay" });
  const whole = guests("whole-farm");

  return (
    <section
      aria-labelledby="visit-title"
      className="border-t-[3px] border-double border-frame px-5 pb-12 pt-10 lg:px-16 lg:pb-20 lg:pt-20"
    >
      <div className="mx-auto max-w-[1312px]">
        <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-x-3 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-x-10">
          <FieldSectionHeader
            id="visit-title"
            size="lg"
            eyebrow="Visiting the farm"
            title={
              <>
                Come for the coos.
                <br />
                Stay for the forest.
              </>
            }
            className="col-span-2 lg:col-span-1 lg:col-start-1 lg:row-start-1"
            eyebrowClassName="text-[17px] lg:text-[22px]"
            titleClassName="text-[34px] lg:mt-2 lg:text-[56px]"
          />
          <p className="col-start-1 row-start-2 m-0 mt-3 max-w-[620px] font-sans text-[15px] leading-[1.6] text-ink-body lg:mt-4 lg:text-[18px]">
            No wedding needed. A private tour, a spa session or a night on the farm, all booked online.
          </p>
          <FieldDrawing
            name="white-peacock"
            className="col-start-2 row-start-2 w-[120px] self-end lg:row-span-2 lg:row-start-1 lg:w-[240px]"
            sizes="(min-width: 1024px) 240px, 120px"
          />
        </div>

        <ol className="m-0 mt-6 grid list-none grid-cols-1 border-t border-rule p-0 lg:mt-12 lg:grid-cols-4 lg:gap-x-8 lg:border-t-0">
          {doors.map((d, i) => (
            <li
              key={d.id}
              className="grid grid-cols-[104px_minmax(0,1fr)] gap-x-4 border-b border-rule py-5 lg:flex lg:flex-col lg:border-b-0 lg:py-0"
            >
              <div className="h-[128px] border border-frame bg-paper-light p-[5px] lg:h-[300px] lg:p-2">
                <div className="relative h-full w-full overflow-hidden">
                  <Image
                    src={d.image.src}
                    alt={d.image.alt}
                    fill
                    sizes="(min-width: 1440px) 300px, (min-width: 1024px) 22vw, 94px"
                    className={`object-cover ${d.image.position}`}
                  />
                </div>
              </div>
              <div className="flex min-w-0 flex-col lg:mt-5">
                <FieldNo n={i + 1} />
                {/* Under 390px the text column is too narrow for name, leader and price on one line
                    (it clipped at 320 and 375), so the price drops under the name and the leader hides. */}
                <p className="m-0 flex flex-wrap items-baseline gap-x-2 min-[390px]:flex-nowrap">
                  <FieldLink
                    href={d.href}
                    className="shrink-0 font-display text-[22px] font-medium leading-tight text-ink lg:text-[26px]"
                  >
                    {d.name}
                  </FieldLink>
                  <FieldLeader className="mb-1 hidden translate-y-[-3px] min-[390px]:block" />
                  <span className="basis-full font-sans text-[13px] font-medium text-pine min-[390px]:shrink-0 min-[390px]:basis-auto lg:text-[14px]">
                    {d.price}
                  </span>
                </p>
                <p className="m-0 mt-1 font-sans text-[14px] leading-[1.5] text-ink-body lg:mt-2 lg:text-[15px]">
                  {d.blurb}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-5 lg:mt-2">
                  <FieldLink href={d.href} className="inline-flex min-h-11 items-center gap-2 self-start">
                    <span className={linkText}>{d.cta}</span>
                    <FieldArrow size={15} className="text-pine" />
                  </FieldLink>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* Visitor proof (quote only; no count on this screen) and the celebrations path. */}
        <div className="mt-7 grid grid-cols-1 gap-6 lg:mt-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16 lg:border-t lg:border-rule lg:pt-10">
          {quote ? (
            <FieldQuoteView
              {...quote}
              size="md"
              quoteClassName="text-[21px] lg:text-[28px]"
              metaClassName="mt-2"
            />
          ) : (
            <div />
          )}
          <div className="lg:border-l lg:border-rule lg:pl-10">
            <p className="m-0 font-display text-[21px] font-medium leading-tight text-ink lg:text-[26px]">
              Hosting a birthday, a retreat or a reunion?
            </p>
            <p className="m-0 mt-1.5 font-sans text-[14px] leading-[1.55] text-ink-body lg:text-[15px]">
              The whole farm takes groups of up to {whole} overnight, and events up to 125.
            </p>
            <FieldLink href="/celebrations" className="mt-1 inline-flex min-h-11 items-center gap-2">
              <span className={linkText}>See celebrations</span>
              <FieldArrow size={15} className="text-pine" />
            </FieldLink>
          </div>
        </div>
      </div>
    </section>
  );
}

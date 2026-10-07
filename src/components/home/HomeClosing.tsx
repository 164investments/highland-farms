import Image from "next/image";
import Link from "next/link";
import { FieldArrow, Plate, fieldTextLinkClass } from "@/components/ui/FieldGuide";

/**
 * Closing: the real carved Highland cow sign, one line and one quiet link to the tours (a heading
 * with no way forward read as a dead end, mobile review r2). No second button: the form is the screen above. The footer carries the address, drive times and
 * directions, so none of that repeats here.
 */
export function HomeClosing() {
  return (
    <section
      aria-labelledby="find-title"
      className="border-t-[3px] border-double border-frame px-5 pb-6 pt-10 lg:px-16 lg:pb-24 lg:pt-20"
    >
      <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center lg:gap-x-16">
        <Plate
          className="lg:order-2"
          frameClassName="h-[226px] lg:h-[440px]"
          caption="The carved Highland cow and the Highland Farms sign."
        >
          <Image
            src="/images/farm/hero.jpg"
            alt="The carved Highland cow on a post above a sign reading Highland Farms, the Lodge behind it in the trees"
            fill
            sizes="(min-width: 1440px) 520px, (min-width: 1024px) 40vw, calc(100vw - 54px)"
            className="object-cover object-[18%_50%] lg:object-[22%_50%]"
          />
        </Plate>
        <div className="mt-7 lg:order-1 lg:mt-0">
          <h2
            id="find-title"
            className="field-heading m-0 font-display text-[34px] leading-[1.02] text-ink lg:mt-2 lg:text-[56px]"
          >
            Bring your people to meet the herd.
          </h2>
          <Link href="/farm-tours" className={`${fieldTextLinkClass} mt-4 inline-flex items-center gap-2`}>
            See farm tours
            <FieldArrow size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

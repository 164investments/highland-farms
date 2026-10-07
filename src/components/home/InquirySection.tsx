import Image from "next/image";
import { ContactForm } from "@/components/forms/ContactForm";
import { FieldSectionHeader, Plate } from "@/components/ui/FieldGuide";
import { WEDDING_FORM_INTRO } from "./home-data";

/**
 * "Check your date": the inline inquiry form, under the same "Now booking
 * 2027" eyebrow as the /weddings form, the target of every home
 * "Check your date" (hero, masthead, closing, sticky bar). The built
 * ContactForm draws the fields (date and guest count first, SMS consent only
 * after a phone is typed), the soft paths and the near-CTA review tier.
 */
export function InquirySection() {
  return (
    <section
      id="check-your-date"
      aria-labelledby="date-title"
      className="scroll-mt-[var(--header-h)] bg-paper-shade px-5 pb-12 pt-10 lg:px-16 lg:pb-24 lg:pt-20"
    >
      <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-16">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+20px)] lg:self-start">
          <FieldSectionHeader
            id="date-title"
            size="lg"
            eyebrow="Now booking 2027"
            title="Check your date"
            intro={WEDDING_FORM_INTRO}
            eyebrowClassName="text-[17px] lg:text-[22px]"
            titleClassName="lg:mt-2 lg:text-[60px]"
            introClassName="lg:mt-5 lg:max-w-[460px] lg:text-[18px]"
          />
          {/* The one true scarcity line, as on /weddings (verified against the 2026 calendar). */}
          <p className="m-0 mt-3 font-sans text-[14px] font-medium leading-snug text-ink-body lg:text-[16px]">
            Every September 2026 Saturday sold out.
          </p>
          <Plate
            className="mt-9 hidden lg:flex"
            frameClassName="h-[420px]"
            caption="Just married, on the flagstone aisle."
          >
            <Image
              src="/images/weddings/ceremony-kiss.jpg"
              alt="A just-married couple kiss on the flagstone aisle as the bridesmaids cheer"
              fill
              sizes="(min-width: 1440px) 520px, 38vw"
              className="object-cover object-[50%_45%]"
            />
          </Plate>
        </div>

        <div className="mt-6 lg:mt-0">
          <ContactForm
            defaultEventType="wedding"
            heading=""
            subtitle=""
            placement="home"
          />
        </div>
      </div>
    </section>
  );
}

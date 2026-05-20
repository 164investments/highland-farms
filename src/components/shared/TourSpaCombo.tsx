import Image from "next/image";
import { Clock, Users } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { BookingButton } from "@/components/shared/BookingButton";
import { BOOKING_LINKS, bookingUrl } from "@/lib/constants";

interface TourSpaComboProps {
  /** UTM content tag, e.g. "farm-tours-combo". */
  utmContent: string;
}

export function TourSpaCombo({ utmContent }: TourSpaComboProps) {
  const spaHref = bookingUrl(BOOKING_LINKS.nordicSpa, utmContent);

  return (
    <section className="py-20 lg:py-28 bg-cream">
      <Container className="max-w-5xl">
        <div className="text-center">
          <p className="text-xs font-normal uppercase tracking-[0.18em] text-sage font-sans">
            Make it a half-day
          </p>
          <h2 className="mt-2 text-3xl font-normal text-charcoal sm:text-4xl">
            Pair your tour with the Nordic Forest Spa
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted leading-relaxed font-sans font-light">
            Many guests book a spa session before or after their farm tour — wood-burning
            sauna, steam, and cold plunge tucked into the forest. Leave at least an hour
            between sessions.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 items-stretch gap-4 md:grid-cols-[1fr_auto_1fr] md:gap-2">
          <article className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="relative aspect-[16/10] w-full">
              <Image
                src="/images/farm/cow-calf.jpg"
                alt="Highland cow on the farm tour"
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
            <div className="p-6">
              <p className="text-xs font-normal uppercase tracking-[0.18em] text-sage font-sans">
                Step one
              </p>
              <h3 className="mt-2 text-xl font-normal text-charcoal font-display">
                Highland Cow Farm Tour
              </h3>
              <ul className="mt-4 space-y-2 text-sm text-muted font-sans">
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-forest" />
                  60-minute private experience
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-forest" />
                  Up to 6 guests · $75 per person
                </li>
              </ul>
            </div>
          </article>

          <div className="flex items-center justify-center py-2 md:px-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl font-light text-forest shadow-sm md:h-14 md:w-14">
              +
            </span>
          </div>

          <article className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="relative aspect-[16/10] w-full">
              <Image
                src="/images/spa/spa-1.jpg"
                alt="Nordic Forest Spa cedar deck and sauna"
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
            <div className="p-6">
              <p className="text-xs font-normal uppercase tracking-[0.18em] text-sage font-sans">
                Step two
              </p>
              <h3 className="mt-2 text-xl font-normal text-charcoal font-display">
                Nordic Forest Spa
              </h3>
              <ul className="mt-4 space-y-2 text-sm text-muted font-sans">
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-forest" />
                  90-minute private session
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-forest" />
                  Dry sauna · steam · cold plunge · $75 per person
                </li>
              </ul>
            </div>
          </article>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <BookingButton
            href={spaHref}
            label="Add a Spa Session"
            size="lg"
            title="Book your spa session"
          />
          <p className="text-xs text-muted font-sans">
            Spa runs Tue / Wed / Fri / Sat / Sun
          </p>
        </div>
      </Container>
    </section>
  );
}

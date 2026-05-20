import { Star } from "lucide-react";
import { Container } from "@/components/ui/Container";

const testimonials = [
  {
    quote:
      "We had our wedding at Highland Farms and I can not recommend them highly enough!! An absolutely stunning and unique venue that surpassed our wildest dreams! Everyone on staff was so kind and helpful, and Connor made every part of the process so simple and seamless!",
    name: "Hannah M.",
    attribution: "Google Review — Wedding",
  },
  {
    quote:
      "The Highland cows were friendly and sweet, and the sheep were so silly and brought a few laughs. We loved walking the property, taking in the peaceful forest setting, and soaking in the hot tub under the stars.",
    name: "Sarah K.",
    attribution: "Google Review — Farm Stay",
  },
];

export function TestimonialSection() {
  return (
    <section className="py-16 lg:py-24 bg-cream">
      <Container className="max-w-4xl">
        <h2 className="sr-only">Guest Reviews</h2>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          {testimonials.map((t) => (
            <div key={t.attribution} className="text-center md:text-left">
              <div className="flex justify-center md:justify-start mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-gold/70 text-gold/70" />
                ))}
              </div>

              <blockquote>
                <p className="text-base font-normal leading-relaxed text-charcoal sm:text-lg font-display">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </blockquote>

              <p className="mt-4 text-sm text-charcoal font-sans font-normal">
                {t.name}
              </p>
              <p className="mt-0.5 text-xs text-muted font-sans font-light">
                {t.attribution}
              </p>
            </div>
          ))}
        </div>

        {/* Google reviews link */}
        <div className="mt-10 text-center">
          <a
            href="https://share.google/jrLOI4AhnpzbPPBpF"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-light text-forest hover:text-forest-light transition-colors font-sans tracking-wide"
          >
            Read all 188+ reviews on Google &rarr;
          </a>
        </div>
      </Container>
    </section>
  );
}

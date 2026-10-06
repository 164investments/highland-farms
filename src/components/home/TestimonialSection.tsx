import { Star } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { featuredQuotes, GOOGLE_REVIEW_LINK, REVIEW_COUNT } from "@/lib/reviews";
import { HOME_QUOTES } from "@/lib/review-quotes";

const testimonials = featuredQuotes(HOME_QUOTES);

export function TestimonialSection() {
  return (
    <section className="py-16 lg:py-24 bg-cream">
      <Container className="max-w-4xl">
        <h2 className="sr-only">Guest Reviews</h2>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          {testimonials.map((t) => (
            <div key={t.name} className="text-center md:text-left">
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
                Google review &middot; {t.topic}
              </p>
            </div>
          ))}
        </div>

        {/* Google reviews link */}
        <div className="mt-10 text-center">
          <a
            href={GOOGLE_REVIEW_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-light text-forest hover:text-forest-light transition-colors font-sans tracking-wide"
          >
            Read all {REVIEW_COUNT} reviews on Google &rarr;
          </a>
        </div>
      </Container>
    </section>
  );
}

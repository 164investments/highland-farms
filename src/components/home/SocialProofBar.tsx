import { Star, Instagram } from "lucide-react";
import { Container } from "@/components/ui/Container";

export function SocialProofBar() {
  return (
    <section className="bg-warm-white py-6 sm:py-5 border-b border-cream-light/50">
      <Container>
        <div className="grid grid-cols-3 gap-3 sm:flex sm:items-center sm:justify-center sm:gap-10">
          {/* Google Rating */}
          <a
            href="https://share.google/jrLOI4AhnpzbPPBpF"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-2.5 text-charcoal/80 hover:text-charcoal transition-colors"
          >
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-gold text-gold" />
              ))}
            </div>
            <span className="text-xs sm:text-sm font-light font-sans text-center sm:text-left">
              <span className="font-normal">4.9</span> on Google
              <span className="hidden sm:inline"> &middot; 188+ reviews</span>
            </span>
          </a>

          <div className="hidden sm:block h-5 w-px bg-charcoal/10" />

          {/* Travel Oregon */}
          <a
            href="https://traveloregon.com/plan-your-trip/places-to-stay/farm-ranch-stays/highland-farms/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-2.5 text-charcoal/80 hover:text-charcoal transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#6B9E3C]" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            <span className="text-xs sm:text-sm font-light font-sans text-center sm:text-left">
              <span className="hidden sm:inline">Featured on </span>Travel Oregon
            </span>
          </a>

          <div className="hidden sm:block h-5 w-px bg-charcoal/10" />

          {/* Instagram */}
          <a
            href="https://www.instagram.com/highlandfarmsor"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-2.5 text-charcoal/80 hover:text-charcoal transition-colors"
          >
            <Instagram className="h-5 w-5 text-charcoal/60" />
            <span className="text-xs sm:text-sm font-light font-sans text-center sm:text-left">
              <span className="font-normal">18K+</span> followers
            </span>
          </a>
        </div>
      </Container>
    </section>
  );
}

import Image from "next/image";
import { Star, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function HeroSection() {
  return (
    <section className="relative flex min-h-dvh items-center justify-center overflow-hidden pt-[var(--header-h,120px)]">
      {/* Background image */}
      <Image
        src="/images/weddings/hannah-max/01.jpg"
        alt="Wedding couple with Highland Cow in the forest at Highland Farms Oregon"
        fill
        priority
        sizes="100vw"
        className="object-cover scale-105"
        quality={85}
      />
      {/* Dreamy overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/15 via-transparent to-black/15" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center text-white">
        {/* Logo mark */}
        <Image
          src="/images/logo/HF-logo-white.png"
          alt=""
          width={72}
          height={42}
          className="mx-auto mb-8 h-10 w-auto opacity-80"
          aria-hidden="true"
        />

        <p className="mb-4 text-xl font-normal text-white/80 font-script">
          Brightwood, Oregon &middot; At the Base of Mt. Hood
        </p>

        <h1 className="text-3xl font-normal leading-snug sm:text-4xl md:text-5xl lg:text-[3.5rem] lg:leading-tight">
          Oregon&apos;s Premier Wedding Venue
        </h1>

        <p className="mx-auto mt-5 max-w-md text-sm text-white/85 leading-relaxed sm:text-base font-sans font-light">
          Intimate, all inclusive, retreat style weddings surrounded by towering
          evergreens, whispering streams, and our beloved Scottish Highland Cows.
        </p>

        {/* Social proof */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-white/75 text-xs font-sans">
          <a
            href="https://share.google/jrLOI4AhnpzbPPBpF"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-white/80 transition-colors"
          >
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-gold text-gold" />
              ))}
            </div>
            <span>4.9 on Google</span>
          </a>
          <span className="hidden sm:inline text-white/40">&middot;</span>
          <a
            href="https://traveloregon.com/plan-your-trip/places-to-stay/farm-ranch-stays/highland-farms/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-white/80 transition-colors"
          >
            Featured on Travel Oregon
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>

        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button href="/weddings" size="lg" className="w-full sm:w-auto bg-white/95 text-charcoal hover:bg-white shadow-lg">
            Begin Your Story
          </Button>
          <Button
            href="#experiences"
            variant="outline"
            size="lg"
            className="w-full sm:w-auto border-white/50 text-white hover:bg-white/10 hover:border-white/70 hover:text-white"
          >
            Explore the Farm
          </Button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-2 animate-[gentle-float_3s_ease-in-out_infinite]">
        <span className="text-[10px] font-light tracking-[0.25em] uppercase text-white/60 font-sans">
          Scroll
        </span>
        <svg
          width="16"
          height="24"
          viewBox="0 0 16 24"
          fill="none"
          className="text-white/60"
          aria-hidden="true"
        >
          <path
            d="M8 0v20M1 15l7 7 7-7"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </section>
  );
}

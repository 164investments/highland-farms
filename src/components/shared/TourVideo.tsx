"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { BookingButton } from "@/components/shared/BookingButton";

interface TourVideoProps {
  videoSrc: string;
  posterSrc: string;
  posterAlt: string;
  eyebrow?: string;
  heading: string;
  body: string;
  bookingHref: string;
  bookingLabel?: string;
  background?: "warm-white" | "cream" | "background";
}

export function TourVideo({
  videoSrc,
  posterSrc,
  posterAlt,
  eyebrow = "From a recent guest",
  heading,
  body,
  bookingHref,
  bookingLabel = "Book Your Tour",
  background = "warm-white",
}: TourVideoProps) {
  const [playing, setPlaying] = useState(false);

  const bgClass =
    background === "cream"
      ? "bg-cream"
      : background === "background"
        ? "bg-background"
        : "bg-warm-white";

  return (
    <section className={`py-14 sm:py-20 lg:py-28 ${bgClass}`}>
      <Container>
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="mx-auto w-full max-w-[340px] lg:max-w-[380px]">
            <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-charcoal shadow-xl">
              {!playing ? (
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  className="group absolute inset-0 cursor-pointer"
                  aria-label="Play farm tour video"
                >
                  <Image
                    src={posterSrc}
                    alt={posterAlt}
                    fill
                    sizes="(max-width: 1024px) 340px, 380px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-charcoal/15 transition-colors group-hover:bg-charcoal/35">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-xl transition-transform group-hover:scale-110">
                      <Play className="ml-1 h-7 w-7 fill-forest text-forest" />
                    </div>
                  </div>
                </button>
              ) : (
                <video
                  src={videoSrc}
                  poster={posterSrc}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 h-full w-full object-cover"
                >
                  Your browser does not support video playback.
                </video>
              )}
            </div>
          </div>

          <div className="text-center lg:text-left">
            <p className="text-xs font-normal uppercase tracking-[0.18em] text-sage font-sans">
              {eyebrow}
            </p>
            <h2 className="mt-2 text-3xl font-normal text-charcoal sm:text-4xl">
              {heading}
            </h2>
            <p className="mx-auto mt-5 max-w-md text-base text-muted leading-relaxed font-sans font-light lg:mx-0">
              {body}
            </p>
            <div className="mt-8">
              <BookingButton
                href={bookingHref}
                label={bookingLabel}
                size="lg"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

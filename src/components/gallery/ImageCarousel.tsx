"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageCarouselProps {
  images: { src: string; alt: string }[];
  className?: string;
  aspectRatio?: "video" | "photo" | "wide";
}

const aspectClasses = {
  video: "aspect-video",
  photo: "aspect-[4/3]",
  wide: "aspect-[21/9]",
};

export function ImageCarousel({ images, className, aspectRatio = "video" }: ImageCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    slidesToScroll: 1,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const frame = requestAnimationFrame(onSelect);
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      cancelAnimationFrame(frame);
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Keyboard navigation
  useEffect(() => {
    if (!emblaApi) return;

    const rootNode = emblaApi.rootNode();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        emblaApi?.scrollPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        emblaApi?.scrollNext();
      }
    }

    rootNode.addEventListener("keydown", handleKeyDown);
    return () => rootNode.removeEventListener("keydown", handleKeyDown);
  }, [emblaApi]);

  return (
    <div
      className={cn("relative group", className)}
      role="region"
      aria-label="Image carousel"
      aria-roledescription="carousel"
    >
      <div
        className="overflow-hidden"
        ref={emblaRef}
        tabIndex={0}
        aria-label="Use left and right arrow keys to navigate"
      >
        <div className="flex">
          {images.map((image, i) => (
            <div
              key={i}
              className="min-w-0 flex-[0_0_85%] pr-3 sm:flex-[0_0_60%] sm:pr-4 lg:flex-[0_0_44%]"
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${i + 1} of ${images.length}`}
            >
              <div className={cn("relative overflow-hidden rounded-xl", aspectClasses[aspectRatio])}>
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 640px) 85vw, (max-width: 1024px) 60vw, 44vw"
                  className="object-cover"
                  priority={i <= 2}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2.5 shadow-md opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-white disabled:opacity-0"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5 text-charcoal" />
          </button>
          <button
            onClick={scrollNext}
            disabled={!canScrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2.5 shadow-md opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-white disabled:opacity-0"
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5 text-charcoal" />
          </button>
        </>
      )}
    </div>
  );
}

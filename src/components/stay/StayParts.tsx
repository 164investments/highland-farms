import Image from "next/image";
import { cn } from "@/lib/utils";
import type { StayPhotoSpec } from "./stay-content";

/** A real photo filling its plate frame. The frame (not the image) sets the size, so nothing shifts. */
export function StayPhoto({
  photo,
  sizes,
  priority = false,
  className,
}: {
  photo: StayPhotoSpec;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={photo.src}
      alt={photo.alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
      style={photo.position ? { objectPosition: photo.position } : undefined}
    />
  );
}

/** The CTA arrow pointing down: "jump to the booking card" and "see the photographs". */
export function FieldArrowDown({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

/** The back arrow in the slug page's "All four stays" link. */
export function FieldArrowBack({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

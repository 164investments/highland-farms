import { Star, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FIVE_STAR_COUNT,
  GOOGLE_REVIEW_LINK,
} from "@/components/shared/GoogleReviewsSection";

/**
 * Official Google "G" logomark — multi-color, used inline as a brand chip.
 * No text wordmark, just the G — keeps the badge tight and recognizable.
 */
function GoogleG({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}

interface StarsProps {
  size?: "sm" | "md" | "lg";
}

function Stars({ size = "md" }: StarsProps) {
  const cls =
    size === "sm" ? "h-3 w-3" : size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <span className="flex items-center gap-0.5" aria-hidden>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={cn(cls, "fill-gold text-gold")}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

interface ReviewBadgeProps {
  /**
   * Visual size.
   * - `card`: full Google-style widget (hero / standalone CTA).
   * - `pill`: compact rounded pill (near-CTA, header strips).
   * - `compact`: small, low-chrome pill (footer, forms, sidebars).
   */
  variant?: "card" | "pill" | "compact";
  className?: string;
}

export function ReviewBadge({
  variant = "pill",
  className,
}: ReviewBadgeProps) {
  if (variant === "card") {
    return (
      <a
        href={GOOGLE_REVIEW_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group inline-flex items-center gap-3 rounded-2xl border border-charcoal/10 bg-white px-4 py-3 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg",
          className,
        )}
        aria-label={`${FIVE_STAR_COUNT} five-star reviews on Google — open in new tab`}
      >
        <GoogleG className="h-7 w-7 shrink-0" />
        <span className="h-9 w-px bg-charcoal/10" aria-hidden />
        <div className="flex flex-col font-sans leading-tight">
          <Stars size="md" />
          <span className="mt-1 text-[0.8125rem] text-charcoal/70">
            <span className="font-semibold text-charcoal">
              {FIVE_STAR_COUNT}
            </span>{" "}
            Five-Star Reviews
          </span>
        </div>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-charcoal/35 transition-colors group-hover:text-charcoal/70" />
      </a>
    );
  }

  if (variant === "pill") {
    return (
      <a
        href={GOOGLE_REVIEW_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white px-3.5 py-1.5 text-sm shadow-sm transition-all hover:shadow-md",
          className,
        )}
        aria-label={`${FIVE_STAR_COUNT} five-star reviews on Google — open in new tab`}
      >
        <GoogleG className="h-4 w-4 shrink-0" />
        <Stars size="sm" />
        <span className="font-sans text-charcoal/80">
          <span className="font-semibold text-charcoal">
            {FIVE_STAR_COUNT}
          </span>{" "}
          Five-Star Reviews
        </span>
      </a>
    );
  }

  // compact — minimal inline link for footer / forms / dense areas;
  // inherits text color from parent so it works on light + dark backgrounds.
  return (
    <a
      href={GOOGLE_REVIEW_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-sans underline-offset-4 transition-opacity hover:underline hover:opacity-90",
        className,
      )}
      aria-label={`${FIVE_STAR_COUNT} five-star reviews on Google — open in new tab`}
    >
      <GoogleG className="h-3 w-3 shrink-0" />
      <Stars size="sm" />
      <span>
        <span className="font-semibold">{FIVE_STAR_COUNT}</span>+ Five-Star
      </span>
    </a>
  );
}

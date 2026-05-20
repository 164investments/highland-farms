import { Star } from "lucide-react";
import { Container } from "@/components/ui/Container";
import googleReviews from "@/data/google-reviews.json";

export const GOOGLE_REVIEW_LINK = "https://share.google/jrLOI4AhnpzbPPBpF";
export const REVIEW_COUNT = googleReviews.user_rating_count;
export const REVIEW_RATING = googleReviews.rating;
export const FIVE_STAR_COUNT = googleReviews.reviews.filter(
  (r) => r.rating === 5,
).length;

type Review = (typeof googleReviews.reviews)[number];

type Topic = "all" | "spa" | "tour" | "wedding" | "stay";

const TOPIC_PATTERNS: Record<Topic, RegExp | null> = {
  all: null,
  spa: /\b(spa|sauna|steam|cold plunge|hot tub|wellness|soak|massage|cedar)\b/i,
  tour: /\b(tour|cow|cows|highland cow|barn|sheep|peacock|brush|animals|cuddle|cuddling|guide|dante|ellery|jace|aj|jalene|connor)\b/i,
  wedding: /\b(wedding|wed|ceremony|reception|venue|bride|groom|bridal|groomsmen|elope|elopement|aisle)\b/i,
  stay: /\b(stay|stayed|staying|cottage|airstream|lodge|cabin|night|nights|overnight|getaway|accommodations?)\b/i,
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return cut.slice(0, lastSpace > max - 30 ? lastSpace : max).trim() + "…";
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffMs = Date.now() - then;
  const days = Math.floor(diffMs / 86_400_000);
  if (days < 7) return days <= 1 ? "this week" : `${days} days ago`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return w === 1 ? "1 week ago" : `${w} weeks ago`;
  }
  if (days < 365) {
    const m = Math.floor(days / 30);
    return m === 1 ? "1 month ago" : `${m} months ago`;
  }
  const y = Math.floor(days / 365);
  return y === 1 ? "1 year ago" : `${y} years ago`;
}

export function filterReviews(topic: Topic, max: number): Review[] {
  const pattern = TOPIC_PATTERNS[topic];
  const candidates = googleReviews.reviews.filter((r) => {
    if (r.rating < 4) return false;
    if (!r.text || r.text.length < 60) return false;
    return pattern ? pattern.test(r.text) : true;
  });
  candidates.sort((a, b) => {
    const at = a.publish_time ? new Date(a.publish_time).getTime() : 0;
    const bt = b.publish_time ? new Date(b.publish_time).getTime() : 0;
    return bt - at;
  });
  return candidates.slice(0, max);
}

interface Props {
  /** Filter reviews to those mentioning a topic. Defaults to all. */
  topic?: Topic;
  /** Maximum number of review cards to render. Defaults to 6. */
  max?: number;
  /** Section eyebrow text. */
  eyebrow?: string;
  /** Section heading. Defaults to "{FIVE_STAR_COUNT} five-star reviews on Google". */
  heading?: string;
  /** Section background — match the surrounding page. */
  background?: "cream" | "background" | "white";
  /** Truncate long review text to this many characters. Defaults to 240. */
  truncateAt?: number;
}

export function GoogleReviewsSection({
  topic = "all",
  max = 6,
  eyebrow = "What guests are saying",
  heading,
  background = "cream",
  truncateAt = 240,
}: Props) {
  const reviews = filterReviews(topic, max);
  if (reviews.length === 0) return null;

  const bgClass =
    background === "cream"
      ? "bg-cream/50"
      : background === "white"
        ? "bg-white"
        : "bg-background";

  const title =
    heading ?? `${FIVE_STAR_COUNT} five-star reviews on Google`;

  return (
    <section
      className={`border-y border-cream-dark/40 py-14 lg:py-20 ${bgClass}`}
    >
      <Container>
        <div className="mb-8 flex flex-col items-start justify-between gap-3 sm:mb-10 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-normal uppercase tracking-[0.18em] text-sage sm:text-[0.8125rem]">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-[1.75rem] font-light leading-tight tracking-tight sm:text-[2rem]">
              {title}
            </h2>
          </div>
          <a
            href={GOOGLE_REVIEW_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-normal text-forest underline-offset-4 hover:underline font-sans"
          >
            Read all {REVIEW_COUNT} reviews →
          </a>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r: Review, i: number) => (
            <article
              key={i}
              className="flex flex-col rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-0.5">
                {[...Array(5)].map((_, k) => (
                  <Star
                    key={k}
                    className={`h-4 w-4 ${
                      k < r.rating
                        ? "fill-forest text-forest"
                        : "text-cream-dark"
                    }`}
                  />
                ))}
              </div>
              <blockquote className="flex-1 text-[0.9375rem] leading-relaxed text-charcoal font-sans">
                &ldquo;{truncate(r.text, truncateAt)}&rdquo;
              </blockquote>
              <div className="mt-4 flex items-center gap-3 border-t border-cream-dark/40 pt-4">
                {r.author_photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={r.author_photo}
                    alt={r.author_name ?? ""}
                    width={36}
                    height={36}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cream text-sm font-medium text-forest">
                    {(r.author_name ?? "?").charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-normal text-charcoal font-sans">
                    {r.author_name}
                  </p>
                  <p className="text-xs text-muted font-sans">
                    {r.relative_time || relativeTime(r.publish_time)} · Google
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}

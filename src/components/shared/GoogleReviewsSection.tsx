import { Star } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { splitSentences } from "@/lib/review-quotes";
import {
  FIVE_STAR_COUNT,
  GOOGLE_REVIEW_LINK,
  REVIEW_COUNT,
  REVIEWS,
  type Review,
} from "@/lib/reviews";

// Re-exported for the existing import sites; @/lib/reviews is the source of truth.
export {
  FIVE_STAR_COUNT,
  GOOGLE_REVIEW_LINK,
  REVIEW_COUNT,
  REVIEW_RATING,
} from "@/lib/reviews";

type Topic = "all" | "spa" | "tour" | "wedding" | "stay";

const TOPIC_PATTERNS: Record<Topic, RegExp | null> = {
  all: null,
  spa: /\b(spa|sauna|steam|cold plunge|hot tub|wellness|soak|massage|cedar)\b/i,
  tour: /\b(tour|cow|cows|highland cow|barn|sheep|peacock|brush|animals|cuddle|cuddling|guide|dante|ellery|jace|aj|jalene|connor)\b/i,
  wedding: /\b(wedding|wed|ceremony|reception|venue|bride|groom|bridal|groomsmen|elope|elopement|aisle)\b/i,
  stay: /\b(stay|stayed|staying|cottage|airstream|lodge|cabin|night|nights|overnight|getaway|accommodations?)\b/i,
};

/**
 * Visible excerpt for a card. Whole sentences, in order, never stitched. When a
 * topic pattern is given the excerpt always contains the sentence that matched,
 * so the card the visitor reads is actually on-topic.
 */
function excerpt(text: string, max: number, pattern: RegExp | null): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const sentences = splitSentences(text);
  let out = "";
  for (const s of sentences) {
    const next = out ? `${out} ${s}` : s;
    if (next.length > max) break;
    out = next;
  }
  const hitIdx = pattern ? sentences.findIndex((s) => pattern.test(s)) : -1;
  if (pattern && (!out || !pattern.test(out)) && hitIdx >= 0) {
    // Lead with the matching sentence (and what follows) instead.
    let n = 0;
    out = "";
    for (const s of sentences.slice(hitIdx)) {
      const next = out ? `${out} ${s}` : s;
      if (next.length > max) break;
      out = next;
      n++;
    }
    if (!out) return "";
    const lead = hitIdx > 0 ? "\u2026 " : "";
    const tail = hitIdx + n < sentences.length ? " \u2026" : "";
    return `${lead}${out}${tail}`;
  }
  if (!out) {
    const cut = flat.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    return cut.slice(0, lastSpace > max - 30 ? lastSpace : max).trim() + "\u2026";
  }
  return `${out} \u2026`;
}

function monthYear(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function filterReviews(topic: Topic, max: number, truncateAt = 240): Review[] {
  const pattern = TOPIC_PATTERNS[topic];
  const candidates = REVIEWS.filter((r) => {
    if (r.rating < 4) return false;
    if (!r.text || r.text.length < 60) return false;
    // Judge the text the visitor will actually see, not the hidden full review.
    return pattern ? pattern.test(excerpt(r.text, truncateAt, pattern)) : true;
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
  const reviews = filterReviews(topic, max, truncateAt);
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
                &ldquo;{excerpt(r.text, truncateAt, TOPIC_PATTERNS[topic])}&rdquo;
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
                    {monthYear(r.publish_time)} · Google
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

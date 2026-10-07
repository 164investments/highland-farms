"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { inquirySchema, type InquiryFormData } from "@/lib/schemas";
import { BOOKING_LINKS, CONTACT, bookingUrl } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getClientAttribution } from "@/lib/attribution";
import { nativeCalendarEnabled } from "@/lib/booking/flag";
import {
  EVENT_TYPES,
  MONTH_OPTIONS,
  REFERRAL_SOURCES,
  buildFormSubmissionPush,
  encodePreferredDate,
  eventYearOptions,
  formatPreferredDate,
  guestBandsFor,
  isWeddingForm,
  parsePreferredDate,
  splitName,
  weddingCallHref,
} from "@/lib/inquiry-mapping";
import {
  FieldArrow,
  FieldStars,
  fieldCtaClass,
  fieldTextLinkClass,
} from "@/components/ui/FieldGuide";
import {
  CheckboxRow,
  FieldError,
  FieldLabel,
  SelectInput,
  TextArea,
  TextInput,
  describedBy,
  fieldErrorText,
} from "./fields";
import { InquirySuccess } from "./InquirySuccess";
import { TurnstileWidget } from "./TurnstileWidget";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim();

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    /** Set by gtm.js once a container has loaded. */
    google_tag_manager?: Record<string, unknown>;
  }
}

export interface InquiryFormProps {
  /** Presets and hides Event Type ("wedding", "celebration", ...). */
  defaultEventType?: string;
  className?: string;
  /** Form header. Default "Check your date"; "" hides it (the page draws its own). */
  heading?: string;
  /** Line under the header. Default depends on wedding or event; "" hides it. */
  subtitle?: string;
  /** Five stars and the five-star count under the button. */
  showTrustSignals?: boolean;
  /** Submit label. Default "Check my date". */
  ctaText?: string;
  /** Wedding types only: the free call with Connor and the look book under the button. Default true. */
  showSoftPaths?: boolean;
  /** utm_content tag for the call links, e.g. "weddings". Default: the page path. */
  placement?: string;
  /** From the server wrapper (FIVE_STAR_COUNT), so the review JSON stays off the client. */
  fiveStarCount?: number;
}

interface Submitted {
  firstName: string;
  email: string;
  dateText: string;
  flexible: boolean;
  wedding: boolean;
  callHref?: string;
}

function newSubmitId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function placementTag(placement?: string): string {
  if (placement) return placement;
  if (typeof window === "undefined") return "site";
  const path = window.location.pathname.replace(/^\/+|\/+$/g, "").replace(/\//g, "-");
  return path || "home";
}

/** Acuity call link (or the native page once the calendar flag flips), prefilled when we know who's asking. */
function callLink(content: string, who: { name?: string; email?: string; phone?: string }): string {
  if (nativeCalendarEnabled()) return "/wedding-call";
  return weddingCallHref(bookingUrl(BOOKING_LINKS.weddingCall, content), who);
}

/** Same dataLayer event the booking CTAs use, typed as the wedding call. */
function trackCallStart(href: string, title: string) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "booking_start",
    booking_type: "wedding_call",
    booking_url: href,
    booking_title: title,
  });
}

export function InquiryForm({
  defaultEventType = "",
  className,
  heading = "Check your date",
  subtitle,
  showTrustSignals = true,
  ctaText = "Check my date",
  showSoftPaths = true,
  placement,
  fiveStarCount,
}: InquiryFormProps) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const errId = (name: string) => `${uid}-${name}-error`;

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const serverErrorRef = useRef<HTMLDivElement>(null);
  const [years] = useState(() => eventYearOptions());

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm<InquiryFormData>({
    resolver: zodResolver(inquirySchema),
    // Validate a field when the visitor leaves it, then live as they fix it.
    mode: "onTouched",
    shouldFocusError: true,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      event_type: defaultEventType,
      guest_count: "",
      event_month: "",
      event_year: "",
      date_flexible: false,
      referral_source: "",
      message: "",
      website: "",
      turnstile_token: "",
      consent_marketing_sms: false,
      consent_appointment_sms: false,
      _t: Date.now(),
      // Shared by the dataLayer push and the server's GA4 events (traceability).
      _sid: newSubmitId(),
    },
  });

  const eventType = useWatch({ control, name: "event_type" });
  const guestCount = useWatch({ control, name: "guest_count" });
  const turnstileToken = useWatch({ control, name: "turnstile_token" });
  // SMS consent only means something with a phone number, so the two boxes
  // appear once one is typed (fewer fields for everyone who skips phone).
  const phoneValue = useWatch({ control, name: "phone" });
  const hasPhone = (phoneValue ?? "").replace(/\D/g, "").length > 0;
  useEffect(() => {
    if (!hasPhone) {
      setValue("consent_appointment_sms", false);
      setValue("consent_marketing_sms", false);
    }
  }, [hasPhone, setValue]);
  const wedding = isWeddingForm(eventType);
  const bands = guestBandsFor(eventType);
  const presetType = !!defaultEventType;
  const turnstileReady = !TURNSTILE_SITE_KEY || !!turnstileToken;

  // Wedding and event bands differ: drop a band the new event type doesn't offer.
  useEffect(() => {
    if (guestCount && !bands.some((b) => b.value === guestCount)) {
      setValue("guest_count", "", { shouldValidate: false });
    }
  }, [bands, guestCount, setValue]);

  const handleVerify = useCallback(
    (token: string) => setValue("turnstile_token", token, { shouldValidate: false }),
    [setValue],
  );
  const handleExpire = useCallback(
    () => setValue("turnstile_token", "", { shouldValidate: false }),
    [setValue],
  );

  async function onSubmit(data: InquiryFormData) {
    setStatus("submitting");
    setServerError("");

    // GTM tag 146 sends the browser's generate_lead from the dataLayer push
    // below; tell the server so it doesn't send a second one.
    const gtmLoaded = !!(GTM_ID && typeof window !== "undefined" && window.google_tag_manager?.[GTM_ID]);

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, _gtm: gtmLoaded, attribution: getClientAttribution() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(typeof body?.error === "string" ? body.error : "");
      }

      const stored = encodePreferredDate(data);
      const parsed = parsePreferredDate(stored);
      const isWedding = isWeddingForm(data.event_type);
      setSubmitted({
        firstName: splitName(data.name).first,
        email: data.email,
        dateText: parsed?.year ? formatPreferredDate(stored).replace(/, flexible$/, "") : "",
        flexible: !!data.date_flexible,
        wedding: isWedding,
        callHref: isWedding
          ? callLink(`wedding-form-success-${placementTag(placement)}`, data)
          : undefined,
      });
      setStatus("success");

      // Conversion push for GTM: Ads "Book Your Wedding", enhanced conversions,
      // Meta Pixel Lead and GA4 generate_lead all key off this event.
      if (typeof window !== "undefined" && window.dataLayer) {
        window.dataLayer.push(buildFormSubmissionPush(data));
      }
    } catch (err) {
      // Keep every answer on screen; only the Turnstile token is spent.
      setStatus("error");
      setServerError(err instanceof Error ? err.message : "");
      setTurnstileReset((n) => n + 1);
      requestAnimationFrame(() => serverErrorRef.current?.focus());
    }
  }

  if (status === "success" && submitted) {
    return (
      <InquirySuccess
        className={className}
        {...submitted}
        onCallClick={
          submitted.callHref
            ? () => trackCallStart(submitted.callHref!, "Wedding call (inquiry success)")
            : undefined
        }
      />
    );
  }

  const intro =
    subtitle ??
    (wedding
      ? "Tell us your month and guest count, and we'll check the farm calendar for you. No commitment."
      : "Tell us what you're planning, and we'll write back. No commitment.");

  const submitting = status === "submitting";

  return (
    <div className={className}>
      {heading && (
        <div className="mb-7">
          <h3 className="field-heading font-display text-[32px] leading-[1.05] text-ink sm:text-[38px]">
            {heading}
          </h3>
          {intro && (
            <p className="mt-2 font-sans text-[15px] leading-relaxed text-ink-body">{intro}</p>
          )}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-busy={submitting || undefined}
        className="flex flex-col gap-5"
      >
        {presetType ? (
          <input type="hidden" {...register("event_type")} />
        ) : (
          <div>
            <FieldLabel htmlFor={id("event-type")} required>
              Event type
            </FieldLabel>
            <SelectInput
              id={id("event-type")}
              aria-required="true"
              aria-describedby={describedBy(errors.event_type && errId("event-type"))}
              invalid={!!errors.event_type}
              placeholder="Choose an event type"
              options={EVENT_TYPES}
              {...register("event_type")}
            />
            <FieldError id={errId("event-type")} message={errors.event_type?.message} />
          </div>
        )}

        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="mb-1.5 block p-0 font-sans text-[14px] font-medium leading-snug text-ink">
            {wedding ? "Wedding date" : "Event date"}
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={id("month")} className="sr-only">
                Month
              </label>
              <SelectInput
                id={id("month")}
                aria-describedby={describedBy(errors.event_month && errId("month"))}
                invalid={!!errors.event_month}
                placeholder="Month"
                options={MONTH_OPTIONS}
                {...register("event_month")}
              />
            </div>
            <div>
              <label htmlFor={id("year")} className="sr-only">
                Year
              </label>
              <SelectInput
                id={id("year")}
                aria-describedby={describedBy(errors.event_year && errId("year"))}
                invalid={!!errors.event_year}
                placeholder="Year"
                options={years.map((y) => ({ value: y, label: y }))}
                {...register("event_year")}
              />
            </div>
          </div>
          <FieldError id={errId("month")} message={errors.event_month?.message} />
          <FieldError id={errId("year")} message={errors.event_year?.message} />
          <CheckboxRow id={id("flexible")} className="mt-1" {...register("date_flexible")}>
            We&apos;re flexible
          </CheckboxRow>
        </fieldset>

        <div>
          <FieldLabel htmlFor={id("guests")}>Guest count</FieldLabel>
          <SelectInput
            id={id("guests")}
            aria-describedby={describedBy(errors.guest_count && errId("guests"))}
            invalid={!!errors.guest_count}
            placeholder="Choose a range"
            options={bands}
            {...register("guest_count")}
          />
          <FieldError id={errId("guests")} message={errors.guest_count?.message} />
        </div>

        <div>
          <FieldLabel htmlFor={id("name")} required>
            {wedding ? "Your names" : "Your name"}
          </FieldLabel>
          <TextInput
            id={id("name")}
            type="text"
            autoComplete="name"
            aria-required="true"
            aria-describedby={describedBy(errors.name && errId("name"))}
            invalid={!!errors.name}
            placeholder={wedding ? "Jane and Sam Smith" : "First and last name"}
            {...register("name")}
          />
          <FieldError id={errId("name")} message={errors.name?.message} />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor={id("email")} required>
              Email
            </FieldLabel>
            <TextInput
              id={id("email")}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              aria-required="true"
              aria-describedby={describedBy(errors.email && errId("email"))}
              invalid={!!errors.email}
              placeholder="you@example.com"
              {...register("email")}
            />
            <FieldError id={errId("email")} message={errors.email?.message} />
          </div>
          <div>
            <FieldLabel htmlFor={id("phone")} optional>
              Phone
            </FieldLabel>
            <TextInput
              id={id("phone")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              aria-describedby={describedBy(errors.phone && errId("phone"))}
              invalid={!!errors.phone}
              placeholder="(555) 123-4567"
              {...register("phone")}
            />
            <FieldError id={errId("phone")} message={errors.phone?.message} />
          </div>
        </div>

        <div>
          <FieldLabel htmlFor={id("message")} optional>
            {wedding ? "Tell us about your day" : "Tell us about your event"}
          </FieldLabel>
          <TextArea
            id={id("message")}
            rows={4}
            aria-describedby={describedBy(errors.message && errId("message"))}
            invalid={!!errors.message}
            placeholder={
              wedding
                ? "The feel you want, the season, anything you're wondering about."
                : "What you're planning, and anything you're wondering about."
            }
            {...register("message")}
          />
          <FieldError id={errId("message")} message={errors.message?.message} />
        </div>

        <div>
          <FieldLabel htmlFor={id("referral")} optional>
            How did you hear about us?
          </FieldLabel>
          <SelectInput
            id={id("referral")}
            aria-describedby={describedBy(errors.referral_source && errId("referral"))}
            invalid={!!errors.referral_source}
            placeholder="Choose one"
            options={REFERRAL_SOURCES}
            {...register("referral_source")}
          />
          <FieldError id={errId("referral")} message={errors.referral_source?.message} />
        </div>

        {/* Honeypot: hidden from people, filled by bots. */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor={id("website")}>Website</label>
          <input type="text" id={id("website")} autoComplete="off" tabIndex={-1} {...register("website")} />
        </div>
        <input type="hidden" {...register("_t", { valueAsNumber: true })} />
        <input type="hidden" {...register("_sid")} />
        <input type="hidden" {...register("turnstile_token")} />

        {/* SMS consent: two separate, unticked, optional boxes (A2P). */}
        <div className="border-t border-rule pt-3">
          {hasPhone && (
            <>
              <CheckboxRow id={id("consent-appointment-sms")} fine {...register("consent_appointment_sms")}>
                I consent to receive non-marketing text messages from Highland Farms Oregon LLC about
                appointment information - confirmation &amp; reminder messages. Message and data rates may
                apply.
              </CheckboxRow>
              <CheckboxRow id={id("consent-marketing-sms")} fine {...register("consent_marketing_sms")}>
                I consent to receive marketing text messages from Highland Farms Oregon LLC at the phone
                number provided. Frequency may vary. Message and data rates may apply. Text HELP for
                assistance. Reply STOP to opt out. Consent is not a condition of purchase.
              </CheckboxRow>
            </>
          )}
          <p className="mt-1 font-sans text-[13px] leading-relaxed text-ink-note">
            By sending this form, you agree to our{" "}
            <a href="/privacy" className="text-pine underline underline-offset-2">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="/terms" className="text-pine underline underline-offset-2">
              Terms of Service
            </a>
            .
          </p>
        </div>

        {TURNSTILE_SITE_KEY && (
          <TurnstileWidget
            siteKey={TURNSTILE_SITE_KEY}
            onVerify={handleVerify}
            onExpire={handleExpire}
            action="contact-form"
            resetSignal={turnstileReset}
          />
        )}

        {status === "error" && (
          <div
            ref={serverErrorRef}
            tabIndex={-1}
            role="alert"
            className={cn(
              "border border-l-[3px] border-[#8A2A1C] bg-paper-light px-4 py-3 font-sans text-[14px] leading-relaxed outline-none",
              fieldErrorText,
            )}
          >
            {serverError || "That didn't go through."} Your answers are still here, so you can try
            again, or call us at{" "}
            <a
              href={`tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`}
              className="font-medium underline underline-offset-2"
            >
              {CONTACT.phone}
            </a>
            .
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !turnstileReady}
          className={cn(fieldCtaClass, "w-full disabled:cursor-not-allowed disabled:opacity-60")}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Sending
            </>
          ) : !turnstileReady ? (
            "One moment"
          ) : (
            <>
              {ctaText}
              <FieldArrow />
            </>
          )}
        </button>

        {wedding && showSoftPaths && (
          <div className="-mt-1 flex flex-col gap-x-7 sm:flex-row sm:flex-wrap">
            <a
              // Render-time href must not read window (hydration); onClick refines it.
              href={callLink(`wedding-form-${placement ?? "inquiry"}`, {})}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center"
              onClick={(e) => {
                // Prefill whatever they've typed so far; the form stays as it is in this tab.
                const v = getValues();
                const href = callLink(`wedding-form-${placementTag(placement)}`, {
                  name: v.name,
                  email: v.email,
                  phone: v.phone,
                });
                e.currentTarget.href = href;
                trackCallStart(href, "Wedding call (inquiry form)");
              }}
            >
              <span className={fieldTextLinkClass}>Or book a free 45-minute call with Connor</span>
            </a>
            <a
              href="/lookbook.pdf"
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-[44px] items-center"
            >
              <span className={fieldTextLinkClass}>See the 2027 look book</span>
            </a>
          </div>
        )}

        {showTrustSignals && typeof fiveStarCount === "number" && fiveStarCount > 0 && (
          <p className="flex items-center gap-2 font-sans text-[13px] text-ink-note">
            <FieldStars size={13} />
            {fiveStarCount} five-star reviews on Google
          </p>
        )}
      </form>
    </div>
  );
}

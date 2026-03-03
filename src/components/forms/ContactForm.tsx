"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, AlertCircle, Loader2, Star, Phone } from "lucide-react";
import { inquirySchema, type InquiryFormData } from "@/lib/schemas";
import { CONTACT } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ContactFormProps {
  defaultEventType?: string;
  className?: string;
  heading?: string;
  subtitle?: string;
  showTrustSignals?: boolean;
  ctaText?: string;
}

const inputClasses =
  "w-full rounded-lg border bg-white px-4 py-3 text-base font-sans text-charcoal placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-colors";
const inputErrorClasses =
  "border-red-300 focus:border-red-500 focus:ring-red-500/30";
const inputDefaultClasses = "border-cream-dark";
const labelClasses =
  "block text-sm font-normal text-charcoal mb-1.5 font-sans";

export function ContactForm({
  defaultEventType = "",
  className,
  heading = "Get Your Custom Quote",
  subtitle = "Tell us about your vision and we'll create a personalized package.",
  showTrustSignals = true,
  ctaText = "Get Your Custom Quote",
}: ContactFormProps) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InquiryFormData>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      event_type: defaultEventType,
      website: "",
      _t: Date.now(),
    },
  });

  async function onSubmit(data: InquiryFormData) {
    setStatus("submitting");
    setServerError("");

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Submission failed");
      }

      setStatus("success");
      reset();

      // Push conversion event to GTM dataLayer (email included for enhanced conversions)
      if (typeof window !== "undefined" && window.dataLayer) {
        window.dataLayer.push({
          event: "form_submission",
          form_name: "event_inquiry",
          event_type: data.event_type,
          email: data.email,
          ...(data.phone && { phone: data.phone }),
        });
      }
    } catch (err) {
      setStatus("error");
      setServerError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "success") {
    return (
      <div className={cn("rounded-xl bg-forest/5 border border-forest/20 p-8 sm:p-10 text-center", className)}>
        <CheckCircle className="mx-auto h-14 w-14 text-forest" />
        <h3 className="mt-5 text-2xl font-normal text-charcoal font-display">
          Thank You!
        </h3>
        <p className="mt-3 text-base text-muted font-sans leading-relaxed">
          We&apos;ve received your inquiry and will get back to you within 24 hours
          with a personalized response.
        </p>

        <div className="mt-6 rounded-lg bg-cream/60 p-5 text-left">
          <p className="text-sm font-normal text-charcoal font-sans mb-2">What happens next:</p>
          <ol className="space-y-2 text-sm text-muted font-sans">
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest/10 text-xs font-medium text-forest">1</span>
              We&apos;ll review your inquiry and prepare a custom response
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest/10 text-xs font-medium text-forest">2</span>
              You&apos;ll receive availability details and pricing within 24 hours
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest/10 text-xs font-medium text-forest">3</span>
              We&apos;ll schedule a call or visit to discuss your vision
            </li>
          </ol>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-sm text-muted font-sans">
            Need a faster response? Call us directly:
          </p>
          <a
            href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-2 rounded-full bg-forest/10 px-5 py-2.5 text-sm font-medium text-forest hover:bg-forest/15 transition-colors font-sans"
          >
            <Phone className="h-4 w-4" />
            {CONTACT.phone}
          </a>
        </div>

        <button
          onClick={() => setStatus("idle")}
          className="mt-6 text-sm text-muted hover:text-charcoal transition-colors font-sans underline underline-offset-4"
        >
          Submit another inquiry
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {heading && (
        <div className="mb-8">
          <h3 className="text-2xl font-normal text-charcoal font-display">{heading}</h3>
          {subtitle && (
            <p className="mt-2 text-sm text-muted font-sans leading-relaxed">{subtitle}</p>
          )}
        </div>
      )}

      {status === "error" && (
        <div role="alert" className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-sans">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {serverError || "Something went wrong. Please try again."}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Name & Email - most important, first */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="form-name" className={labelClasses}>
              Your Name *
            </label>
            <input
              type="text"
              id="form-name"
              autoComplete="name"
              aria-required="true"
              aria-describedby={errors.name ? "form-name-error" : undefined}
              {...register("name")}
              className={cn(
                inputClasses,
                errors.name ? inputErrorClasses : inputDefaultClasses
              )}
              placeholder="First & Last Name"
            />
            {errors.name && (
              <p id="form-name-error" role="alert" className="mt-1 text-xs text-red-600 font-sans">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="form-email" className={labelClasses}>
              Email Address *
            </label>
            <input
              type="email"
              id="form-email"
              autoComplete="email"
              aria-required="true"
              aria-describedby={errors.email ? "form-email-error" : undefined}
              {...register("email")}
              className={cn(
                inputClasses,
                errors.email ? inputErrorClasses : inputDefaultClasses
              )}
              placeholder="you@email.com"
            />
            {errors.email && (
              <p id="form-email-error" role="alert" className="mt-1 text-xs text-red-600 font-sans">{errors.email.message}</p>
            )}
          </div>
        </div>

        {/* Phone & Event Type */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="form-phone" className={labelClasses}>
              Phone Number
              <span className="text-muted/60 font-light ml-1">(recommended)</span>
            </label>
            <input
              type="tel"
              id="form-phone"
              autoComplete="tel"
              {...register("phone")}
              className={cn(inputClasses, inputDefaultClasses)}
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label htmlFor="form-event-type" className={labelClasses}>
              Event Type *
            </label>
            <select
              id="form-event-type"
              aria-required="true"
              aria-describedby={errors.event_type ? "form-event-type-error" : undefined}
              {...register("event_type")}
              className={cn(
                inputClasses,
                errors.event_type ? inputErrorClasses : inputDefaultClasses
              )}
            >
              <option value="">Select an event type</option>
              <option value="wedding">Wedding</option>
              <option value="elopement">Elopement</option>
              <option value="engagement-party">Engagement Party</option>
              <option value="rehearsal-dinner">Rehearsal Dinner</option>
              <option value="celebration">Birthday / Anniversary</option>
              <option value="retreat">Retreat / Reunion</option>
              <option value="photoshoot">Photoshoot</option>
              <option value="farm-stay">Farm Stay</option>
              <option value="other">Other</option>
            </select>
            {errors.event_type && (
              <p id="form-event-type-error" role="alert" className="mt-1 text-xs text-red-600 font-sans">{errors.event_type.message}</p>
            )}
          </div>
        </div>

        {/* Guest Count & Date - side by side */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="form-guest-count" className={labelClasses}>
              Estimated Guest Count
            </label>
            <select
              id="form-guest-count"
              {...register("guest_count")}
              className={cn(inputClasses, inputDefaultClasses)}
            >
              <option value="">Select a range</option>
              <option value="2-10">2 - 10 guests</option>
              <option value="11-16">11 - 16 guests (full property)</option>
              <option value="25-50">25 - 50 guests</option>
              <option value="50+">50+ guests</option>
            </select>
          </div>
          <div>
            <label htmlFor="form-date" className={labelClasses}>
              Preferred Date
            </label>
            <input
              type="date"
              id="form-date"
              {...register("preferred_date")}
              className={cn(inputClasses, inputDefaultClasses)}
            />
          </div>
        </div>

        {/* Message - optional, lower friction */}
        <div>
          <label htmlFor="form-message" className={labelClasses}>
            Tell Us About Your Vision
            <span className="text-muted/60 font-light ml-1">(optional)</span>
          </label>
          <textarea
            id="form-message"
            {...register("message")}
            rows={3}
            className={cn(inputClasses, inputDefaultClasses, "resize-none")}
            placeholder="Share any details about your event — dates, ideas, questions..."
          />
        </div>

        {/* How did you hear about us - attribution */}
        <div>
          <label htmlFor="form-referral" className={labelClasses}>
            How did you hear about us?
          </label>
          <select
            id="form-referral"
            {...register("referral_source")}
            className={cn(inputClasses, inputDefaultClasses)}
          >
            <option value="">Select one</option>
            <option value="google">Google Search</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="tiktok">TikTok</option>
            <option value="travel-oregon">Travel Oregon</option>
            <option value="word-of-mouth">Word of Mouth</option>
            <option value="wedding-wire">Wedding Wire / The Knot</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Honeypot — hidden from real users, bots auto-fill it */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="form-website">Website</label>
          <input
            type="text"
            id="form-website"
            autoComplete="off"
            tabIndex={-1}
            {...register("website")}
          />
        </div>
        <input type="hidden" {...register("_t", { valueAsNumber: true })} />

        {/* SMS Consent Checkboxes — optional, A2P compliance */}
        <div className="space-y-3 rounded-lg bg-cream/50 border border-cream-dark px-4 py-4">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              id="consent-marketing-sms"
              {...register("consent_marketing_sms")}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-cream-dark accent-forest"
            />
            <span className="text-xs text-charcoal/80 font-sans leading-relaxed">
              I consent to receive marketing text messages from Highland Farms Oregon LLC at the phone number provided. Frequency may vary. Message and data rates may apply. Text HELP for assistance. Reply STOP to opt out.
            </span>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              id="consent-appointment-sms"
              {...register("consent_appointment_sms")}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-cream-dark accent-forest"
            />
            <span className="text-xs text-charcoal/80 font-sans leading-relaxed">
              I consent to receive non-marketing text messages from Highland Farms Oregon LLC about appointment information - confirmation &amp; reminder messages. Message and data rates may apply.
            </span>
          </label>
          <p className="text-xs text-muted/70 font-sans pt-1">
            By submitting this form, you agree to our{" "}
            <a href="/privacy" className="text-forest underline underline-offset-2 hover:text-forest-light transition-colors">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="/terms" className="text-forest underline underline-offset-2 hover:text-forest-light transition-colors">
              Terms of Service
            </a>
            .
          </p>
        </div>

        {/* Submit button - large, full-width, prominent */}
        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-full bg-forest px-6 py-4 text-base font-medium tracking-wide text-white transition-all hover:bg-forest-light hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === "submitting" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            ctaText
          )}
        </button>

        {/* Trust signals below form */}
        {showTrustSignals && (
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="flex items-center gap-1.5">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-gold text-gold" />
                ))}
              </div>
              <span className="text-xs text-muted font-sans">
                4.9 on Google &middot; 146+ reviews
              </span>
            </div>
            <p className="text-xs text-muted/80 font-sans text-center">
              We respond within 24 hours &middot; No commitment required
            </p>
          </div>
        )}
      </form>
    </div>
  );
}

// Extend Window for dataLayer
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

import { z } from "zod";
import {
  EVENT_TYPE_VALUES,
  GUEST_BAND_VALUES,
  MAX_EVENT_YEAR,
  MIN_EVENT_YEAR,
  REFERRAL_VALUES,
  isPastEventMonth,
} from "./inquiry-mapping.ts";

export const attributionSchema = z
  .object({
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
    utm_term: z.string().optional(),
    utm_content: z.string().optional(),
    gclid: z.string().optional(),
    gbraid: z.string().optional(),
    wbraid: z.string().optional(),
    fbclid: z.string().optional(),
    msclkid: z.string().optional(),
    ttclid: z.string().optional(),
    first_landing_page: z.string().optional(),
    landing_page: z.string().optional(),
    first_referrer: z.string().optional(),
    referrer: z.string().optional(),
    captured_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .optional();

/** An optional select: empty, or one of the listed values. */
const optionalChoice = (values: readonly string[], message: string) =>
  z
    .string()
    .optional()
    .refine((v) => !v || values.includes(v), { message });

export const inquirySchema = z
  .object({
    name: z.string().trim().min(2, "Please add your name."),
    email: z.string().trim().email("Please enter an email we can reply to, like name@example.com."),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || v.replace(/\D/g, "").length >= 7, {
        message: "Please check the phone number, or leave it blank.",
      }),
    event_type: z.string().refine((v) => EVENT_TYPE_VALUES.includes(v), {
      message: "Please choose an event type.",
    }),
    guest_count: optionalChoice(GUEST_BAND_VALUES, "Please choose a guest count."),
    // Month + year selects ("06", "2027") and the "We're flexible" box.
    event_month: z
      .string()
      .optional()
      .refine((v) => !v || /^(0[1-9]|1[0-2])$/.test(v), { message: "Please choose a month." }),
    event_year: z
      .string()
      .optional()
      .refine(
        (v) => !v || (/^\d{4}$/.test(v) && Number(v) >= MIN_EVENT_YEAR && Number(v) <= MAX_EVENT_YEAR),
        { message: "Please choose a year." },
      ),
    date_flexible: z.boolean().optional(),
    // Exact YYYY-MM-DD from the previous form. Accepted for a deploy window.
    preferred_date: z
      .string()
      .optional()
      .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), { message: "Please choose a date." }),
    referral_source: optionalChoice(REFERRAL_VALUES, "Please choose one of the options."),
    message: z.string().max(5000, "Please keep this under 5,000 characters.").optional(),
    // Honeypot field — should always be empty. Bots auto-fill it.
    website: z.string().optional(),
    // Timestamp for timing-based bot detection
    _t: z.number().optional(),
    // Submit ID shared by the dataLayer push and the server GA4 events
    _sid: z.string().optional(),
    // The browser had GTM loaded, so GTM sends the client generate_lead (see buildGa4LeadEvents)
    _gtm: z.boolean().optional(),
    // Cloudflare Turnstile token — verified server-side before write
    turnstile_token: z.string().optional(),
    // SMS consent checkboxes (optional — A2P compliance)
    consent_marketing_sms: z.boolean().optional(),
    consent_appointment_sms: z.boolean().optional(),
    // First-party attribution captured in localStorage and attached on submit
    attribution: attributionSchema,
  })
  .superRefine((d, ctx) => {
    if (d.event_month && !d.event_year) {
      ctx.addIssue({ code: "custom", path: ["event_year"], message: "Please choose a year too." });
    }
    const yearOk =
      !!d.event_year && /^\d{4}$/.test(d.event_year) && Number(d.event_year) >= MIN_EVENT_YEAR && Number(d.event_year) <= MAX_EVENT_YEAR;
    const monthOk = !d.event_month || /^(0[1-9]|1[0-2])$/.test(d.event_month);
    if (yearOk && monthOk && isPastEventMonth(d.event_year!, d.event_month)) {
      ctx.addIssue({
        code: "custom",
        path: [d.event_month ? "event_month" : "event_year"],
        message: "That date has passed. Please choose one ahead.",
      });
    }
  });

export type InquiryFormData = z.infer<typeof inquirySchema>;

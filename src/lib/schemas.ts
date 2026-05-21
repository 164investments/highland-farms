import { z } from "zod";

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

export const inquirySchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  event_type: z.string().min(1, "Please select an event type"),
  guest_count: z.string().optional(),
  preferred_date: z.string().optional(),
  referral_source: z.string().optional(),
  message: z.string().optional(),
  // Honeypot field — should always be empty. Bots auto-fill it.
  website: z.string().optional(),
  // Timestamp for timing-based bot detection
  _t: z.number().optional(),
  // Submit ID for GA4 server-side / client-side deduplication
  _sid: z.string().optional(),
  // Cloudflare Turnstile token — verified server-side before write
  turnstile_token: z.string().optional(),
  // SMS consent checkboxes (optional — A2P compliance)
  consent_marketing_sms: z.boolean().optional(),
  consent_appointment_sms: z.boolean().optional(),
  // First-party attribution captured in localStorage and attached on submit
  attribution: attributionSchema,
});

export type InquiryFormData = z.infer<typeof inquirySchema>;

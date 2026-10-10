import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { getVariant } from "@/app/shop/data";
import { toCents } from "@/lib/shop/money";
import { deliveryFeeCents, deliveryProblem } from "@/lib/shop/fulfillment";
import { getSquareVariationMap } from "@/lib/shop/inventory";
import type { PricedLine } from "@/lib/shop/orders";
import type { OrderEmailData } from "@/lib/shop/order-email";
import { nativeCalendarEnabled } from "@/lib/booking/flag";
import { BOOKING_PRODUCTS, COMBO, unitsFor, type BookingSlug } from "@/lib/booking/products";
import { slotCapacity } from "@/lib/booking/engine";
import { slotToUtc, pacificDateStr, pacificTimeStr } from "@/lib/booking/time";
import { getScheduleData } from "@/lib/booking/store";
import type { BookingEmailData } from "@/lib/booking/confirmation-email";
import { getGiftProduct, generateGiftCode, type GiftProduct } from "@/lib/booking/gift";
import type { CheckoutKind } from "./store";

export class CheckoutError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "CheckoutError";
    this.status = status;
  }
}

const shared = {
  idempotencyKey: z.string().min(8).max(128),
  website: z.string().max(200).optional(),
};
const tracking = {
  attribution: z.record(z.string().max(80), z.string().max(2048)).refine((v) => Object.keys(v).length <= 30).optional(),
  clientId: z.string().max(64).optional(),
  fbp: z.string().max(128).optional(),
  fbc: z.string().max(256).optional(),
  referer: z.string().max(2048).optional(),
};
const shopSchema = z.object({
  ...shared, ...tracking,
  kind: z.literal("shop"),
  fulfillment: z.enum(["pickup", "delivery"]),
  customer: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().min(7).max(40),
  }),
  delivery: z.object({
    address: z.string().trim().min(1).max(240),
    city: z.string().trim().min(1).max(120),
    zip: z.string().trim().min(5).max(10),
  }).optional(),
  notes: z.string().trim().max(1000).optional(),
  items: z.array(z.object({
    variantId: z.string().min(1).max(64),
    quantity: z.number().int().min(1).max(99),
  })).min(1).max(40),
});
const bookingSchema = z.object({
  ...shared, ...tracking,
  kind: z.literal("booking"),
  product: z.enum(["farm-tour", "nordic-spa", "combo", "wedding-call"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
    const date = new Date(`${s}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === s;
  }),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  spaTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).optional(),
  partySize: z.number().int().min(1).max(6),
  customer: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().min(7).max(40),
  }),
  referralSource: z.string().trim().min(1).max(200),
  policyAgreed: z.literal(true),
  locationChoice: z.enum(["meet", "in_person"]).optional(),
  giftCode: z.string().trim().max(64).optional(),
});
const giftSchema = z.object({
  ...shared, ...tracking,
  kind: z.literal("gift"),
  productId: z.string().min(1).max(80),
  purchaser: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(200),
  }),
  recipientEmail: z.string().trim().email().max(200).optional(),
  message: z.string().trim().max(280).optional(),
});
const checkoutSchema = z.discriminatedUnion("kind", [shopSchema, bookingSchema, giftSchema]);
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type TrackingData = Pick<CheckoutInput, "attribution" | "clientId" | "fbp" | "fbc" | "referer">;

/** Parse before looking up an existing attempt, so retries need no availability reads. */
export function parseCheckoutInput(input: unknown): CheckoutInput {
  const kind = typeof input === "object" && input !== null && "kind" in input ? input.kind : null;
  if ((kind === "booking" || kind === "gift") && !nativeCalendarEnabled()) {
    throw new CheckoutError("Not found", 404);
  }
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) throw new CheckoutError("Please check your checkout details and try again.");
  const body = parsed.data;
  if (body.kind === "shop") {
    const merged = new Map<string, number>();
    for (const item of body.items) merged.set(item.variantId, (merged.get(item.variantId) ?? 0) + item.quantity);
    if ([...merged.values()].some((quantity) => quantity > 99)) {
      throw new CheckoutError("That's more than we can sell in one order. Please call the farm.");
    }
    body.items = [...merged].sort(([a], [b]) => a.localeCompare(b)).map(([variantId, quantity]) => ({ variantId, quantity }));
    if (body.fulfillment === "pickup") delete body.delivery;
    if (!body.notes) delete body.notes;
  } else if (body.kind === "booking") {
    if (body.product !== "combo") delete body.spaTime;
    if (body.product !== "wedding-call") delete body.locationChoice;
    else body.locationChoice ??= "in_person";
    if (body.giftCode) body.giftCode = body.giftCode.toUpperCase();
    else delete body.giftCode;
  } else if (!body.message) delete body.message;
  return body;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Binds retries to validated purchase details; client prices/sourceId are stripped by Zod. */
export function checkoutRequestHash(body: CheckoutInput): string {
  const { idempotencyKey: _key, website: _website, attribution: _attribution, clientId: _clientId, fbp: _fbp, fbc: _fbc, referer: _referer, ...purchase } = body;
  void _key; void _website; void _attribution; void _clientId; void _fbp; void _fbc; void _referer;
  return createHash("sha256").update(canonical(purchase)).digest("hex");
}

export interface ShopSnapshot extends Record<string, unknown> {
  order: Record<string, unknown>;
  items: { variant_id: string; product_slug: string; product_name: string; variant_label: string | null; unit_price_cents: number; quantity: number }[];
  emailData: OrderEmailData;
  squareLines: { squareVariationId: string; quantity: number }[];
  tracking: TrackingData;
}
export interface BookingSnapshot extends Record<string, unknown> {
  product: "farm-tour" | "nordic-spa" | "combo" | "wedding-call";
  legs: { product_slug: BookingSlug; starts_at: string; duration_min: number; capacity: number; party_size: number; units: number; amount_cents: number }[];
  customer: { booking_number: string; first_name: string; last_name: string; email: string; phone: string; referral_source: string; policy_agreed_at: string; location_choice: "meet" | "in_person" | null; source: string };
  emailData: BookingEmailData;
  giftCode?: string;
  tracking: TrackingData & { referralSource: string };
}
export interface GiftSnapshot extends Record<string, unknown> {
  product: GiftProduct;
  purchaserName: string;
  purchaserEmail: string;
  recipientEmail: string | null;
  message: string | null;
  code: string;
  tracking: TrackingData;
}
export type PreparedCheckout = {
  quiet: false;
  idempotencyKey: string;
  kind: CheckoutKind;
  reference: string;
  amountCents: number;
  snapshot: ShopSnapshot | BookingSnapshot | GiftSnapshot;
  requestHash: string;
};
export type QuietCheckout = { quiet: true; result: Record<string, unknown> & { success: true } };

function reference(kind: CheckoutKind): string {
  if (kind === "gift") return `GIFT-${randomUUID()}`;
  const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `${kind === "shop" ? "HF" : "HFB"}-${stamp}-${randomBytes(8).toString("hex").toUpperCase()}`;
}
function trackingData(body: CheckoutInput): TrackingData {
  return { attribution: body.attribution, clientId: body.clientId, fbp: body.fbp, fbc: body.fbc, referer: body.referer };
}

/** Read-only preparation. Capacity/stock/gift redemption belong to reserve_stripe_checkout. */
export async function prepareCheckout(input: unknown): Promise<PreparedCheckout | QuietCheckout> {
  const body = parseCheckoutInput(input);
  const ref = reference(body.kind);
  if (body.website) {
    const result = body.kind === "shop" ? { success: true as const, orderNumber: ref }
      : body.kind === "booking" ? { success: true as const, bookingNumber: ref, amountCents: 0 }
        : { success: true as const, code: generateGiftCode() };
    return { quiet: true, result };
  }
  const base = { quiet: false as const, idempotencyKey: body.idempotencyKey, kind: body.kind, reference: ref, requestHash: checkoutRequestHash(body) };
  if (body.kind === "shop") {
    const lines: PricedLine[] = body.items.map((item) => {
      const found = getVariant(item.variantId);
      if (!found) throw new CheckoutError("One of those items is no longer available. Please refresh your cart.");
      return { variantId: item.variantId, productSlug: found.product.slug, productName: found.product.name, variantLabel: found.variant.label, unitPriceCents: toCents(found.variant.price), quantity: item.quantity };
    });
    const subtotalCents = lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
    if (body.fulfillment === "delivery" && !body.delivery) throw new CheckoutError("Please add a delivery address.");
    const problem = deliveryProblem(body.fulfillment, body.delivery?.zip ?? "", subtotalCents);
    if (problem) throw new CheckoutError(problem);
    const feeCents = deliveryFeeCents(body.fulfillment);
    const amountCents = subtotalCents + feeCents;
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new CheckoutError("Please add an item to your order.");
    const map = await getSquareVariationMap(true);
    const emailData: OrderEmailData = {
      orderNumber: ref, fulfillment: body.fulfillment, customerName: body.customer.name, customerEmail: body.customer.email, customerPhone: body.customer.phone,
      deliveryAddress: body.delivery?.address, deliveryCity: body.delivery?.city, deliveryZip: body.delivery?.zip, notes: body.notes,
      subtotalCents, deliveryFeeCents: feeCents, totalCents: amountCents, lines,
    };
    const snapshot: ShopSnapshot = {
      order: { order_number: ref, status: "paid", fulfillment: body.fulfillment, customer_name: body.customer.name, customer_email: body.customer.email, customer_phone: body.customer.phone,
        delivery_address: body.delivery?.address ?? null, delivery_city: body.delivery?.city ?? null, delivery_zip: body.delivery?.zip ?? null, notes: body.notes ?? null,
        subtotal_cents: subtotalCents, delivery_fee_cents: feeCents, total_cents: amountCents, channel: "online" },
      items: lines.map((line) => ({ variant_id: line.variantId, product_slug: line.productSlug, product_name: line.productName, variant_label: line.variantLabel ?? null, unit_price_cents: line.unitPriceCents, quantity: line.quantity })),
      emailData,
      squareLines: lines.flatMap((line) => { const id = map.get(line.variantId); return id ? [{ squareVariationId: id, quantity: line.quantity }] : []; }),
      tracking: trackingData(body),
    };
    return { ...base, amountCents, snapshot };
  }
  if (body.kind === "gift") {
    const product = getGiftProduct(body.productId);
    if (!product) throw new CheckoutError("That gift certificate isn't available.");
    const snapshot: GiftSnapshot = { product, purchaserName: body.purchaser.name, purchaserEmail: body.purchaser.email, recipientEmail: body.recipientEmail ?? null, message: body.message ?? null, code: generateGiftCode(), tracking: trackingData(body) };
    return { ...base, amountCents: product.amountCents, snapshot };
  }
  if (body.product === "combo" && !body.spaTime) throw new CheckoutError("Pick a spa time for your Full Farm Day.");
  const definitions: { slug: BookingSlug; time: string }[] = body.product === "combo"
    ? [{ slug: "farm-tour", time: body.time }, { slug: "nordic-spa", time: body.spaTime! }]
    : [{ slug: body.product, time: body.time }];
  const data = await getScheduleData(definitions.map((def) => def.slug), body.date, body.date);
  const now = new Date();
  const legs: BookingSnapshot["legs"] = definitions.map((def) => {
    const product = BOOKING_PRODUCTS[def.slug];
    if (body.partySize < product.minParty || body.partySize > product.maxParty) throw new CheckoutError(`${product.name} is for ${product.minParty}-${product.maxParty} guests.`);
    const start = slotToUtc(body.date, def.time);
    if (pacificDateStr(start) !== body.date || pacificTimeStr(start) !== def.time) throw new CheckoutError("That time isn't available. Please pick from the calendar.", 409);
    const capacity = slotCapacity({ product, dateStr: body.date, time: def.time, schedules: data.schedules, exceptions: data.exceptions, blackouts: data.blackouts, booked: data.booked, now });
    if (capacity === null) throw new CheckoutError("That time isn't offered on that date. Please pick from the calendar.", 409);
    return { product_slug: product.slug, starts_at: start.toISOString(), duration_min: product.durationMin, capacity, party_size: body.partySize, units: unitsFor(product, body.partySize), amount_cents: product.pricePerPersonCents * body.partySize };
  });
  if (body.product === "combo") {
    const [tour, spa] = legs;
    const t = Date.parse(tour.starts_at), s = Date.parse(spa.starts_at);
    if (s - (t + tour.duration_min * 60000) < COMBO.bufferMin * 60000 && t - (s + spa.duration_min * 60000) < COMBO.bufferMin * 60000) {
      throw new CheckoutError("Those two times overlap. Leave at least 30 minutes between them.");
    }
  }
  const amountCents = legs.reduce((sum, leg) => sum + leg.amount_cents, 0);
  const snapshot: BookingSnapshot = {
    product: body.product, legs,
    customer: { booking_number: ref, first_name: body.customer.firstName, last_name: body.customer.lastName, email: body.customer.email, phone: body.customer.phone, referral_source: body.referralSource, policy_agreed_at: now.toISOString(), location_choice: body.locationChoice ?? null, source: "native" },
    emailData: { bookingNumber: ref, product: body.product, legs: legs.map((leg) => ({ productSlug: leg.product_slug, startsAt: leg.starts_at, durationMin: leg.duration_min })), partySize: body.partySize, customerName: `${body.customer.firstName} ${body.customer.lastName}`, customerEmail: body.customer.email, customerPhone: body.customer.phone, totalCents: amountCents, giftAppliedCents: 0, paidCents: amountCents, locationChoice: body.locationChoice ?? null, meetLink: null },
    giftCode: body.giftCode,
    tracking: { ...trackingData(body), referralSource: body.referralSource },
  };
  return { ...base, amountCents, snapshot };
}

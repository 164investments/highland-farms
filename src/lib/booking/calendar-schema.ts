import { z } from "zod";

export const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Use a real calendar date.");
export const calendarTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const calendarProduct = z.enum(["farm-tour", "nordic-spa", "wedding-call"]);
export const calendarTimes = z.array(calendarTime).max(20).transform((times) => [...new Set(times)].sort());
export function validCalendarCapacity(productSlug: string, capacity: number | null): boolean {
  const maximum = productSlug === "farm-tour" ? 2 : productSlug === "nordic-spa" ? 6 : 1;
  return capacity === null || capacity <= maximum;
}
export const dateScheduleSchema = z.object({
  productSlug: calendarProduct,
  onDate: calendarDate,
  startTimes: calendarTimes.nullable(),
  capacity: z.number().int().min(1).max(500).nullable(),
}).strict().refine((value) => value.startTimes === null || value.startTimes.length === 0 || value.capacity !== null,
  "Open dates need an explicit capacity.")
  .refine((value) => validCalendarCapacity(value.productSlug, value.capacity), "Capacity exceeds the current farm limit.");

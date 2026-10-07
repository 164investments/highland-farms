/*
 * Pure math for the chat launcher's lift above the bottom sticky bar
 * (StickyShell). No DOM access here, so it can be unit tested.
 */

/**
 * The vertical part of an element's computed `translate` ("none", "0px -157px"),
 * in px. getComputedStyle includes a running transition, so this matches the
 * element's bounding rect read in the same frame.
 */
export function translateYOf(translate: string | null | undefined): number {
  if (!translate || translate === "none") return 0;
  const parts = translate.trim().split(/\s+/);
  return parts.length > 1 ? parseFloat(parts[1]) || 0 : 0;
}

/**
 * How far the launcher must rise so its bottom sits `gap` px above the bar.
 * `bubbleBottom` is its current rect bottom and `bubbleTranslateY` the
 * translate it carries at that moment (negative when lifted), so the result
 * is the same whether the launcher is at rest, lifted or mid-transition.
 */
export function chatLiftFor({
  bubbleBottom,
  bubbleTranslateY,
  viewportHeight,
  barHeight,
  gap = 12,
}: {
  bubbleBottom: number;
  bubbleTranslateY: number;
  viewportHeight: number;
  barHeight: number;
  gap?: number;
}): number {
  const naturalBottom = bubbleBottom - bubbleTranslateY;
  const barTop = viewportHeight - barHeight;
  return Math.max(0, Math.round(naturalBottom - (barTop - gap)));
}

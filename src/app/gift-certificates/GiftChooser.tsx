"use client";

import { useRef, useState, type ReactNode } from "react";
import { FieldPriceRows, type FieldPriceRowData } from "@/components/field/PriceRows";
import { FieldDrawing, type FieldDrawingName } from "@/components/ui/FieldGuide";

/*
 * Gift tiles (board gifts-board-r1, direction A): three tiles carry the page's
 * own prices as the one decision; tapping one opens only that gift's ladder
 * right under the tiles. Every ladder row is a BookingTextLink (through
 * FieldPriceRows), so booking_start tracking is unchanged. The rows arrive as
 * plain data from the server page; nothing here knows a price.
 */

export interface GiftTileData {
  family: string;
  name: string;
  /** "$150" */
  price: string;
  /** "for two", "per person" */
  unit: string;
  drawings: FieldDrawingName[];
  /** Small caps tag shown in the opened panel only ("Tour and spa"). */
  panelTag?: string;
  line: string;
  body: string;
  rows: FieldPriceRowData[];
}

interface Props {
  tiles: GiftTileData[];
  /** The review shown directly under an opened ladder. */
  proof?: ReactNode;
}

export function GiftChooser({ tiles, proof }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const tilesRef = useRef<HTMLDivElement>(null);
  const tile = tiles.find((t) => t.family === open) ?? null;

  function choose(family: string) {
    setOpen(family);
    // Keep the three tiles pinned at the top while the ladder is read.
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      tilesRef.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    });
  }

  return (
    <div id="choose" className="scroll-mt-[var(--header-h,104px)]">
      <p
        id="gift-pick-label"
        className="m-0 mb-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink-meta lg:mb-2 lg:text-[12px]"
      >
        Choose a gift
      </p>
      <div
        ref={tilesRef}
        role="group"
        aria-labelledby="gift-pick-label"
        className="grid scroll-mt-[calc(var(--header-h,104px)+12px)] grid-cols-3 gap-2"
      >
        {tiles.map((t) => {
          const on = t.family === open;
          return (
            <button
              key={t.family}
              type="button"
              aria-pressed={on}
              aria-controls="gift-panel"
              onClick={() => choose(t.family)}
              className={`relative flex min-h-[44px] flex-col items-center border px-1 pb-3 pt-2.5 text-center transition-colors ${
                on ? "border-pine bg-paper-light" : "border-rule hover:border-pine"
              }`}
            >
              <span className="flex h-12 items-end justify-center max-[359px]:h-10">
                {t.drawings.map((name, i) => (
                  <FieldDrawing
                    key={name}
                    name={name}
                    sizes="48px"
                    className={`h-12 w-12 max-[359px]:h-10 max-[359px]:w-10 ${i > 0 ? "-ml-4 max-[359px]:-ml-[15px]" : ""}`}
                  />
                ))}
              </span>
              <span
                className={`mt-2 flex min-h-[2.1em] items-center font-display text-[19px] font-semibold leading-[1.05] max-[359px]:text-[17px] ${
                  on ? "text-pine" : "text-ink"
                }`}
              >
                {t.name}
              </span>
              <span className="mt-1.5 font-sans text-[14px] font-semibold leading-none text-ink">{t.price}</span>
              <span className="mt-1 font-sans text-[12px] leading-none text-ink-note">{t.unit}</span>
              {on && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-pine" />}
            </button>
          );
        })}
      </div>
      <p className="m-0 mt-2 font-sans text-[13px] leading-[1.4] text-ink-note lg:text-[14px]">
        The code arrives by email right after checkout.
      </p>

      <div id="gift-panel" role="region" aria-label={tile ? `${tile.name} group sizes` : undefined}>
        {tile && (
          <div className="mt-3">
            {tile.panelTag && (
              <p className="m-0 font-sans text-[11px] uppercase tracking-[0.1em] text-pine lg:text-[12px]">
                {tile.name} · {tile.panelTag}
              </p>
            )}
            <p className="m-0 mt-2 font-display text-[18px] italic leading-[1.3] text-ink-note lg:text-[21px]">
              {tile.line}
            </p>
            <p className="m-0 mb-3 mt-1.5 font-sans text-[14px] leading-[1.45] text-ink-body max-[359px]:text-[13.5px] lg:text-[16px] lg:leading-[1.6]">
              {tile.body}
            </p>
            <FieldPriceRows rows={tile.rows} size="md" />
            {proof && <div className="mt-4">{proof}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

import { FieldLeader } from "@/components/ui/FieldGuide";
import type { Property } from "@/lib/types";
import { FieldArrowDown, StayPhoto } from "./StayParts";
import type { StayRoom, StayRoomGroup } from "./stay-content";

const GRID_CLASS = "m-0 mt-3 grid list-none grid-cols-2 gap-x-3 gap-y-5 p-0 lg:grid-cols-4 lg:gap-x-5";

/** One numbered plate: real photo, "No. N", the room's name and one detail line. */
export function RoomTile({ item, n }: { item: StayRoom; n: number }) {
  return (
    <li>
      <figure className="m-0 flex flex-col gap-[5px]">
        <div className="h-[124px] border border-frame bg-paper-light p-[5px] lg:h-[170px] lg:p-[7px]">
          <div className="relative h-full w-full overflow-hidden">
            <StayPhoto photo={item} sizes="(min-width: 1024px) 14vw, 46vw" />
          </div>
        </div>
        <figcaption>
          <span className="block font-sans text-[10px] font-medium uppercase tracking-[0.14em] text-ink-meta">
            No. {n}
          </span>
          <span className="block font-display text-[18px] font-semibold leading-tight">{item.name}</span>
          <span className="mt-0.5 block font-sans text-[12px] leading-[1.4] text-ink-note lg:text-[13px]">
            {item.detail}
          </span>
        </figcaption>
      </figure>
    </li>
  );
}

/**
 * "Room by room": the old carousel as numbered plates, grouped like a floor
 * plan (Sleeping, Bathing, Gathering, Outside). The "No. N" labels run on across
 * the groups (CONSISTENCY #4). Every plate is a real photo from the stay's
 * published gallery; the alt text is the gallery's own.
 */
export function RoomPlates({ groups, property }: { groups: StayRoomGroup[]; property: Property }) {
  // Running "No. N" start for each group.
  const starts = groups.map((_, i) => groups.slice(0, i).reduce((sum, g) => sum + g.items.length, 0));
  return (
    <>
      {groups.map((g, gi) => (
        <div key={g.group}>
          <div className="mt-8 flex items-center gap-3">
            <h3 className="m-0">
              <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">{g.group}</span>
            </h3>
            <FieldLeader className="translate-y-0.5" />
            <span className="font-sans text-[12px] text-ink-note">{g.note(property)}</span>
          </div>
          <ol className={GRID_CLASS}>
            {g.items.map((item, ii) => (
              <RoomTile key={item.src} item={item} n={starts[gi] + ii + 1} />
            ))}
          </ol>
        </div>
      ))}
    </>
  );
}

/**
 * One stay's photographs inside the whole-farm page, so a group sees every bed
 * without leaving it: the first `shown` plates (the bedrooms come first in
 * every stay's list), then the rest behind "All N photos". Images inside the
 * closed <details> are not rendered, so their lazy loads wait for the tap.
 */
export function RoomPreview({ groups, shown = 4, label }: { groups: StayRoomGroup[]; shown?: number; label: string }) {
  const items = groups.flatMap((g) => g.items);
  const first = items.slice(0, shown);
  const rest = items.slice(shown);
  return (
    <>
      <ol className={GRID_CLASS} aria-label={`${label}, photographs 1 to ${first.length}`}>
        {first.map((item, i) => (
          <RoomTile key={item.src} item={item} n={i + 1} />
        ))}
      </ol>
      {rest.length > 0 && (
        <details className="group mt-2">
          <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1 font-sans text-[13px] font-medium text-pine lg:text-[14px] [&::-webkit-details-marker]:hidden">
            All {items.length} photos
            <FieldArrowDown size={14} className="transition-transform group-open:rotate-180" />
          </summary>
          <ol className={GRID_CLASS} aria-label={`${label}, photographs ${first.length + 1} to ${items.length}`}>
            {rest.map((item, i) => (
              <RoomTile key={item.src} item={item} n={first.length + i + 1} />
            ))}
          </ol>
        </details>
      )}
    </>
  );
}

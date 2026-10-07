import { FieldLeader } from "@/components/ui/FieldGuide";
import type { Property } from "@/lib/types";
import { StayPhoto } from "./StayParts";
import type { StayRoomGroup } from "./stay-content";

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
          <ol className="m-0 mt-3 grid list-none grid-cols-2 gap-x-3 gap-y-5 p-0 lg:grid-cols-4 lg:gap-x-5">
            {g.items.map((item, ii) => {
              const n = starts[gi] + ii + 1;
              return (
                <li key={item.src}>
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
            })}
          </ol>
        </div>
      ))}
    </>
  );
}

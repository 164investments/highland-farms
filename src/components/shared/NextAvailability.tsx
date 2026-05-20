import { Calendar } from "lucide-react";
import { getNextTourDate, getNextSpaDate } from "@/lib/acuity";

function formatDate(iso: string): string {
  // iso is YYYY-MM-DD — anchor at noon to dodge timezone shifts.
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

interface Props {
  /** Which product's availability to probe. Defaults to "tour". */
  product?: "tour" | "spa";
}

export async function NextAvailability({ product = "tour" }: Props = {}) {
  let date: string | null = null;
  try {
    date = product === "spa" ? await getNextSpaDate() : await getNextTourDate();
  } catch {
    return null;
  }
  if (!date) return null;

  return (
    <div className="flex items-center justify-center gap-2 rounded-full bg-sage/10 px-4 py-2 text-sm text-forest font-sans">
      <Calendar className="h-4 w-4" />
      <span>
        Next available: <span className="font-normal">{formatDate(date)}</span>
      </span>
    </div>
  );
}

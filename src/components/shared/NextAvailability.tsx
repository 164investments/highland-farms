import { Calendar } from "lucide-react";
import { getNextTourDate } from "@/lib/acuity";

function formatDate(iso: string): string {
  // iso is YYYY-MM-DD — anchor at noon to dodge timezone shifts.
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export async function NextAvailability() {
  let date: string | null = null;
  try {
    date = await getNextTourDate();
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

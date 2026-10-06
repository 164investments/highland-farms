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
  /**
   * "pill" (default): the calendar pill. "text": bare inline text such as
   * "Next open tour: Mon, Oct 12." for a sentence the caller styles.
   */
  variant?: "pill" | "text";
  /** Lead-in for the text variant. */
  label?: string;
}

export async function NextAvailability({
  product = "tour",
  variant = "pill",
  label = "Next open:",
}: Props = {}) {
  let date: string | null = null;
  try {
    date = product === "spa" ? await getNextSpaDate() : await getNextTourDate();
  } catch {
    return null;
  }
  if (!date) return null;

  if (variant === "text") {
    return (
      <>
        {label} {formatDate(date)}.
      </>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 rounded-full bg-sage/10 px-4 py-2 text-sm text-forest font-sans">
      <Calendar className="h-4 w-4" />
      <span>
        Next available: <span className="font-normal">{formatDate(date)}</span>
      </span>
    </div>
  );
}

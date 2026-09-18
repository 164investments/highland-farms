import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  align?: "left" | "center";
  className?: string;
  /**
   * Heading level to render. Defaults to "h2" (the pre-existing behavior on
   * every page using this component). Pass "h1" on a page whose document
   * otherwise has no top-level heading.
   */
  as?: "h1" | "h2";
}

export function SectionHeading({
  title,
  subtitle,
  eyebrow,
  align = "center",
  className,
  as: Heading = "h2",
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-14",
        align === "center" && "text-center",
        className
      )}
    >
      {eyebrow && (
        <p className="mb-3 text-lg font-normal text-sage font-script">
          {eyebrow}
        </p>
      )}
      <Heading className="text-3xl font-light tracking-tight sm:text-4xl lg:text-[2.75rem]">
        {title}
      </Heading>
      {subtitle && (
        <p className="mt-4 max-w-2xl text-base text-muted leading-relaxed mx-auto font-sans">
          {subtitle}
        </p>
      )}
    </div>
  );
}

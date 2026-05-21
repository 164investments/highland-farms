import Link from "next/link";
import { cn } from "@/lib/utils";

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "outline" | "ghost" | "soft";
  size?: "default" | "lg" | "sm";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  external?: boolean;
}

const variants = {
  primary:
    "bg-forest text-white hover:bg-forest-light shadow-sm hover:shadow-md",
  outline:
    "border border-forest/30 text-forest hover:bg-forest/5 hover:border-forest/50",
  ghost:
    "text-forest hover:bg-sage/10",
  soft:
    "bg-sage/15 text-forest hover:bg-sage/25",
};

const sizes = {
  sm: "px-5 py-2 text-sm",
  default: "px-7 py-3 text-sm",
  lg: "px-9 py-3.5 text-base",
};

export function Button({
  children,
  href,
  variant = "primary",
  size = "default",
  className,
  onClick,
  type = "button",
  external,
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center font-normal tracking-[0.15em] uppercase text-[0.75em] transition-all duration-300 rounded-full",
    variants[variant],
    sizes[size],
    className
  );

  if (href) {
    if (external) {
      return (
        <a href={href} className={classes} target="_blank" rel="noopener noreferrer" onClick={onClick}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}

import Link from "next/link";
import { cn } from "@/lib/utils";
import { CHECK_DATE_HREF, type PageAction } from "./chrome";

/*
 * Pieces shared by the paper masthead (Header), the menu sheet (MobileMenu)
 * and the footer: lockup B, "HIGHLAND FARMS" over "BRIGHTWOOD, OREGON"
 * (D10, finish/boards/_shared/masthead.html round 2). The board's `lg:` is
 * `xl:` here: five links, two more, a 32px name and a button need 1280px.
 */

export { CHECK_DATE_HREF };

type NameSize = "masthead" | "checkout" | "footer";

const NAME: Record<NameSize, { name: string; place: string }> = {
  // Stepped with ACTION_CLASS so the name sits on the screen's centre line
  // with the longest short label ("See sessions") at least 12px clear.
  // Measured 2026-10-06 with the real fonts: centred within 0.5px for every
  // label from 374px up and on desktop; at 359-360 the longest labels push it
  // up to 3px left, at 320 up to 12px (the grid shifts it rather than let
  // them touch). Desktop forces line-height 1: the text sizes were resetting
  // `leading-none` to 1.5, so the 32px name sat in a 48px line box and the
  // bar was 96px to hold ~22px of empty leading (Hayden 2026-10-08: the logo
  // read too tall for the header). Now a 51px lockup in an 80px bar.
  masthead: {
    name: "text-[20px] tracking-[0.06em] min-[390px]:max-[414px]:text-[19px] min-[375px]:max-[390px]:text-[18px] min-[375px]:max-[390px]:tracking-[0.05em] min-[360px]:max-[375px]:text-[17px] min-[360px]:max-[375px]:tracking-[0.05em] max-[360px]:text-[16px] max-[360px]:tracking-[0.04em] xl:text-[32px] xl:tracking-[0.07em] xl:leading-none!",
    place:
      "mt-[5px] text-[11px] tracking-[0.2em] min-[360px]:max-[390px]:text-[10px] min-[360px]:max-[390px]:tracking-[0.18em] max-[360px]:text-[9px] max-[360px]:tracking-[0.12em] xl:mt-2 xl:text-[11px] xl:tracking-[0.32em] xl:leading-none!",
  },
  // Checkout sits between "Cart" and "Secure": one line from 320px up (it wrapped and met the rule on SE).
  checkout: {
    name: "whitespace-nowrap text-[19px] tracking-[0.06em] max-[374px]:text-[16px] max-[374px]:tracking-[0.04em] lg:text-[28px]",
    place:
      "mt-[5px] whitespace-nowrap text-[9px] tracking-[0.22em] max-[374px]:tracking-[0.14em] lg:mt-2 lg:text-[10.5px] lg:tracking-[0.32em]",
  },
  footer: {
    name: "text-[26px] tracking-[0.06em] lg:text-[34px]",
    place: "mt-2 text-[10px] tracking-[0.28em]",
  },
};

/** The name in words, linking home. Hayden: "Highland Farms" must read clearly on every page. */
export function MastheadName({
  size = "masthead",
  onClick,
  className,
}: {
  size?: NameSize;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label="Highland Farms, home"
      className={cn("flex min-h-11 flex-col items-center justify-center text-center text-ink", className)}
    >
      <span className={cn("font-display font-semibold uppercase leading-none", NAME[size].name)}>
        Highland Farms
      </span>
      <span className={cn("font-sans font-medium uppercase leading-none text-ink-note", NAME[size].place)}>
        Brightwood, Oregon
      </span>
    </Link>
  );
}

// Phone: no left padding, so the grid gap is the clearance to the name; 10px
// caps below 414px so even "See sessions" fits beside a centred name.
const ACTION_CLASS =
  "flex min-h-11 min-w-16 items-center justify-end whitespace-nowrap pr-1 font-sans text-[11px] font-medium uppercase tracking-[0.08em] text-pine underline decoration-pine-line decoration-1 underline-offset-4 transition-[opacity,background-color] duration-200 max-[414px]:text-[10px] max-[360px]:tracking-[0.04em] xl:h-11 xl:min-h-0 xl:px-5 xl:text-[12px] xl:font-semibold xl:tracking-[0.14em] xl:no-underline";

/**
 * The page's own right-hand action. Phone: Inter caps with a 1px underline
 * (Griffin's INQUIRE), a 44 x 64 tap area. Desktop: the square button.
 * `data-masthead-action` lets globals.css fade it while the bottom sticky
 * shows the same action (CONSISTENCY #9).
 */
export function MastheadAction({ action, onClick }: { action: PageAction; onClick?: () => void }) {
  const className = cn(ACTION_CLASS, "xl:bg-pine xl:text-paper-light xl:hover:bg-pine-dark");
  const inner = (
    <>
      <span className="xl:hidden">{action.phone}</span>
      <span className="hidden xl:inline">{action.label}</span>
    </>
  );
  if (action.href.startsWith("#")) {
    return (
      <a href={action.href} onClick={onClick} data-masthead-action="" className={className}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={action.href} onClick={onClick} data-masthead-action="" className={className}>
      {inner}
    </Link>
  );
}

/** Shop pages: "Cart (n)", outlined on desktop. The count is live from the cart. */
export function MastheadCart({ count, onClick }: { count: number; onClick?: () => void }) {
  return (
    <Link
      href="/shop/cart"
      onClick={onClick}
      data-masthead-action=""
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
      className={cn(ACTION_CLASS, "gap-1.5 xl:border xl:border-pine xl:hover:bg-paper-shade")}
    >
      Cart <span className="tabular-nums">({count})</span>
    </Link>
  );
}

/** The menu (hamburger) and close icons. */
export function MenuIcon({ open = false }: { open?: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}

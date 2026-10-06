import Link from "next/link";
import Image from "next/image";

/*
 * Pieces shared by the paper masthead (Header) and the menu overlay
 * (MobileMenu), so the overlay's top bar matches the masthead exactly.
 */

/** Where every "Check your date" in the masthead goes. */
export const CHECK_DATE_HREF = "/weddings#contact";

/** The masthead lettermark: the white logo printed in ink, as on the approved boards. */
export function MastheadLogo({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      className="flex min-h-11 items-center justify-self-center transition-opacity hover:opacity-75"
    >
      <Image
        src="/images/logo/HF-logo-white.png"
        alt="Highland Farms"
        width={65}
        height={38}
        loading="eager"
        className="h-7 w-auto brightness-[0.13] xl:h-[38px]"
      />
    </Link>
  );
}

/** "Check date" text link: the phone masthead's right-hand slot. */
export function MastheadCheckDate({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href={CHECK_DATE_HREF}
      onClick={onClick}
      className="flex min-h-11 items-center justify-self-end font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-pine transition-colors hover:text-pine-dark"
    >
      Check date
    </Link>
  );
}

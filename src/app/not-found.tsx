import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SolidHeaderMarker } from "@/components/layout/SolidHeaderMarker";
import { CONTACT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

const links = [
  { href: "/farm-tours", label: "Farm tours" },
  { href: "/nordic-spa", label: "Nordic Forest Spa" },
  { href: "/weddings", label: "Weddings" },
  { href: "/shop", label: "Farm store" },
];

export default function NotFound() {
  return (
    <div className="bg-cream pt-36 pb-20 sm:pb-28">
      <SolidHeaderMarker />
      <Container className="max-w-3xl text-center">
        <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl shadow-sm">
          <Image
            src="/images/farm/cow-1.jpg"
            alt="A Scottish Highland cow at Highland Farms"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 448px"
            className="object-cover"
          />
        </div>
        <h1 className="mt-8 text-3xl font-normal text-charcoal sm:text-4xl">
          That page wandered off.
        </h1>
        <p className="mt-3 text-base text-muted font-sans font-light">
          Try one of these instead:
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full border border-forest/30 px-6 py-3 text-sm text-forest font-sans transition-colors hover:bg-forest/5 hover:border-forest/50"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted font-sans">
          Or call us at{" "}
          <a
            href={`tel:${CONTACT.phoneAlt.replace(/[^\d+]/g, "")}`}
            className="text-forest underline underline-offset-4"
          >
            {CONTACT.phoneAlt}
          </a>
          .
        </p>
      </Container>
    </div>
  );
}

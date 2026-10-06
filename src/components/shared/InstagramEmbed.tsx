import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Play } from "lucide-react";
import { CONTACT, INSTAGRAM_FOLLOWERS } from "@/lib/constants";

const LIVEPDX_REEL =
  "https://www.instagram.com/reel/DUjsovNjzjf/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
        fill="currentColor"
      />
    </svg>
  );
}

export function InstagramEmbed() {
  return (
    <section className="py-16 lg:py-24 bg-warm-white overflow-hidden">
      <Container>
        <SectionHeading
          eyebrow="Follow Along"
          title="See Highland Farms on Instagram"
          subtitle={`${INSTAGRAM_FOLLOWERS} people follow ${CONTACT.instagramHandle} for farm life, forest weddings, and Highland cow moments.`}
        />

        {/* As Seen On LivePDX banner */}
        <div className="mx-auto mb-8 max-w-2xl">
          <a
            href={LIVEPDX_REEL}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-2xl bg-gradient-to-r from-[#0d9488] to-[#14b8a6] p-[1px] shadow-sm hover:shadow-md transition-all duration-500"
          >
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#0d9488]/10 shrink-0">
                  <Play className="h-4 w-4 text-[#0d9488] fill-[#0d9488]" />
                </div>
                <div>
                  <p className="text-xs font-light uppercase tracking-[0.15em] text-[#0d9488] font-sans">
                    As Seen On
                  </p>
                  <p className="text-lg font-display font-normal text-charcoal">
                    Live<span className="text-[#0d9488]">PDX</span>
                  </p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-sm text-charcoal/80 font-sans font-light">
                  Featured by LivePDX
                </p>
                <p className="text-xs text-[#0d9488] font-sans mt-0.5 group-hover:underline">
                  Watch the feature &rarr;
                </p>
              </div>
              <div className="block sm:hidden">
                <p className="text-xs text-[#0d9488] font-sans group-hover:underline">
                  Watch &rarr;
                </p>
              </div>
            </div>
          </a>
        </div>

        <div className="mt-2 text-center">
          <a
            href={CONTACT.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 rounded-full border border-charcoal/20 bg-white px-6 py-3 text-sm font-light text-charcoal hover:border-charcoal/40 hover:shadow-sm transition-all font-sans tracking-wide"
          >
            <InstagramIcon className="h-4 w-4" />
            Follow {CONTACT.instagramHandle} on Instagram
          </a>
        </div>
      </Container>
    </section>
  );
}

import Link from "next/link";
import Image from "next/image";
import { Instagram, Phone, Mail, MapPin } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { CONTACT, SITE } from "@/lib/constants";
import { ReviewBadge } from "@/components/shared/ReviewBadge";

export function Footer() {
  return (
    <footer className="bg-charcoal text-white/80">
      <Container className="py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image
                src="/images/logo/HF-logo-white.png"
                alt="Highland Farms"
                width={36}
                height={21}
                className="h-5 w-auto opacity-80"
              />
              <span className="text-lg font-normal text-white/70 font-script">
                Highland Farms
              </span>
            </Link>
            <p className="mt-4 text-sm text-white/65 leading-relaxed font-light font-sans">
              {SITE.description}
            </p>
            {/* Social Proof */}
            <div className="mt-4 flex flex-col gap-3">
              <ReviewBadge variant="compact" className="text-white/75" />
              <a
                href="https://traveloregon.com/plan-your-trip/places-to-stay/farm-ranch-stays/highland-farms/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 hover:bg-white/10 hover:border-white/25 transition-all self-start"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#6B9E3C] shrink-0" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                <div>
                  <p className="text-[10px] font-light uppercase tracking-[0.12em] text-white/50 font-sans leading-none">
                    Featured on
                  </p>
                  <p className="text-xs font-normal text-white/75 font-sans mt-0.5">
                    Travel Oregon
                  </p>
                </div>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-light uppercase tracking-[0.15em] text-white/55 mb-5 font-sans">
              Explore
            </h3>
            <ul className="space-y-3">
              {[
                { label: "Weddings", href: "/weddings" },
                { label: "Farm Tours", href: "/farm-tours" },
                { label: "Nordic Spa", href: "/nordic-spa" },
                { label: "Stay With Us", href: "/stay" },
                { label: "Celebrations", href: "/celebrations" },
                { label: "About", href: "/about" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/65 hover:text-white/80 transition-colors font-light font-sans"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-light uppercase tracking-[0.15em] text-white/55 mb-5 font-sans">
              Contact
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2.5 text-sm text-white/65 hover:text-white/80 transition-colors font-light font-sans"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0 opacity-65" />
                  <span>{CONTACT.phone} <span className="text-white/45 text-xs">— Weddings &amp; Events</span></span>
                </a>
              </li>
              <li>
                <a
                  href={`tel:${CONTACT.phoneAlt.replace(/[^\d+]/g, "")}`}
                  className="flex items-center gap-2.5 text-sm text-white/65 hover:text-white/80 transition-colors font-light font-sans"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0 opacity-65" />
                  <span>{CONTACT.phoneAlt} <span className="text-white/45 text-xs">— General Inquiries</span></span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="flex items-center gap-2.5 text-sm text-white/65 hover:text-white/80 transition-colors font-light font-sans"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0 opacity-65" />
                  {CONTACT.email}
                </a>
              </li>
              <li>
                <div className="flex items-start gap-2.5 text-sm text-white/65 font-light font-sans">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-65" />
                  <span>{CONTACT.fullAddress}</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Social & Legal */}
          <div>
            <h3 className="text-xs font-light uppercase tracking-[0.15em] text-white/55 mb-5 font-sans">
              Follow Us
            </h3>
            <a
              href={CONTACT.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-white/65 hover:text-white/80 transition-colors font-light font-sans"
            >
              <Instagram className="h-4 w-4" />
              {CONTACT.instagramHandle}
            </a>

            <div className="mt-8 space-y-2">
              <Link href="/privacy" className="block text-xs text-white/50 hover:text-white/65 transition-colors font-light font-sans">
                Privacy Policy
              </Link>
              <Link href="/terms" className="block text-xs text-white/50 hover:text-white/65 transition-colors font-light font-sans">
                Terms of Service
              </Link>
              <Link href="/accessibility" className="block text-xs text-white/50 hover:text-white/65 transition-colors font-light font-sans">
                Accessibility
              </Link>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-14 border-t border-white/10 pt-8 text-center text-xs text-white/50 font-light font-sans">
          <p>&copy; {new Date().getFullYear()} Highland Farms Oregon. All rights reserved.</p>
        </div>
      </Container>
    </footer>
  );
}

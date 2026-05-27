import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { CONTACT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Accessibility Statement",
  description:
    "Highland Farms Oregon accessibility commitment. Learn about our efforts to make our website and property accessible to all visitors.",
  alternates: { canonical: "/accessibility" },
  robots: { index: true, follow: true },
};

export default function AccessibilityPage() {
  return (
    <>
      <section className="pt-32 pb-20 lg:pb-28 bg-background">
        <Container className="max-w-3xl">
          <h1 className="text-3xl font-normal sm:text-4xl mb-2">
            Accessibility Statement
          </h1>
          <p className="text-sm text-muted font-sans mb-10">
            Last updated: February 26, 2026
          </p>

          <div className="prose prose-neutral max-w-none text-base text-charcoal/90 font-sans leading-relaxed space-y-8">
            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Our Commitment
              </h2>
              <p>
                Highland Farms is committed to ensuring digital accessibility
                for people with disabilities. We are continually improving the
                user experience for everyone and applying the relevant
                accessibility standards.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Conformance Status
              </h2>
              <p>
                We aim to conform to the Web Content Accessibility Guidelines
                (WCAG) 2.1 at Level AA. These guidelines explain how to make web
                content more accessible to people with a wide array of
                disabilities. Conforming to these guidelines also helps make
                content more usable for all users.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Measures Taken
              </h2>
              <p>
                Highland Farms takes the following measures to ensure
                accessibility of our website:
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-3">
                <li>Semantic HTML structure with proper heading hierarchy</li>
                <li>
                  Sufficient color contrast ratios meeting WCAG AA standards
                </li>
                <li>
                  Keyboard navigation support throughout the site, including
                  image carousels
                </li>
                <li>
                  ARIA labels and roles for interactive elements and landmarks
                </li>
                <li>Alt text on all meaningful images</li>
                <li>Accessible forms with proper labels and error messages</li>
                <li>Responsive design that works across screen sizes</li>
                <li>Respect for reduced motion preferences</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Property Accessibility
              </h2>
              <p>
                Highland Farms is a working farm property set on five acres of
                forest and pasture land in Brightwood, Oregon. Due to the
                natural terrain, some areas of the property include uneven
                ground, gravel paths, and natural surfaces. We are happy to
                discuss specific accessibility needs and accommodations for your
                visit.
              </p>
              <p className="mt-3">
                Please note that our Nordic Spa — the wood-burning sauna, wet
                sauna, and cold plunge — is not ADA accessible. It sits in a
                natural forest setting reached by uneven ground and steps and
                cannot accommodate wheelchairs or mobility devices.
              </p>
              <p className="mt-3">
                Please contact us in advance so we can help plan your visit and
                ensure the best possible experience.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Known Limitations
              </h2>
              <p>
                While we strive for full accessibility, some limitations may
                exist:
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-3">
                <li>
                  Third-party booking widgets (Acuity Scheduling, Hospitable)
                  are outside our direct control, though we have chosen
                  providers that prioritize accessibility
                </li>
                <li>
                  Some older images may have limited alt text descriptions; we
                  are actively improving these
                </li>
                <li>
                  Embedded content from third-party services may not fully meet
                  WCAG 2.1 AA standards
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Feedback
              </h2>
              <p>
                We welcome your feedback on the accessibility of the Highland
                Farms website. If you encounter accessibility barriers or have
                suggestions for improvement, please contact us:
              </p>
              <ul className="list-none pl-0 space-y-2 mt-3">
                <li>
                  Email:{" "}
                  <a
                    href={`mailto:${CONTACT.email}`}
                    className="text-forest hover:text-forest-light underline underline-offset-2"
                  >
                    {CONTACT.email}
                  </a>
                </li>
                <li>
                  Phone:{" "}
                  <a
                    href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}
                    className="text-forest hover:text-forest-light underline underline-offset-2"
                  >
                    {CONTACT.phone}
                  </a>
                </li>
              </ul>
              <p className="mt-3">
                We aim to respond to accessibility feedback within 5 business
                days and to resolve reported issues as quickly as possible.
              </p>
            </section>
          </div>
        </Container>
      </section>
    </>
  );
}

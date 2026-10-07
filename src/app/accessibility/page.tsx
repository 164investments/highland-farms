import type { Metadata } from "next";
import { StructuredData } from "@/components/layout/StructuredData";
import {
  LegalLayout,
  LegalLink,
  LegalList,
  type LegalSection,
} from "@/app/_legal/LegalLayout";
import { CONTACT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Accessibility Statement",
  description:
    "Highland Farms Oregon accessibility commitment. Learn about our efforts to make our website and property accessible to all visitors.",
  alternates: { canonical: "/accessibility" },
  robots: { index: true, follow: true },
};

const sections: LegalSection[] = [
  {
    id: "property",
    title: "Property Accessibility",
    children: (
      <>
        <p>
          Highland Farms is a working farm property set on five acres of forest and pasture land in Brightwood,
          Oregon. Due to the natural terrain, some areas of the property include uneven ground, gravel paths, and
          natural surfaces. We are happy to discuss specific accessibility needs and accommodations for your visit.
        </p>
        <p>
          Please note that our farm tours and our Nordic Spa (the wood-burning sauna, wet sauna, and cold plunge) are
          not ADA accessible. Tours cover uneven ground, and the spa sits in a natural forest setting reached by
          uneven ground and steps; neither can accommodate wheelchairs or mobility devices.
        </p>
        <p>
          Please contact us in advance so we can help plan your visit and ensure the best possible experience.
        </p>
        <p className="flex flex-wrap items-center gap-x-5 gap-y-1 whitespace-nowrap">
          <LegalLink href={`tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`}>
            {CONTACT.phone}
          </LegalLink>
          <LegalLink href={`mailto:${CONTACT.email}`}>
            {CONTACT.email}
          </LegalLink>
        </p>
      </>
    ),
  },
  {
    id: "commitment",
    title: "Our Commitment",
    children: (
      <p>
        Highland Farms is committed to ensuring digital accessibility for people with disabilities. We are continually
        improving the user experience for everyone and applying the relevant accessibility standards.
      </p>
    ),
  },
  {
    id: "conformance",
    title: "Conformance Status",
    children: (
      <p>
        We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 at Level AA. These guidelines explain
        how to make web content more accessible to people with a wide array of disabilities. Conforming to these
        guidelines also helps make content more usable for all users.
      </p>
    ),
  },
  {
    id: "measures",
    title: "Measures Taken",
    children: (
      <>
        <p>Highland Farms takes the following measures to ensure accessibility of our website:</p>
        <LegalList>
          <>Semantic HTML structure with proper heading hierarchy</>
          <>Sufficient color contrast ratios meeting WCAG AA standards</>
          <>Keyboard navigation support throughout the site, including image carousels</>
          <>ARIA labels and roles for interactive elements and landmarks</>
          <>Alt text on our photos; we are still adding it to some older images</>
          <>Accessible forms with proper labels and error messages</>
          <>Responsive design that works across screen sizes</>
          <>Respect for reduced motion preferences</>
        </LegalList>
      </>
    ),
  },
  {
    id: "limitations",
    title: "Known Limitations",
    children: (
      <>
        <p>While we strive for full accessibility, some limitations may exist:</p>
        <LegalList>
          <>
            Third-party booking widgets (Acuity Scheduling, Hospitable) are outside our direct control, though we have
            chosen providers that prioritize accessibility
          </>
          <>Some older images may have limited alt text descriptions; we are actively improving these</>
          <>Embedded content from third-party services may not fully meet WCAG 2.1 AA standards</>
        </LegalList>
      </>
    ),
  },
  {
    id: "feedback",
    title: "Feedback",
    children: (
      <>
        <p>
          We welcome your feedback on the accessibility of the Highland Farms website. If you encounter accessibility
          barriers or have suggestions for improvement, please contact us:
        </p>
        <LegalList>
          <>
            Email: <LegalLink href={`mailto:${CONTACT.email}`}>{CONTACT.email}</LegalLink>
          </>
          <>
            Phone: <LegalLink href={`tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`}>{CONTACT.phone}</LegalLink>
          </>
        </LegalList>
        <p>We read every message and reply as soon as we can.</p>
      </>
    ),
  },
];

const telHref = `tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`;

const shortVersion = (
  <aside
    aria-label="The short version"
    className="mt-5 max-w-[68ch] border border-frame bg-paper-shade px-4 py-4 lg:px-6 lg:py-5"
  >
    <p className="m-0 font-display text-[20px] font-semibold leading-tight text-ink lg:text-[23px]">
      The short version
    </p>
    <p className="m-0 mt-2 text-[15px] leading-[1.6] text-ink-body">
      Our farm tours and our Nordic Spa are not wheelchair accessible. Tours cover uneven ground, and the spa is
      reached by uneven ground and steps. Please contact us in advance so we can help plan your visit.
    </p>
    <p className="m-0 mt-2 flex flex-wrap items-center gap-x-5 text-[14px] text-ink-body">
      <LegalLink href={telHref}>{CONTACT.phone}</LegalLink>
      <LegalLink href={`mailto:${CONTACT.email}`}>{CONTACT.email}</LegalLink>
    </p>
  </aside>
);

export default function AccessibilityPage() {
  return (
    <>
      <StructuredData pathname="/accessibility" />
      <LegalLayout
        policy="accessibility"
        title="Accessibility Statement"
        updated="October 7, 2026"
        headerExtra={shortVersion}
        sections={sections}
        closing="Still have a question?"
      />
    </>
  );
}

import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ContactForm } from "@/components/forms/ContactForm";

export function InquirySection() {
  return (
    <section className="py-20 lg:py-28 bg-background">
      <Container className="max-w-4xl">
        <SectionHeading
          eyebrow="Start Planning"
          title="Check Availability"
          subtitle="Now booking 2027. Tell us your vision and we'll check availability for your preferred date."
        />

        <div className="mx-auto max-w-xl rounded-xl border border-cream-dark bg-white p-6 sm:p-8 shadow-sm">
          <ContactForm
            defaultEventType="wedding"
            heading=""
            subtitle=""
            ctaText="Check Availability"
          />
        </div>
      </Container>
    </section>
  );
}

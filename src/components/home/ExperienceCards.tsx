import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

const experiences = [
  {
    title: "Highland Cow Farm Tours",
    description:
      "Get up close with our gentle Scottish Highland Cows, Icelandic Sheep, White Peacocks, guardian dogs, chickens, and Guinea Fowl. A private 60-minute experience your family will never forget.",
    cta: "Book a Farm Tour",
    href: "/farm-tours",
    image: "/images/farm/cow-2.jpg",
    alt: "Guests petting a Highland Cow during a farm tour",
  },
  {
    title: "Nordic Forest Spa",
    description:
      "Relax in our wood burning dry sauna, unwind in the wet sauna, and refresh with our invigorating cold plunge. 90-minute sessions nestled among the evergreens.",
    cta: "Book a Session",
    href: "/nordic-spa",
    image: "/images/spa/spa-1.jpg",
    alt: "Cedar spa deck nestled in the forest at Highland Farms",
  },
];

export function ExperienceCards() {
  return (
    <section id="experiences" className="py-24 lg:py-32 bg-background">
      <Container>
        <SectionHeading
          eyebrow="Beyond the Wedding"
          title="More to Discover"
          subtitle="Highland Farms is a world unto itself. Explore our farm tours and Nordic spa."
        />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {experiences.map((exp) => (
            <div
              key={exp.title}
              className="group overflow-hidden rounded-xl bg-white shadow-sm hover:shadow-lg transition-all duration-500"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={exp.image}
                  alt={exp.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
              </div>

              <div className="p-8">
                <h3 className="text-xl font-display font-normal text-charcoal">
                  {exp.title}
                </h3>
                <p className="mt-3 text-sm text-muted leading-relaxed font-sans font-light">
                  {exp.description}
                </p>
                <div className="mt-6">
                  <Button href={exp.href} variant="outline" size="sm">
                    {exp.cta}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

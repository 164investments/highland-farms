import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StaggerChildren, StaggerItem } from "@/components/ui/StaggerChildren";

const highlights = [
  {
    title: "All-Inclusive Wedding Packages",
    description: "Your story comes first, and to make your day effortlessly magical, everything you need is woven into one enchanting price.",
    image: "/images/weddings/ceremony-2.jpg",
    alt: "Elegant outdoor dining setup at Highland Farms wedding",
  },
  {
    title: "Scottish Highland Cow Moments",
    description: "Unforgettable photo moments with our gentle Scottish Highland Cows against the ethereal Pacific Northwest forest.",
    // ceremony-3 is the homepage hero plate on desktop; a different real photo here.
    image: "/images/weddings/ceremony-1.jpg",
    alt: "A bride and groom embrace beside a Highland cow at the farm",
  },
  {
    title: "Celebrations & Corporate",
    description: "From graduations and birthday parties to corporate and family retreats, celebrate every milestone that matters.",
    image: "/images/events/celebrations-hero.jpg",
    alt: "Celebration event at Highland Farms",
    href: "/celebrations",
  },
  {
    title: "Stay on the Farm",
    description: "Commune with your closest family, and friends in our William Wallace Lodge and Bonnie Lass Cottage.",
    image: "/images/properties/lodge.jpg",
    alt: "Bonnie Lass Cottage at Highland Farms",
    href: "/stay",
  },
];

export function WeddingHighlights() {
  return (
    <section className="py-24 lg:py-32 bg-warm-white">
      <Container>
        <SectionHeading
          eyebrow="The Experience"
          title="A Wedding Venue Like No Other"
          subtitle="Five acres of enchanted forest, and farmland, a realm where love stories begin."
        />

        <StaggerChildren className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2 max-w-4xl mx-auto">
          {highlights.map((item) => (
            <StaggerItem key={item.title} className="w-full">
              <Link
                href={item.href || "/weddings"}
                className="group block h-full overflow-hidden rounded-xl bg-white shadow-sm hover:shadow-lg transition-all duration-500"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>

                <div className="p-5">
                  <h3 className="text-base font-display font-normal text-charcoal">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed font-sans font-light">
                    {item.description}
                  </p>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </Container>
    </section>
  );
}

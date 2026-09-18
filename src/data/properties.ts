import type { Property } from "@/lib/types";

export const properties: Property[] = [
  {
    slug: "whole-farm",
    name: "The Whole Farm",
    tagline: "The full Highland Farms experience",
    description:
      "Highland Farms, a hidden glen nestled in the heart of Mt. Hood National Forest, where towering ancient cedars, gentle whispering streams, and our beloved Scottish Highland Cows set the stage for unforgettable gatherings with family, friends, and the people who matter most.",
    guests: 20,
    bedrooms: 7,
    baths: 3.5,
    imageSrc: "/images/properties/whole-farm.jpg",
    bookingUrl: "/stay/whole-farm",
    hospitable_widget_url: "https://booking.hospitable.com/widget/9c273e8f-0df2-4bd3-b639-da59849e328f/1336238",
    highlights: [
      "Full farm access",
      "3 separate accommodations",
      "Perfect for large family & friend gatherings",
      "2 Cedar Hot Tubs",
    ],
  },
  {
    slug: "lodge",
    name: "William Wallace Lodge",
    tagline: "Relax & reminisce",
    description:
      "Our cedar mill lodge is a warm and inviting retreat where scenic meals, fireside conversations, and lasting memories are made. Gather in the spacious family room and dining area, then step out onto the wrap-around deck to take in sweeping views of the farm and the forest beyond.",
    guests: 8,
    bedrooms: 4,
    baths: 2.5,
    imageSrc: "/images/properties/cottage.jpg",
    bookingUrl: "/stay/lodge",
    hospitable_widget_url: "https://booking.hospitable.com/widget/9c273e8f-0df2-4bd3-b639-da59849e328f/1573840",
    highlights: [
      "Cedar Hot Tub",
      "BBQ & Blackstone",
      "Full kitchen",
      "Wood fireplace",
    ],
  },
  {
    slug: "cottage",
    name: "Bonnie Lass Cottage",
    tagline: "Retreat & converse",
    description:
      "Our Bonnie Lass Cottage is a cozy retreat neighboring our barn pasture where the Scottish Highland Cows greet you in the morning and relax with you in the evenings as you enjoy the outdoor patio.",
    guests: 8,
    bedrooms: 3,
    baths: 1,
    imageSrc: "/images/properties/lodge.jpg",
    bookingUrl: "/stay/cottage",
    hospitable_widget_url: "https://booking.hospitable.com/widget/9c273e8f-0df2-4bd3-b639-da59849e328f/1080252",
    highlights: [
      "Cedar Hot Tub",
      "BBQ",
      "Kitchenette",
      "Indoor/outdoor living",
    ],
  },
  {
    slug: "camp",
    name: "The Camp",
    tagline: "Recenter & connect",
    description:
      "A unique glamping experience featuring a restored Airstream trailer and canvas tent camping under the towering evergreens.",
    guests: 4,
    bedrooms: 1,
    baths: 1,
    imageSrc: "/images/properties/camp-1.jpg",
    bookingUrl: "/stay/camp",
    hospitable_widget_url: "https://booking.hospitable.com/widget/9c273e8f-0df2-4bd3-b639-da59849e328f/1574832",
    highlights: [
      "Airstream trailer",
      "Glamping tents",
      "Under the stars",
      "WiFi & kitchen access",
    ],
  },
];

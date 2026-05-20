const SQUARESPACE = "https://highlandfarms-oregon.squarespace.com";

export type CategoryKey =
  | "plush"
  | "apparel"
  | "mangalitsa"
  | "beef"
  | "pantry";

export interface Category {
  key: CategoryKey;
  label: string;
  shortLabel: string;
  story: string;
}

export const CATEGORIES: Category[] = [
  {
    key: "plush",
    label: "Highland Cow Plush",
    shortLabel: "Plush",
    story:
      "Weighted, microwavable plush of our two most-photographed cows. Heat for a warm, calming hug — the gift our farm-tour guests come back to buy.",
  },
  {
    key: "apparel",
    label: "Apparel",
    shortLabel: "Apparel",
    story:
      "The Dream collection — hoodies, tees, and trucker hats, designed in Brightwood.",
  },
  {
    key: "mangalitsa",
    label: "Mangalitsa Pork",
    shortLabel: "Mangalitsa",
    story:
      "The wagyu of pork. Hungarian heritage breed, marbled and rich, slow-grown on our pastures. Sold in single-cut packs.",
  },
  {
    key: "beef",
    label: "Highland Beef",
    shortLabel: "Highland Beef",
    story:
      "From our herd. Scottish Highland beef, grass-fed at the base of Mt. Hood — lean and deeply flavorful.",
  },
  {
    key: "pantry",
    label: "Farm Pantry",
    shortLabel: "Pantry",
    story:
      "Eggs from our hens, hand-tied bouquets from the farm garden, and firewood for the lodge.",
  },
];

export interface Product {
  name: string;
  price: number | null;
  priceNote?: string;
  category: CategoryKey;
  image: string;
  url: string;
  badges?: string[];
  featured?: boolean;
  soldOut?: boolean;
}

export const PRODUCTS: Product[] = [
  // Plush
  {
    name: "Princess Fiona — White Highland Cow Plush",
    price: 65.0,
    category: "plush",
    image: "/images/shop/princess-fiona-plush.jpg",
    url: `${SQUARESPACE}/shop/p/weighted-microwavable-highland-cow-plush-white`,
    badges: ["Best Seller", "Microwavable"],
    featured: true,
  },
  {
    name: "Mr. Finley — Red Highland Cow Plush",
    price: 65.0,
    category: "plush",
    image: "/images/shop/mr-finley-plush.jpg",
    url: `${SQUARESPACE}/shop/p/weighted-mircrowavable-highland-cow-plush`,
    badges: ["Microwavable"],
    featured: true,
  },

  // Apparel
  {
    name: "The Dream Hoodie",
    price: 55.0,
    category: "apparel",
    image: "/images/shop/dream-hoodie.png",
    url: `${SQUARESPACE}/shop/p/highland-farms-the-dream-hoodie`,
    badges: ["Best Seller"],
    featured: true,
  },
  {
    name: "The Dream T-Shirt",
    price: 32.0,
    category: "apparel",
    image: "/images/shop/dream-tshirt.png",
    url: `${SQUARESPACE}/shop/p/highland-farms-the-dream-t-shirt`,
  },
  {
    name: "Highland Farms Camo Trucker Hat",
    price: 35.0,
    category: "apparel",
    image: "/images/shop/camo-trucker-hat.jpg",
    url: `${SQUARESPACE}/shop/p/highland-farms-camo-trucker-hat`,
  },
  {
    name: "Logo Leather Keychain",
    price: 10.0,
    category: "apparel",
    image: "/images/shop/keychain.jpg",
    url: `${SQUARESPACE}/shop/p/highland-farms-logo-keychain-leather-branded`,
    badges: ["Genuine Leather"],
  },

  // Mangalitsa Pork (12)
  {
    name: "Thick Cut Peppered Bacon",
    price: 16.0,
    priceNote: "1 lb pack",
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-peppered-bacon.jpg",
    url: `${SQUARESPACE}/shop/p/mangalitsa-thick-cut-peppered-bacon`,
    badges: ["Heritage Breed"],
    soldOut: true,
  },
  {
    name: "Thick Cut Bacon",
    price: 16.0,
    priceNote: "1 lb pack",
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-thick-cut-bacon.jpg",
    url: `${SQUARESPACE}/shop/p/mangalitsa-thick-cut-bacon`,
    badges: ["Heritage Breed"],
    soldOut: true,
  },
  {
    name: "Cured Ham",
    price: 40.0,
    priceNote: "2.6 – 3 lbs",
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-cured-ham.png",
    url: `${SQUARESPACE}/shop/p/mangalitsa-cured-hams`,
    badges: ["Heritage Breed"],
  },
  {
    name: "Sirloin Roast",
    price: 30.0,
    priceNote: "2.13 lb",
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-sirloin-roast.jpg",
    url: `${SQUARESPACE}/shop/p/mangalitsa-sirloin-roast-213-lb`,
    badges: ["Heritage Breed"],
  },
  {
    name: "Pork Shoulder Roast",
    price: 29.0,
    priceNote: "from · choose size",
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-shoulder-roast.png",
    url: `${SQUARESPACE}/shop/p/mangalitsa-pork-roast`,
    badges: ["Heritage Breed"],
  },
  {
    name: "Baby Back Ribs",
    price: 19.0,
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-baby-back-ribs.jpg",
    url: `${SQUARESPACE}/shop/p/mangalitsa-baby-back-ribs`,
    badges: ["Heritage Breed"],
  },
  {
    name: "Spare Ribs",
    price: 30.0,
    priceNote: "from · choose size",
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-spare-ribs.jpg",
    url: `${SQUARESPACE}/shop/p/mangalitsa-spare-ribs`,
    badges: ["Heritage Breed"],
    soldOut: true,
  },
  {
    name: "Pork Tenderloin",
    price: 16.0,
    priceNote: "0.95 lb",
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-tenderloin.jpg",
    url: `${SQUARESPACE}/shop/p/mangalitsa-pork-tenderloin`,
    badges: ["Heritage Breed"],
    soldOut: true,
  },
  {
    name: "Pork Chop — Boneless",
    price: 15.0,
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-chop-boneless.jpg",
    url: `${SQUARESPACE}/shop/p/mangalitsa-pork-chop-boneless`,
    badges: ["Heritage Breed"],
  },
  {
    name: "Pork Chop — Bone-In",
    price: 14.0,
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-chop-bone-in.jpg",
    url: `${SQUARESPACE}/shop/p/mangalitsa-pork-chop-bone-in`,
    badges: ["Heritage Breed"],
  },
  {
    name: "Sausage Links",
    price: 8.0,
    priceNote: "1 lb pack",
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-sausage-links.png",
    url: `${SQUARESPACE}/shop/p/mangalitsa-special-blend-sausage`,
    badges: ["Heritage Breed"],
  },
  {
    name: "Breakfast Sausage — Ground",
    price: 8.0,
    priceNote: "1 lb pack",
    category: "mangalitsa",
    image: "/images/shop/mangalitsa-breakfast-sausage.jpg",
    url: `${SQUARESPACE}/shop/p/mangalitsa-breakfast-sausage`,
    badges: ["Heritage Breed"],
  },

  // Highland Beef
  {
    name: "Top Sirloin Ground Beef",
    price: 9.0,
    priceNote: "1 lb",
    category: "beef",
    image: "/images/shop/ground-beef.jpg",
    url: `${SQUARESPACE}/shop/p/ground-beef`,
    badges: ["From Our Herd"],
  },
  {
    name: "New York Steak",
    price: 21.0,
    category: "beef",
    image: "/images/shop/ny-steak.jpg",
    url: `${SQUARESPACE}/shop/p/highland-beef-new-york-steak`,
    badges: ["From Our Herd"],
    soldOut: true,
  },
  {
    name: "Tenderloin Steak",
    price: 29.0,
    category: "beef",
    image: "/images/shop/tenderloin-steak.jpg",
    url: `${SQUARESPACE}/shop/p/highland-beef-tenderloin-steak`,
    badges: ["From Our Herd"],
    soldOut: true,
  },

  // Pantry
  {
    name: "Farm Fresh Eggs",
    price: 8.0,
    priceNote: "dozen",
    category: "pantry",
    image: "/images/shop/eggs.jpg",
    url: `${SQUARESPACE}/shop/p/a-dozen-eggs`,
    badges: ["Laid This Week"],
    featured: true,
  },
  {
    name: "Fresh Flower Bouquet",
    price: 25.0,
    category: "pantry",
    image: "/images/shop/fresh-flower-bouquet.jpg",
    url: `${SQUARESPACE}/shop/p/fresh-flower-bouquet`,
    badges: ["Farm Garden"],
    soldOut: true,
  },
  {
    name: "Dried Flower Bouquet",
    price: 15.0,
    category: "pantry",
    image: "/images/shop/dried-flower-bouquet.jpg",
    url: `${SQUARESPACE}/shop/p/dried-flower-bouquet`,
    badges: ["Farm Garden"],
  },
  {
    name: "Firewood & Kindling",
    price: 9.0,
    category: "pantry",
    image: "/images/shop/firewood.jpg",
    url: `${SQUARESPACE}/shop/p/firewood`,
    badges: ["For Farm Stays"],
  },
];

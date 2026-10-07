// Package details from Anne (AJ) Frankson: the October 5, 2026 package email,
// her October 6 group-spa answer, and the October 6 edits she and Jalene sent.
// November 24–28 is four nights; the first email's lone "three nights" was a typo.
// Stay-package terms must be confirmed by the team, not borrowed from tours/spa.
export const thanksgiving = {
  title: "A Highland Farms Thanksgiving",
  dates: "November 24 to 28, 2026",
  nights: 4,
  email: "info@highlandfarms-oregon.com",
  // The farm's sales line (Hayden, 2026-09-14): the fallback when a mail app will not open.
  phone: "(971) 236-2551",
  packages: [
    {
      id: "lodge",
      name: "The Lodge",
      sleeps: 8,
      price: 5000,
      forWho: "For one family under one roof, around one table.",
      description:
        "William Wallace Lodge: four bedrooms, a full kitchen, a wood fireplace, a cedar hot tub and a dining room that seats ten.",
      stay: "William Wallace Lodge",
      spa: "1 session",
      cta: "Check availability",
    },
    {
      id: "whole-farm",
      name: "The Whole Farm",
      sleeps: 20,
      price: 11000,
      forWho: "For the whole family, grandparents to cousins, across the Lodge, the Cottage and the Camp.",
      description:
        "The Lodge, Bonnie Lass Cottage and the Camp, with a cedar hot tub at the Lodge and another at the Cottage.",
      stay: "Lodge, Cottage and Camp",
      spa: "2 sessions",
      cta: "Check availability",
    },
  ],
  // The three stays, shown above the package comparison.
  // Filename trap: properties/cottage.jpg is the Lodge, properties/lodge.jpg is the Cottage.
  stays: [
    { src: "/images/properties/cottage.jpg", alt: "Cedar-sided William Wallace Lodge with its wrap-around deck", label: "Lodge", position: "object-[45%_55%]" },
    { src: "/images/properties/lodge.jpg", alt: "Bonnie Lass Cottage with its cedar exterior, metal roof and outdoor patio", label: "Cottage", position: "object-[50%_60%]" },
    { src: "/images/properties/camp-1.jpg", alt: "Silver Airstream and outdoor seating at the Highland Farms Camp", label: "Camp", position: "object-[50%_62%]" },
  ],
  // Selling order. Every number here came from the team's October 6 edits.
  inclusions: [
    {
      term: "Thanksgiving dinner, cooked for you",
      detail:
        "Our in-house chef and team cook a menu you shape around your family's favorites and allergies, so your traditions make the table. Dishes and cleanup are on us, and the leftovers go in your fridge.",
    },
    {
      term: "Four nights on the farm",
      detail: "Arrive Tuesday, November 24. Leave Saturday, November 28. Thanksgiving dinner is Thursday.",
    },
    {
      term: "A welcome farm tour",
      detail:
        "One guided hour when you check in, up close with the Scottish Highland cows and the sheep, peacocks and guardian dogs that share the farm.",
    },
    {
      term: "A family photoshoot",
      detail:
        "One hour around the property with our in-house photographer, and 35 edited photos to keep. Photos are taken on the grounds, not in with the animals.",
    },
    {
      term: "Nordic spa time",
      detail:
        "1 session with the Lodge, 2 with the whole farm: wood-burning sauna, wet sauna and cold plunge in the forest. Ages 16 and up. Sessions can't be on Thanksgiving Day; the team plans them with you.",
    },
    {
      term: "Breakfast in the fridge",
      detail: "Highland Farms eggs and sausage, waiting when you arrive. Cook them whenever you like.",
      upgradeMark: true,
    },
    {
      term: "Your itinerary, planned with you",
      detail: "Once you book, the team builds a detailed plan for your four days with you and sends it before you arrive.",
    },
  ],
  // The only optional upgrade (wine pairing and the spa charcuterie were dropped October 6).
  upgrade:
    "Want it cooked for you? Add a chef-cooked country breakfast on Friday morning, with Highland Farms eggs and sausage and signature sides. Ask for pricing.",
  steps: [
    {
      title: "Send an inquiry.",
      detail:
        "Tell us which package, how many are coming, how many are 16 or older, and any allergies. It reserves nothing and commits you to nothing.",
    },
    {
      title: "The team confirms the details.",
      detail: "Availability, taxes, payment and the stay's cancellation terms, all before you commit.",
    },
    {
      title: "Plan your four days together.",
      detail: "Arrive to a plan. The team sends your itinerary before you drive up.",
    },
  ],
  faqs: [
    {
      question: "What are the dates?",
      answer:
        "Four nights: arrive Tuesday, November 24, 2026, and leave Saturday, November 28. Thanksgiving dinner is Thursday, November 26. The team confirms check-in and check-out times when you book.",
    },
    {
      question: "Which package is right for us?",
      answer:
        "The Lodge package is William Wallace Lodge, which sleeps 8, for $5,000. The Whole Farm package adds Bonnie Lass Cottage and the Camp, sleeps 20, and includes 2 spa sessions instead of 1, for $11,000. Dinner, breakfast, the farm tour, the photoshoot and your itinerary come with both. Not sure? Send your headcount and the team will help you choose.",
    },
    {
      question: "Is breakfast cooked by a chef?",
      answer:
        "No. The included breakfast is Highland Farms eggs and sausage, in your fridge when you arrive, for you to cook whenever you like. If you'd like a chef to cook for you, add the country breakfast upgrade: a chef-cooked breakfast on Friday morning with Highland Farms eggs and sausage and signature sides. Ask for pricing when you inquire.",
    },
    {
      question: "How does the spa work?",
      answer:
        "The Lodge package includes 1 Nordic spa session, and the Whole Farm package includes 2. The spa has a wood-burning dry sauna, a wet sauna and a cold plunge in the forest. Robes and towels are provided, so just bring a swimsuit. It's for guests 16 and older, and sessions can't be scheduled on Thanksgiving Day. After you book, the team asks how many adults and kids are coming and plans the sessions with you.",
    },
    {
      question: "Can we bring the kids?",
      answer:
        "Yes. Dinner, breakfast, the farm tour and the photoshoot are for the whole family. The spa is for ages 16 and up, so tell us how many guests are under 16 when you inquire. The farm paths aren't stroller friendly.",
    },
    {
      question: "Can you work around allergies and dietary needs?",
      answer:
        "Yes. You shape the Thanksgiving menu with the team around your family's preferences and allergies. List them in your inquiry so the team can plan from the start.",
    },
    {
      question: "What about the other meals?",
      answer:
        "Thanksgiving dinner and the breakfast package are the meals included. The Lodge has a full kitchen for the rest of your stay.",
    },
    {
      question: "What should we bring?",
      answer:
        "Swimsuits for the spa, closed-toe shoes for the farm tour, and rain boots and a rain jacket, because the farm is outdoors and late November here is wet. And tell the team your family's must-have dishes when you plan the menu.",
    },
    {
      question: "Is a day on Mt. Hood included?",
      answer:
        "No. Mountain activities aren't part of the package. If you're planning a day on the mountain, mention it when you inquire and the team can tell you what fits.",
    },
    {
      question: "Can we bring our dog?",
      answer: "No. Outside pets aren't allowed at Highland Farms. Service animals are permitted under ADA requirements.",
    },
    {
      question: "How do we book?",
      answer:
        "Tap any \"Check availability\" button to open a ready-to-send email, write to info@highlandfarms-oregon.com, or call (971) 236-2551. Include your package, guest count, how many are 16 or older, and any allergies. The team confirms availability, taxes, payment and the stay's cancellation terms before you commit. An inquiry doesn't reserve the stay, and there is no online checkout for this package.",
    },
  ],
} as const;

export type ThanksgivingPackage = (typeof thanksgiving.packages)[number];

/** Price per guest when every bed is filled, rounded to the dollar. */
export function perGuest(pkg: ThanksgivingPackage) {
  return Math.round(pkg.price / pkg.sleeps);
}

export function thanksgivingInquiryHref(pkg?: ThanksgivingPackage) {
  const label = pkg ? `${pkg.name} (sleeps ${pkg.sleeps})` : undefined;
  const subject = `Thanksgiving 2026 inquiry${label ? `: ${label}` : ""}`;
  const body = [
    "Hello Highland Farms,",
    "",
    `We'd love to spend Thanksgiving on the farm, ${thanksgiving.dates}.`,
    "",
    `Package: ${label ?? "The Lodge (sleeps 8) or The Whole Farm (sleeps 20)?"}`,
    "Total guests:",
    "Guests 16 and older:",
    "Guests under 16:",
    "Allergies or dietary needs:",
    "Friday country breakfast upgrade? (yes / no / send pricing)",
    "",
    "Name:",
    "Phone:",
    "",
    "Thank you!",
    "",
  ].join("\n");
  return `mailto:${thanksgiving.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

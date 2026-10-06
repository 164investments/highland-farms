// Package details supplied by Anne Frankson, October 5, 2026.
// November 24–28 is four nights; the email's lone "three nights" was a typo.
// Stay-package terms must be confirmed by the team, not borrowed from tours/spa.
export const thanksgiving = {
  title: "A Highland Farms Thanksgiving",
  dates: "November 24–28, 2026",
  nights: 4,
  email: "info@highlandfarms-oregon.com",
  packages: [
    {
      id: "lodge",
      name: "Thanksgiving at the Lodge",
      accommodation: "William Wallace Lodge",
      guests: 8,
      price: 5000,
      description: "Bring your family together in the Lodge, with space for eight and a table to gather around.",
      image: "/images/properties/lodge-dining-pro.jpg",
      alt: "Wood dining table and chairs beneath the cedar ceiling of William Wallace Lodge",
    },
    {
      id: "whole-farm",
      name: "The Whole Farm Thanksgiving",
      accommodation: "Full private farm stay",
      guests: 20,
      price: 11000,
      description: "Make the farm yours for the holiday, with the Lodge, Cottage and Camp reserved together.",
      image: "/images/properties/whole-farm.jpg",
      alt: "Highland Farms accommodations and grounds surrounded by Oregon evergreens",
    },
  ],
  inclusions: [
    { title: "Four nights on the farm", description: "Settle into our countryside accommodations, surrounded by towering evergreens and fresh mountain air." },
    { title: "Thanksgiving dinner", description: "A farm-to-table holiday feast with farm-fresh turkey, seasonal produce from local farmers, and a menu celebrating the harvest." },
    { title: "Friday breakfast package", description: "Highland Farms sausage, farm-fresh eggs and seasonal accompaniments for the morning after Thanksgiving." },
    { title: "A Nordic spa session", description: "Warm up in the sauna, take a refreshing cold plunge, and slow down in the forest." },
    { title: "A guided farm tour", description: "Meet our Scottish Highland cows, get to know their personalities, and hear the stories behind the farm." },
    { title: "A fall family photoshoot", description: "Capture your Thanksgiving together against the autumn scenery of Highland Farms." },
    { title: "Time to explore the grounds", description: "Enjoy access to the farm grounds throughout your stay, with time for quiet walks and the simple pleasures of farm life." },
  ],
  upgrades: ["Premium local wine pairing with dinner", "A private in-house chef for Friday breakfast", "A spa charcuterie plate"],
  faqs: [
    { question: "What are the dates?", answer: "The package is November 24–28, 2026: four nights, arriving Tuesday and departing Saturday. Thanksgiving dinner is Thursday, November 26, and the breakfast package is for Friday morning. The team will confirm arrival and departure times when you book." },
    { question: "Which package is right for our group?", answer: "The $5,000 Lodge package is for a family of eight. The $11,000 full private farm stay is for a family of twenty, with the Lodge, Cottage and Camp reserved together. Email us with your group size to discuss the best fit and sleeping arrangements." },
    { question: "Will everyone use the spa at the same time?", answer: "A Nordic spa session is included in each package. Please ask the team to confirm session timing and how your group's spa visits will be arranged when you inquire." },
    { question: "Is Friday breakfast prepared by a chef?", answer: "The included breakfast package features Highland Farms sausage, farm-fresh eggs and seasonal accompaniments. A private in-house chef for that breakfast is an optional upgrade." },
    { question: "How do we book?", answer: "Email info@highlandfarms-oregon.com with your preferred package, guest count and any questions. The team will confirm availability, applicable taxes, optional upgrade pricing, payment details and the stay package's cancellation terms before you commit. Sending an inquiry does not reserve the stay." },
    { question: "Can you accommodate dietary needs?", answer: "Please include any allergies or dietary needs in your inquiry so the team can confirm what can be accommodated before you book." },
    { question: "Is a day on Mt. Hood included?", answer: "You'll be near Mt. Hood for a mountain day during your stay. Mountain activities, lift tickets and transportation are not listed as package inclusions; ask the team if you'd like help planning your visit." },
  ],
} as const;

export function thanksgivingInquiryHref(packageName?: string, guests?: number) {
  const subject = `${thanksgiving.title} 2026${packageName ? `: ${packageName}` : ""}`;
  const body = `Hello Highland Farms,\n\nI'm interested in the ${thanksgiving.dates} four-night Thanksgiving stay${packageName ? `, ${packageName}` : ""}.\n\nGuest count: ${guests ?? ""}\nOptional upgrades or dietary needs: \n\nPlease confirm availability and booking details.\n`;
  return `mailto:${thanksgiving.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

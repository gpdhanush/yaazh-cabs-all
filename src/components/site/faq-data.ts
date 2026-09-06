export const FALLBACK_FAQS = [
  {
    q: "How do I book a cab with Yaazh Cabs?",
    a: "Fill the booking form on this page or call 93600 55761. We confirm your cab, driver name and number on WhatsApp within minutes.",
  },
  {
    q: "Do you charge for the return trip on one-way rides?",
    a: "No. One-way trips are billed only for the distance you travel, plus driver bata and applicable tolls or permits.",
  },
  {
    q: "Are night-time and early morning pickups available?",
    a: "Yes. We operate 24x7, including airport pickups at 2 AM. Book at least 3 hours ahead for night trips wherever possible.",
  },
  {
    q: "Which vehicles can I choose from?",
    a: "Dzire sedans, Ertiga and Innova MPVs, full-size SUVs and 14-seat tempo travellers for groups and tour packages.",
  },
  {
    q: "How is the final fare calculated?",
    a: "Base fare plus per-kilometre rate for your chosen vehicle. Tolls, parking, state permits and driver allowance are billed at actuals and shown up front.",
  },
  {
    q: "Do you cover Ooty, Kodaikanal and Kerala?",
    a: "Absolutely. Outstation and tour packages to Ooty, Kodaikanal, Valparai, Munnar and across Kerala are among our most-booked trips.",
  },
];

export const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FALLBACK_FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

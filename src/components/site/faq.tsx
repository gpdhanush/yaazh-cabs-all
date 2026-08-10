"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


const faqs = [
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
    a: "Yes. We operate 24×7, including airport pickups at 2 AM. Book at least 3 hours ahead for night trips wherever possible.",
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

export function FAQ() {
  return (
    <section id="faq" className="py-16 md:py-28">
      <div className="mx-auto max-w-3xl px-5 md:px-8">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.28em] text-primary sm:text-[11px]">FAQ</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl md:text-5xl">
            Good to <span className="text-gradient-gold">know</span>
          </h2>
        </div>

        <div className="mt-10">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`item-${i}`} className="border-border">
                <AccordionTrigger className="text-left font-display text-base font-semibold hover:text-primary hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

export const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

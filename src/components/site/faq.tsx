"use client";

import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getFaqs, isApiConfigured, type PublicFaq } from "@/lib/api";
import { Reveal } from "./motion-primitives";
import { FALLBACK_FAQS } from "./faq-data";

function toDisplay(rows: PublicFaq[]) {
  return rows.map((f) => ({ q: f.question, a: f.answer, id: f.id }));
}

export function FAQ() {
  const [faqs, setFaqs] = useState(FALLBACK_FAQS.map((f, i) => ({ ...f, id: `fallback-${i}` })));

  useEffect(() => {
    if (!isApiConfigured()) return;
    getFaqs()
      .then((rows) => {
        if (rows.length) setFaqs(toDisplay(rows));
      })
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  return (
    <section id="faq" className="py-16 md:py-28">
      <div className="mx-auto max-w-3xl px-5 md:px-8">
        <Reveal>
          <div className="text-center">
            <p className="section-kicker">FAQ</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl md:text-5xl">
              Good to <span className="text-brand">know</span>
            </h2>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="mt-10">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={f.id} value={`item-${i}`} className="border-border">
                <AccordionTrigger className="text-left font-display text-base font-semibold hover:text-brand hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { SmoothScroll, CursorBlob } from "@/components/site/motion-primitives";
import { SiteNav } from "@/components/site/nav";
import { Hero } from "@/components/site/hero";
import { Partners } from "@/components/site/partners";
import { Services } from "@/components/site/services";
import { PopularRoutes } from "@/components/site/routes-scroll";
import { Fleet } from "@/components/site/fleet";
import { FareEstimator } from "@/components/site/fare-estimator";
import { BookingProcess } from "@/components/site/booking-process";
import { Stats } from "@/components/site/stats";
import { Testimonials } from "@/components/site/testimonials";
import { Gallery } from "@/components/site/gallery";
import { FAQ, faqJsonLd } from "@/components/site/faq";
import { SiteFooter } from "@/components/site/footer";
import { Toaster } from "@/components/ui/sonner";

const title = "Yaazh Cabs Udumalpet | Airport, Outstation & Tour Taxi";
const description =
  "Book chauffeur-driven sedans, Ertiga, Innova, SUV and tempo traveller cabs in Udumalpet. Airport transfers, one-way, round trip and Ooty–Kodaikanal tour packages, 24×7.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TaxiService",
          name: "Yaazh Cabs",
          areaServed: "Udumalpet, Tamil Nadu",
          telephone: "+919360055761",
          slogan: "Safe journey, every time",
        }),
      },
      { type: "application/ld+json", children: JSON.stringify(faqJsonLd) },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <motion.main
      initial={{ opacity: 0, scale: 0.99, filter: "blur(8px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <SmoothScroll />
      <CursorBlob />
      <SiteNav />
      <Hero />
      <Partners />
      <Services />
      <PopularRoutes />
      <Fleet />
      <FareEstimator />
      <BookingProcess />
      <Stats />
      <Testimonials />
      <Gallery />
      <FAQ />
      <SiteFooter />
      <Toaster position="top-center" />
    </motion.main>
  );
}

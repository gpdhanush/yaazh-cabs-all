import { createFileRoute } from "@tanstack/react-router";
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
import { ChatWidget } from "@/components/site/chat-widget";
import { Toaster } from "@/components/ui/sonner";

const title = "Yaazh Cabs Udumalpet | Airport, Outstation & Tour Taxi";
const description =
  "Book chauffeur-driven sedans, Ertiga, Innova, SUV and tempo traveller cabs in Udumalpet. Airport transfers, one-way, round trip and Ooty–Kodaikanal tour packages, 24×7.";
const url = "https://luxe-motion-ride.lovable.app/";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { property: "og:site_name", content: "Yaazh Cabs" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
    links: [{ rel: "canonical", href: url }],
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
          url,
        }),
      },
      { type: "application/ld+json", children: JSON.stringify(faqJsonLd) },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main id="top" className="relative">
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
      <ChatWidget />
      <Toaster position="top-center" />
    </main>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/site/nav";
import { Hero } from "@/components/site/hero";
import { Services } from "@/components/site/services";
import { PopularRoutes } from "@/components/site/routes-scroll";
import { Fleet } from "@/components/site/fleet";
import { FareEstimator } from "@/components/site/fare-estimator";
import { BookingProcess } from "@/components/site/booking-process";
import { Stats } from "@/components/site/stats";
import { Testimonials } from "@/components/site/testimonials";
import { Gallery } from "@/components/site/gallery";
import { Contact } from "@/components/site/contact";
import { FAQ, faqJsonLd } from "@/components/site/faq";
import { SiteFooter } from "@/components/site/footer";
import { ChatWidget } from "@/components/site/chat-widget";
import { Toaster } from "@/components/ui/sonner";

const title = "Yaazh Cabs Udumalpet | Airport, Outstation & Tour Taxi";
const description =
  "Book chauffeur-driven sedans, Ertiga, Innova, SUV and tempo traveller cabs in Udumalpet. Airport transfers, one-way, round trip and Ooty–Kodaikanal tour packages, 24×7.";
const url = "https://yaazhcabs.in/";

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
          email: "hello@yaazhcabs.in",
          slogan: "Safe journey, every time",
          url,
          address: {
            "@type": "PostalAddress",
            addressLocality: "Udumalpet",
            addressRegion: "Tamil Nadu",
            postalCode: "642126",
            addressCountry: "IN",
          },
          geo: {
            "@type": "GeoCoordinates",
            latitude: 10.551642,
            longitude: 77.306707,
          },
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
      <Services />
      <PopularRoutes />
      <Fleet />
      <FareEstimator />
      <BookingProcess />
      <Stats />
      <Testimonials />
      <Gallery />
      <Contact />
      <FAQ />
      <SiteFooter />
      <ChatWidget />
      <Toaster position="top-center" />
    </main>
  );
}

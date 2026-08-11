import { loadEnv } from "../config/env.js";
import { authService } from "../services/auth.service.js";
import { prisma } from "../config/database.js";
import { hashPassword } from "../utils/crypto.js";

const YAAZH_FAQS = [
  {
    question: "How do I book a cab with Yaazh Cabs?",
    answer:
      "Fill the booking form on this page or call 93600 55761. We confirm your cab, driver name and number on WhatsApp within minutes.",
  },
  {
    question: "Do you charge for the return trip on one-way rides?",
    answer:
      "No. One-way trips are billed only for the distance you travel, plus driver bata and applicable tolls or permits.",
  },
  {
    question: "Are night-time and early morning pickups available?",
    answer:
      "Yes. We operate 24×7, including airport pickups at 2 AM. Book at least 3 hours ahead for night trips wherever possible.",
  },
  {
    question: "Which vehicles can I choose from?",
    answer:
      "Dzire sedans, Ertiga and Innova MPVs, full-size SUVs and 14-seat tempo travellers for groups and tour packages.",
  },
  {
    question: "How is the final fare calculated?",
    answer:
      "Base fare plus per-kilometre rate for your chosen vehicle. Tolls, parking, state permits and driver allowance are billed at actuals and shown up front.",
  },
  {
    question: "Do you cover Ooty, Kodaikanal and Kerala?",
    answer:
      "Absolutely. Outstation and tour packages to Ooty, Kodaikanal, Valparai, Munnar and across Kerala are among our most-booked trips.",
  },
] as const;

const YAAZH_TESTIMONIALS = [
  {
    customer_name: "Karthik R.",
    review:
      "Booked an Innova for a Kodaikanal trip. Driver was on time, car spotless, and the fare was exactly what was quoted.",
    rating: 5,
  },
  {
    customer_name: "Divya S.",
    review:
      "3 AM airport drop and they confirmed on WhatsApp within minutes. This is my go-to cab service now.",
    rating: 5,
  },
  {
    customer_name: "Mohan Kumar",
    review: "We use Yaazh for all our company guest pickups. Billing is clean and drivers are courteous.",
    rating: 5,
  },
  {
    customer_name: "Anitha P.",
    review: "Valparai tour package was well planned. The driver knew every viewpoint worth stopping at.",
    rating: 5,
  },
  {
    customer_name: "Suresh V.",
    review: "Fair pricing for one-way. No hidden return charges like other operators.",
    rating: 5,
  },
  {
    customer_name: "Lakshmi N.",
    review: "Travelled with my elderly parents. The driver was patient and helped with luggage throughout.",
    rating: 5,
  },
] as const;

/** Popular one-way specials from Udumalpet (website). */
const YAAZH_ROUTES: Array<{
  fromSlug: string;
  toSlug: string;
  fromName: string;
  toName: string;
  distanceKm: number;
  durationMinutes: number;
  price: number;
  tag: string;
}> = [
  { fromSlug: "udumalpet", toSlug: "palani", fromName: "Udumalpet", toName: "Palani", distanceKm: 55, durationMinutes: 65, price: 1500, tag: "Temple town" },
  { fromSlug: "udumalpet", toSlug: "coimbatore", fromName: "Udumalpet", toName: "Coimbatore", distanceKm: 68, durationMinutes: 80, price: 2700, tag: "City ride" },
  { fromSlug: "udumalpet", toSlug: "madurai", fromName: "Udumalpet", toName: "Madurai", distanceKm: 165, durationMinutes: 180, price: 3600, tag: "One way" },
  { fromSlug: "udumalpet", toSlug: "dindigul", fromName: "Udumalpet", toName: "Dindigul", distanceKm: 120, durationMinutes: 135, price: 2900, tag: "One way" },
  { fromSlug: "udumalpet", toSlug: "munnar", fromName: "Udumalpet", toName: "Munnar", distanceKm: 145, durationMinutes: 210, price: 4000, tag: "Hill station" },
  { fromSlug: "udumalpet", toSlug: "theni", fromName: "Udumalpet", toName: "Theni", distanceKm: 130, durationMinutes: 165, price: 3300, tag: "One way" },
  { fromSlug: "udumalpet", toSlug: "tiruppur", fromName: "Udumalpet", toName: "Tiruppur", distanceKm: 95, durationMinutes: 120, price: 2700, tag: "Knit city" },
  { fromSlug: "udumalpet", toSlug: "erode", fromName: "Udumalpet", toName: "Erode", distanceKm: 110, durationMinutes: 135, price: 3000, tag: "One way" },
  { fromSlug: "udumalpet", toSlug: "karur", fromName: "Udumalpet", toName: "Karur", distanceKm: 140, durationMinutes: 165, price: 3600, tag: "One way" },
];

async function ensureCity(name: string, slug: string, state = "Tamil Nadu") {
  const existing = await prisma.cities.findFirst({ where: { slug } });
  if (existing) return existing;
  return prisma.cities.create({
    data: { name, slug, state, is_active: true },
  });
}

async function seedWebsiteCatalog() {
  // Public company settings for the website
  const settings: Array<{ key: string; value: string; group: string }> = [
    { key: "company_name", value: "Yaazh Cabs", group: "company" },
    { key: "support_phone", value: "9360055761", group: "company" },
    { key: "support_phone_secondary", value: "6369022364", group: "company" },
    { key: "support_email", value: "hello@yaazhcabs.in", group: "company" },
    { key: "whatsapp_number", value: "917845456609", group: "company" },
    { key: "business_address", value: "Udumalpet, Tiruppur District, Tamil Nadu 642126", group: "company" },
    { key: "business_hours", value: "Open 24×7", group: "company" },
    { key: "booking_fare_note", value: "Note: Toll, parking & permit charges are extra and billed at actuals.", group: "fare" },
    { key: "maps_share_url", value: "https://maps.app.goo.gl/EUCRv1piSHwJybDD7?g_st=aw", group: "company" },
    { key: "map_lat", value: "10.551642", group: "company" },
    { key: "map_lng", value: "77.306707", group: "company" },
  ];
  for (const s of settings) {
    await prisma.appSettings.upsert({
      where: { setting_key: s.key },
      create: {
        setting_key: s.key,
        setting_value: s.value,
        value_type: "string",
        group_name: s.group,
        is_public: true,
      },
      update: {
        setting_value: s.value,
        is_public: true,
        group_name: s.group,
      },
    });
  }
  console.log("Public app settings updated for Yaazh website.");

  const faqCount = await prisma.faqs.count();
  if (faqCount === 0) {
    await prisma.faqs.createMany({
      data: YAAZH_FAQS.map((f, i) => ({
        question: f.question,
        answer: f.answer,
        related_type: "general" as const,
        display_order: i + 1,
        is_active: true,
      })),
    });
    console.log(`Seeded ${YAAZH_FAQS.length} FAQs.`);
  } else {
    console.log(`FAQs already present (${faqCount}).`);
  }

  const testimonialCount = await prisma.testimonials.count({
    where: { approval_status: "approved" },
  });
  if (testimonialCount === 0) {
    await prisma.testimonials.createMany({
      data: YAAZH_TESTIMONIALS.map((t) => ({
        customer_name: t.customer_name,
        rating: t.rating,
        review: t.review,
        approval_status: "approved" as const,
        is_featured: true,
        approved_at: new Date(),
      })),
    });
    console.log(`Seeded ${YAAZH_TESTIMONIALS.length} testimonials.`);
  } else {
    console.log(`Testimonials already present (${testimonialCount}).`);
  }

  // Extra cities used by Yaazh popular routes
  const cityDefs = [
    ["Udumalpet", "udumalpet"],
    ["Palani", "palani"],
    ["Coimbatore", "coimbatore"],
    ["Madurai", "madurai"],
    ["Dindigul", "dindigul"],
    ["Munnar", "munnar"],
    ["Theni", "theni"],
    ["Tiruppur", "tiruppur"],
    ["Erode", "erode"],
    ["Karur", "karur"],
    ["Pollachi", "pollachi"],
    ["Ooty", "ooty"],
    ["Kodaikanal", "kodaikanal"],
  ] as const;
  for (const [name, slug] of cityDefs) {
    await ensureCity(name, slug, slug === "munnar" ? "Kerala" : "Tamil Nadu");
  }

  const sedan = await prisma.vehicleCategories.findFirst({
    where: { is_active: true },
    orderBy: { display_order: "asc" },
  });

  for (const r of YAAZH_ROUTES) {
    const from = await ensureCity(r.fromName, r.fromSlug);
    const to = await ensureCity(r.toName, r.toSlug, r.toSlug === "munnar" ? "Kerala" : "Tamil Nadu");
    const slug = `${r.fromSlug}-to-${r.toSlug}-cabs`;
    let route = await prisma.routes.findFirst({ where: { slug } });
    if (!route) {
      route = await prisma.routes.create({
        data: {
          pickup_city_id: from.id,
          drop_city_id: to.id,
          slug,
          title: `${r.fromName} to ${r.toName} Cabs`,
          distance_km: r.distanceKm,
          duration_minutes: r.durationMinutes,
          content: r.tag,
          is_popular: true,
          is_active: true,
        },
      });
      console.log(`Route created: ${slug}`);
    } else {
      await prisma.routes.update({
        where: { id: route.id },
        data: {
          distance_km: r.distanceKm,
          duration_minutes: r.durationMinutes,
          content: r.tag,
          is_popular: true,
          is_active: true,
        },
      });
    }

    if (sedan) {
      const existingTariff = await prisma.tariffPlans.findFirst({
        where: {
          vehicle_category_id: sedan.id,
          trip_type: "one_way",
          route_id: route.id,
          is_active: true,
        },
      });
      if (!existingTariff) {
        await prisma.tariffPlans.create({
          data: {
            vehicle_category_id: sedan.id,
            trip_type: "one_way",
            route_id: route.id,
            rate_per_km: 0,
            base_fare: r.price,
            driver_batta: 0,
            minimum_km: 0,
            minimum_fare: r.price,
            effective_from: new Date(),
            is_active: true,
          },
        });
      }
    }
  }

  // Ensure SUV / Tempo categories for website fleet parity
  const extras = [
    {
      name: "SUV 7+1",
      slug: "suv-7-1",
      seating_capacity: 7,
      luggage_capacity: "5 bags",
      description: "Highway cruiser AC SUV",
      one_way_rate_per_km: 23,
      round_trip_rate_per_km: 21,
      driver_batta: 500,
      display_order: 5,
    },
    {
      name: "Tempo Traveller 12+1",
      slug: "tempo-12-1",
      seating_capacity: 14,
      luggage_capacity: "10 bags",
      description: "Group travel AC tempo traveller",
      one_way_rate_per_km: 28,
      round_trip_rate_per_km: 26,
      driver_batta: 700,
      display_order: 6,
    },
  ];
  for (const v of extras) {
    const exists = await prisma.vehicleCategories.findFirst({ where: { slug: v.slug } });
    if (!exists) {
      const created = await prisma.vehicleCategories.create({
        data: {
          ...v,
          minimum_km_per_day: 250,
          is_active: true,
        },
      });
      await prisma.tariffPlans.createMany({
        data: [
          {
            vehicle_category_id: created.id,
            trip_type: "one_way",
            route_id: null,
            rate_per_km: v.one_way_rate_per_km,
            base_fare: 0,
            driver_batta: v.driver_batta,
            minimum_km: 0,
            minimum_fare: 0,
            effective_from: new Date(),
            is_active: true,
          },
          {
            vehicle_category_id: created.id,
            trip_type: "round_trip",
            route_id: null,
            rate_per_km: v.round_trip_rate_per_km,
            base_fare: 0,
            driver_batta: v.driver_batta,
            minimum_km: 250,
            minimum_fare: 0,
            effective_from: new Date(),
            is_active: true,
          },
        ],
      });
      console.log(`Vehicle category created: ${v.slug}`);
    }
  }
}

async function main() {
  loadEnv();

  const email = process.env.SEED_ADMIN_EMAIL || "admin@yaazh.local";
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const name = process.env.SEED_ADMIN_NAME || "Super Admin";

  const admin = await authService.ensureSeedAdmin(email, password, name);
  console.log(`Admin ready: ${admin.email} (id ${String(admin.id)})`);

  if (process.env.SEED_DEMO_DRIVER !== "false") {
    const phone = process.env.SEED_DRIVER_PHONE || "9000000001";
    const driverPassword = process.env.SEED_DRIVER_PASSWORD || "Password123!";
    const existing = await prisma.drivers.findUnique({ where: { phone } });
    if (!existing) {
      const driver = await prisma.drivers.create({
        data: {
          name: "Demo Driver",
          phone,
          password_hash: await hashPassword(driverPassword),
          verification_status: "approved",
          online_status: "offline",
          availability_status: "available",
          is_active: true,
        },
      });
      console.log(`Demo driver ready: ${driver.phone} (id ${String(driver.id)})`);
    } else if (!existing.password_hash) {
      await prisma.drivers.update({
        where: { id: existing.id },
        data: {
          password_hash: await hashPassword(driverPassword),
          verification_status: "approved",
          is_active: true,
        },
      });
      console.log(`Demo driver password updated: ${phone}`);
    } else {
      console.log(`Demo driver already exists: ${phone}`);
    }
  }

  await seedWebsiteCatalog();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

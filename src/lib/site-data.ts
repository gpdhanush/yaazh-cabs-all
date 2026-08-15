import sedan from "@/assets/car-sedan.jpg";
import mpv from "@/assets/car-mpv.jpg";
import suv from "@/assets/car-suv.jpg";
import tempo from "@/assets/car-tempo.jpg";

/** Short marketing name; tempo variants stay distinguishable via seats. */
export function shortVehicleName(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("sedan") || lower.includes("dzire")) return "Dzire";
  if (lower.includes("ertiga")) return "Ertiga";
  if (lower.includes("innova")) return "Innova";
  if (lower.includes("crysta") || lower.includes("suv")) return "SUV";
  if (lower.includes("eicher") || lower.includes("mini bus")) return "Eicher Mini Bus";
  if (lower.includes("tempo")) return "Tempo Traveller";
  return name;
}

export function vehicleSeatsLabel(name: string, seating: number) {
  const plusOne = name.match(/(\d+)\s*\+\s*1/);
  if (plusOne) return Number(plusOne[1]) + 1;
  return seating;
}

export function vehicleDisplayName(name: string, seats: number) {
  const short = shortVehicleName(name);
  const shown = vehicleSeatsLabel(name, seats);
  if (short === "Tempo Traveller" || /tempo|eicher|mini bus/i.test(name)) {
    return `${short} (${shown} seats)`;
  }
  return short;
}

export function vehicleChoiceLabel(name: string, seats: number, perKm: number) {
  return `${vehicleDisplayName(name, seats)} — ₹${perKm}/km`;
}

export type Vehicle = {
  id: string;
  name: string;
  tag: string;
  seats: number;
  bags: number;
  perKm: number;
  base: number;
  image: string;
};

export const vehicles: Vehicle[] = [
  {
    id: "dzire",
    name: "Dzire",
    tag: "Comfort sedan",
    seats: 4,
    bags: 2,
    perKm: 14,
    base: 300,
    image: sedan,
  },
  {
    id: "ertiga",
    name: "Ertiga",
    tag: "Family MPV",
    seats: 6,
    bags: 3,
    perKm: 18,
    base: 400,
    image: mpv,
  },
  {
    id: "innova",
    name: "Innova",
    tag: "Premium MPV",
    seats: 7,
    bags: 4,
    perKm: 20,
    base: 500,
    image: mpv,
  },
  {
    id: "suv",
    name: "SUV",
    tag: "Highway cruiser",
    seats: 7,
    bags: 5,
    perKm: 23,
    base: 600,
    image: suv,
  },
  {
    id: "tempo",
    name: "Tempo Traveller",
    tag: "Group travel",
    seats: 14,
    bags: 10,
    perKm: 28,
    base: 900,
    image: tempo,
  },
];

/** Shown on booking form, WhatsApp message & fare cards */
export const BOOKING_FARE_NOTE = "Note: Toll, parking & permit charges are extra and billed at actuals.";

/** Fixed pickup points — service starts from these areas only */
export const pickupPlaces = [
  "Udumalpet",
  "Coimbatore",
  "Tiruppur",
  "Palani",
  "Pollachi",
  "Dharapuram",
  "Madathukulam",
  "Anaimalai",
  "Amaravathi",
];

export type PopularRoute = {
  from: string;
  to: string;
  price: number;
  km?: number;
  mins?: string;
  tag?: string;
};

/** One-way special fares from Udumalpet (as per Yaazh Cabs rate card) */
export const popularOneWayRoutes: PopularRoute[] = [
  { from: "Udumalpet", to: "Palani", price: 1500, km: 55, mins: "1 hr 5 min", tag: "Temple town" },
  { from: "Udumalpet", to: "Coimbatore", price: 2700, km: 68, mins: "1 hr 20 min", tag: "City ride" },
  { from: "Udumalpet", to: "Madurai", price: 3600, km: 165, mins: "3 hr", tag: "One way" },
  { from: "Udumalpet", to: "Dindigul", price: 2900, km: 120, mins: "2 hr 15 min", tag: "One way" },
  { from: "Udumalpet", to: "Munnar", price: 4000, km: 145, mins: "3 hr 30 min", tag: "Hill station" },
  { from: "Udumalpet", to: "Theni", price: 3300, km: 130, mins: "2 hr 45 min", tag: "One way" },
  { from: "Udumalpet", to: "Tiruppur", price: 2700, km: 95, mins: "2 hr", tag: "Knit city" },
  { from: "Udumalpet", to: "Erode", price: 3000, km: 110, mins: "2 hr 15 min", tag: "One way" },
  { from: "Udumalpet", to: "Karur", price: 3600, km: 140, mins: "2 hr 45 min", tag: "One way" },
];

export const places = [
  "Udumalpet",
  "Pollachi",
  "Coimbatore",
  "Palani",
  "Ooty",
  "Kodaikanal",
  "Munnar",
  "Madurai",
  "Tiruppur",
  "Theni",
  "Erode",
  "Karur",
  "Coimbatore Airport",
  "Valparai",
  "Dindigul",
  "Chennai",
  "Bengaluru",
  "Kochi",
];

export const tripTypes = ["One Way", "Round Trip", "Local Rental", "Airport Transfer", "Tour Package"];

export const PHONE_PRIMARY = "93600 55761";
export const PHONE_SECONDARY = "63690 22364";

export const ADMIN_WHATSAPP = "917845456609";
export const ADMIN_EMAIL = "hello@yaazhcabs.in";

export const BUSINESS_ADDRESS = "Udumalpet, Tiruppur District, Tamil Nadu 642126";
export const BUSINESS_HOURS = "Open 24×7";

/** Google Maps share link for Yaazh Cabs office / pickup point */
export const MAPS_SHARE_URL = "https://maps.app.goo.gl/EUCRv1piSHwJybDD7?g_st=aw";
export const MAP_LAT = 10.551642;
export const MAP_LNG = 77.306707;
export const MAP_EMBED_URL = `https://www.google.com/maps?q=${MAP_LAT},${MAP_LNG}&z=16&output=embed`;

export const CREATED_BY_NAME = "G.K. Tech";
export const CREATED_BY_URL = "https://gpdhanush.github.io/portfolio/";

export const drivers = [
  { name: "Saravanan M.", phone: "93600 55761", car: "TN 39 BM 4412" },
  { name: "Karthik R.", phone: "63690 22364", car: "TN 39 CQ 7781" },
  { name: "Vignesh S.", phone: "93600 55761", car: "TN 39 AZ 2093" },
  { name: "Mohan Raj", phone: "63690 22364", car: "TN 39 DK 5560" },
];

import sedan from "@/assets/car-sedan.jpg";
import mpv from "@/assets/car-mpv.jpg";
import suv from "@/assets/car-suv.jpg";
import tempo from "@/assets/car-tempo.jpg";

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

export const drivers = [
  { name: "Saravanan M.", phone: "93600 55761", car: "TN 39 BM 4412" },
  { name: "Karthik R.", phone: "63690 22364", car: "TN 39 CQ 7781" },
  { name: "Vignesh S.", phone: "93600 55761", car: "TN 39 AZ 2093" },
  { name: "Mohan Raj", phone: "63690 22364", car: "TN 39 DK 5560" },
];

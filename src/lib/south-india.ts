const SOUTH_STATES = [
  "tamil nadu",
  "kerala",
  "karnataka",
  "andhra pradesh",
  "andhra",
  "telangana",
  "puducherry",
  "pondicherry",
  "lakshadweep",
  "andaman",
];

const NON_SOUTH_STATES = [
  "maharashtra",
  "delhi",
  "nct",
  "west bengal",
  "gujarat",
  "rajasthan",
  "punjab",
  "haryana",
  "uttar pradesh",
  "madhya pradesh",
  "bihar",
  "odisha",
  "orissa",
  "assam",
  "goa",
  "jharkhand",
  "chhattisgarh",
  "uttarakhand",
  "himachal",
  "jammu",
  "kashmir",
  "manipur",
  "meghalaya",
  "mizoram",
  "nagaland",
  "tripura",
  "sikkim",
];

const SOUTH_CITIES = [
  "udumalpet",
  "pollachi",
  "coimbatore",
  "palani",
  "ooty",
  "udhagamandalam",
  "kodaikanal",
  "munnar",
  "madurai",
  "tiruppur",
  "tirupur",
  "theni",
  "erode",
  "karur",
  "valparai",
  "dindigul",
  "chennai",
  "madras",
  "bengaluru",
  "bangalore",
  "kochi",
  "cochin",
  "dharapuram",
  "madathukulam",
  "anaimalai",
  "amaravathi",
  "hyderabad",
  "secunderabad",
  "visakhapatnam",
  "vizag",
  "vijayawada",
  "tirupati",
  "mysore",
  "mysuru",
  "mangalore",
  "mangaluru",
  "hubli",
  "hubballi",
  "belgaum",
  "belagavi",
  "thiruvananthapuram",
  "trivandrum",
  "kozhikode",
  "calicut",
  "thrissur",
  "kannur",
  "warangal",
  "guntur",
  "nellore",
  "kurnool",
  "tiruchirappalli",
  "trichy",
  "salem",
  "vellore",
  "thanjavur",
  "tuticorin",
  "thoothukudi",
  "nagercoil",
  "hosur",
  "pondicherry",
  "puducherry",
  "kanyakumari",
  "rameswaram",
  "tirunelveli",
  "namakkal",
  "karimnagar",
  "nizamabad",
  "rajahmundry",
  "kakinada",
  "anantapur",
  "kadapa",
  "cuddapah",
  "alappuzha",
  "alleppey",
  "kollam",
  "kottayam",
  "palakkad",
  "wayanad",
];

const NON_SOUTH_CITIES = [
  "mumbai",
  "bombay",
  "navi mumbai",
  "thane",
  "pune",
  "nagpur",
  "nashik",
  "delhi",
  "new delhi",
  "noida",
  "gurgaon",
  "gurugram",
  "kolkata",
  "calcutta",
  "howrah",
  "ahmedabad",
  "surat",
  "vadodara",
  "jaipur",
  "lucknow",
  "kanpur",
  "patna",
  "bhopal",
  "indore",
  "chandigarh",
  "amritsar",
  "ludhiana",
  "panaji",
  "vasco",
  "raipur",
  "ranchi",
  "bhubaneswar",
  "guwahati",
  "srinagar",
  "dehradun",
  "varanasi",
  "agra",
  "faridabad",
  "ghaziabad",
  "jamshedpur",
  "jamnagar",
];

/** South India approx. box: TN, KL, KA, AP, TS, PY. Excludes Mumbai (72.88°E) and Goa. */
const SOUTH_BOUNDS = {
  minLat: 8.0,
  maxLat: 19.92,
  minLng: 74.05,
  maxLng: 84.8,
};

function haystack(label: string, secondary?: string) {
  return `${label} ${secondary ?? ""}`.toLowerCase();
}

function hasToken(text: string, token: string) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z])${escaped}(?:$|[^a-z])`, "i").test(text);
}

export function isSouthIndiaLocation(input: {
  label: string;
  secondary?: string | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
}): boolean {
  const text = haystack(input.label, input.secondary);

  if (SOUTH_STATES.some((s) => text.includes(s))) return true;
  if (NON_SOUTH_STATES.some((s) => text.includes(s))) return false;
  if (NON_SOUTH_CITIES.some((c) => hasToken(text, c))) return false;
  if (SOUTH_CITIES.some((c) => hasToken(text, c))) return true;

  if (input.latitude != null && input.longitude != null) {
    const { latitude: lat, longitude: lng } = input;
    return (
      lat >= SOUTH_BOUNDS.minLat &&
      lat <= SOUTH_BOUNDS.maxLat &&
      lng >= SOUTH_BOUNDS.minLng &&
      lng <= SOUTH_BOUNDS.maxLng
    );
  }

  return true;
}

export function unserviceableDropMessage(phone: string) {
  return `Not serviceable. Please contact us ${phone}`;
}

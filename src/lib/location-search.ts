import { places as popularPlaces } from "@/lib/site-data";
import { getCities, isApiConfigured } from "@/lib/api";

export type LocationSuggestion = {
  id: string;
  label: string;
  secondary?: string;
  latitude?: number;
  longitude?: number;
};

let cachedCityNames: string[] | null = null;
let citiesPromise: Promise<string[]> | null = null;

async function loadCityNames(): Promise<string[]> {
  if (cachedCityNames) return cachedCityNames;
  if (!isApiConfigured()) {
    cachedCityNames = popularPlaces;
    return cachedCityNames;
  }
  if (!citiesPromise) {
    citiesPromise = getCities({ perPage: 100 })
      .then((rows) => {
        const names = rows.map((c) => c.name).filter(Boolean);
        cachedCityNames = names.length ? [...new Set([...names, ...popularPlaces])] : popularPlaces;
        return cachedCityNames;
      })
      .catch(() => {
        cachedCityNames = popularPlaces;
        return cachedCityNames;
      });
  }
  return citiesPromise;
}

/** Approximate coords for common Tamil Nadu pickups / drops (fare estimate). */
const PLACE_COORDS: Record<string, { lat: number; lng: number }> = {
  Udumalpet: { lat: 10.5847, lng: 77.2514 },
  Pollachi: { lat: 10.6587, lng: 77.0089 },
  Coimbatore: { lat: 11.0168, lng: 76.9558 },
  "Coimbatore Airport": { lat: 11.0297, lng: 77.0434 },
  Palani: { lat: 10.4503, lng: 77.5209 },
  Ooty: { lat: 11.4064, lng: 76.6932 },
  Kodaikanal: { lat: 10.2381, lng: 77.4892 },
  Munnar: { lat: 10.0889, lng: 77.0595 },
  Madurai: { lat: 9.9252, lng: 78.1198 },
  Tiruppur: { lat: 11.1085, lng: 77.3411 },
  Theni: { lat: 10.0104, lng: 77.4777 },
  Erode: { lat: 11.341, lng: 77.7172 },
  Karur: { lat: 10.9601, lng: 78.0766 },
  Valparai: { lat: 10.3269, lng: 76.951 },
  Dindigul: { lat: 10.3673, lng: 77.9803 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Kochi: { lat: 9.9312, lng: 76.2673 },
  Dharapuram: { lat: 10.7381, lng: 77.532 },
  Madathukulam: { lat: 10.562, lng: 77.363 },
  Anaimalai: { lat: 10.583, lng: 76.933 },
  Amaravathi: { lat: 10.403, lng: 77.267 },
};

export function coordsForPlace(label: string): { latitude: number; longitude: number } | null {
  const hit = PLACE_COORDS[label.trim()];
  return hit ? { latitude: hit.lat, longitude: hit.lng } : null;
}

type GooglePrediction = {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          AutocompleteService: new () => {
            getPlacePredictions: (
              req: {
                input: string;
                componentRestrictions?: { country: string | string[] };
                types?: string[];
                location?: { lat: number; lng: number };
                radius?: number;
              },
              cb: (predictions: GooglePrediction[] | null, status: string) => void,
            ) => void;
          };
        };
      };
    };
    __yaazhMapsPromise?: Promise<boolean>;
  }
}

const GOOGLE_KEY = import.meta.env["VITE_GOOGLE_MAPS_API_KEY"] as string | undefined;

function loadGoogleMaps(): Promise<boolean> {
  if (typeof window === "undefined" || !GOOGLE_KEY) return Promise.resolve(false);
  if (window.google?.maps?.places) return Promise.resolve(true);
  if (window.__yaazhMapsPromise) return window.__yaazhMapsPromise;

  window.__yaazhMapsPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-yaazh-maps]");
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.google?.maps?.places)));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_KEY)}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset["yaazhMaps"] = "true";
    script.onload = () => resolve(Boolean(window.google?.maps?.places));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return window.__yaazhMapsPromise;
}

async function searchGoogle(query: string): Promise<LocationSuggestion[]> {
  const ready = await loadGoogleMaps();
  if (!ready || !window.google?.maps?.places) return [];

  const service = new window.google.maps.places.AutocompleteService();
  return new Promise((resolve) => {
    service.getPlacePredictions(
      {
        input: query,
        componentRestrictions: { country: "in" },
        location: { lat: 10.5847, lng: 77.2514 },
        radius: 850000,
      },
      (predictions, status) => {
        if (status !== "OK" || !predictions?.length) {
          resolve([]);
          return;
        }
        resolve(
          predictions.slice(0, 8).map((p) => {
            const label = p.structured_formatting?.main_text || p.description;
            const known = coordsForPlace(label);
            return {
              id: p.place_id,
              label,
              secondary: p.structured_formatting?.secondary_text || p.description,
              ...(known ?? {}),
            };
          }),
        );
      },
    );
  });
}

async function searchNominatim(query: string): Promise<LocationSuggestion[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "8");
  url.searchParams.set("lang", "en");
  url.searchParams.set("lat", "10.5847");
  url.searchParams.set("lon", "77.2514");
  url.searchParams.set("bbox", "74.05,8.0,84.8,19.92");

  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = (await res.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
      properties?: {
        osm_id?: number;
        name?: string;
        city?: string;
        state?: string;
        country?: string;
        street?: string;
      };
    }>;
  };

  return (data.features ?? [])
    .map((feature, index) => {
      const p = feature.properties ?? {};
      const label = p.name || p.city || p.street || query;
      const secondary = [p.street, p.city, p.state, p.country].filter(Boolean).join(", ");
      const coords = feature.geometry?.coordinates;
      return {
        id: `photon-${p.osm_id ?? index}-${label}`,
        label,
        secondary: secondary || "India",
        ...(coords
          ? { longitude: coords[0], latitude: coords[1] }
          : coordsForPlace(label) ?? {}),
      };
    })
    .filter((item) => item.label.trim().length > 0);
}

function searchPopular(query: string, cityNames: string[]): LocationSuggestion[] {
  const source = cityNames.length ? cityNames : popularPlaces;
  const q = query.trim().toLowerCase();
  const mapPlace = (p: string): LocationSuggestion => {
    const known = coordsForPlace(p);
    return {
      id: `popular-${p}`,
      label: p,
      secondary: "Popular destination",
      ...(known ?? {}),
    };
  };
  if (!q) {
    return source.slice(0, 8).map(mapPlace);
  }
  return source.filter((p) => p.toLowerCase().includes(q)).map(mapPlace);
}

export async function searchLocations(query: string): Promise<LocationSuggestion[]> {
  const q = query.trim();
  const cityNames = await loadCityNames();
  const popular = searchPopular(q, cityNames);

  if (q.length < 2) return popular;

  try {
    if (GOOGLE_KEY) {
      const google = await searchGoogle(q);
      if (google.length) {
        const seen = new Set(google.map((g) => g.label.toLowerCase()));
        return [...google, ...popular.filter((p) => !seen.has(p.label.toLowerCase()))].slice(0, 8);
      }
    }
  } catch {
    /* fall through */
  }

  try {
    const osm = await searchNominatim(q);
    if (osm.length) {
      const seen = new Set(osm.map((g) => g.label.toLowerCase()));
      return [...osm, ...popular.filter((p) => !seen.has(p.label.toLowerCase()))].slice(0, 8);
    }
  } catch {
    /* fall through */
  }

  return popular.length
    ? popular
    : [{ id: `custom-${q}`, label: q, secondary: "Use this location", ...(coordsForPlace(q) ?? {}) }];
}

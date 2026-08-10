import { places as popularPlaces } from "@/lib/site-data";

export type LocationSuggestion = {
  id: string;
  label: string;
  secondary?: string;
};

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
      },
      (predictions, status) => {
        if (status !== "OK" || !predictions?.length) {
          resolve([]);
          return;
        }
        resolve(
          predictions.slice(0, 8).map((p) => ({
            id: p.place_id,
            label: p.structured_formatting?.main_text || p.description,
            secondary: p.structured_formatting?.secondary_text || p.description,
          })),
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

  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = (await res.json()) as {
    features?: Array<{
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
      return {
        id: `photon-${p.osm_id ?? index}-${label}`,
        label,
        secondary: secondary || "India",
      };
    })
    .filter((item) => item.label.trim().length > 0);
}

function searchPopular(query: string): LocationSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return popularPlaces.slice(0, 8).map((p) => ({
      id: `popular-${p}`,
      label: p,
      secondary: "Popular destination",
    }));
  }
  return popularPlaces
    .filter((p) => p.toLowerCase().includes(q))
    .map((p) => ({
      id: `popular-${p}`,
      label: p,
      secondary: "Popular destination",
    }));
}

export async function searchLocations(query: string): Promise<LocationSuggestion[]> {
  const q = query.trim();
  const popular = searchPopular(q);

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
    : [{ id: `custom-${q}`, label: q, secondary: "Use this location" }];
}

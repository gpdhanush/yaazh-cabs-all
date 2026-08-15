"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Loader2, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { places as popularPlaces } from "@/lib/site-data";
import { coordsForPlace, searchLocations, type LocationSuggestion } from "@/lib/location-search";

export type LocationValue = {
  label: string;
  secondary?: string;
  latitude?: number;
  longitude?: number;
};

type Props = {
  label: string;
  value: string;
  onChange: (value: string, meta?: LocationValue) => void;
  error?: React.ReactNode;
  icon?: React.ReactNode;
  /** When set, only these options can be chosen (same dropdown UI as drop). */
  fixedOptions?: string[];
  placeholder?: string;
};

function toSuggestions(options: string[], secondary = "Pickup point"): LocationSuggestion[] {
  return options.map((label) => {
    const known = coordsForPlace(label);
    return {
      id: `fixed-${label}`,
      label,
      secondary,
      ...(known ?? {}),
    };
  });
}

export function LocationField({
  label,
  value,
  onChange,
  error,
  icon,
  fixedOptions,
  placeholder,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [active, setActive] = useState(0);
  const isFixed = Boolean(fixedOptions?.length);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!open || isFixed) return;
    const q = query.trim();
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchLocations(q);
        if (!cancelled) {
          setSuggestions(results);
          setActive(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, open, isFixed]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (item: LocationSuggestion) => {
    const meta: LocationValue = {
      label: item.label,
      ...(item.secondary ? { secondary: item.secondary } : {}),
      ...(item.latitude != null ? { latitude: item.latitude } : {}),
      ...(item.longitude != null ? { longitude: item.longitude } : {}),
    };
    onChange(item.label, meta);
    setQuery(item.label);
    setOpen(false);
  };

  const filteredFixed = isFixed
    ? (fixedOptions ?? []).filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  const popular =
    !isFixed && query.trim().length < 2
      ? popularPlaces.map((p) => {
          const known = coordsForPlace(p);
          return {
            id: `popular-${p}`,
            label: p,
            secondary: "Popular route",
            ...(known ?? {}),
          };
        })
      : [];

  const list = isFixed
    ? toSuggestions(filteredFixed.length ? filteredFixed : (fixedOptions ?? []))
    : suggestions.length
      ? suggestions
      : popular;

  const displayPlaceholder =
    placeholder ?? (isFixed ? "Select pickup point" : "Search city, airport or area");

  return (
    <div className="relative w-full" ref={rootRef}>
      <label className="mb-1.5 block text-[13px] font-medium text-foreground">{label}</label>
      <div
        className={cn(
          "flex h-11 items-center gap-2.5 rounded-lg border px-3 transition-colors",
          error
            ? "border-error bg-error/5"
            : "border-border/80 bg-muted/35 hover:border-brand/40 focus-within:border-brand focus-within:bg-background focus-within:ring-2 focus-within:ring-brand/15",
        )}
      >
        <span className="shrink-0 text-muted-foreground [&_svg]:size-4">{icon ?? <MapPin />}</span>
          <input
            value={query}
            name={isFixed ? "yc_pickup_location" : "yc_drop_location"}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            readOnly={isFixed}
            onChange={(e) => {
              if (isFixed) return;
              setQuery(e.target.value);
              onChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={(e) => {
              if (!open || !list.length) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => (i + 1) % list.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => (i - 1 + list.length) % list.length);
              } else if (e.key === "Enter") {
                e.preventDefault();
                const item = list[active];
                if (item) pick(item);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="none"
            placeholder={displayPlaceholder}
            className={cn(
              "w-full bg-transparent text-sm font-normal text-foreground outline-none placeholder:text-[13px] placeholder:font-normal placeholder:tracking-wide placeholder:text-muted-foreground/55",
              isFixed && "cursor-pointer",
            )}
          />
          {query && !isFixed ? (
            <button
              type="button"
              aria-label="Clear location"
              onClick={() => {
                setQuery("");
                onChange("");
                setOpen(true);
              }}
              className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <ChevronDown
              className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
              aria-hidden
            />
          )}
          {!isFixed && loading ? <Loader2 className="size-4 shrink-0 animate-spin text-brand" /> : null}
      </div>

      {open && list.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-popover py-1 shadow-lg"
        >
          {list.map((item, index) => (
            <li key={item.id} role="option" aria-selected={index === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(item)}
                className={cn(
                  "flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm",
                  index === active ? "bg-muted text-foreground" : "text-body hover:bg-muted/70",
                  value === item.label && "font-medium",
                )}
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground">{item.label}</span>
                  {item.secondary ? (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {item.secondary}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="mt-1 text-xs text-error">{error}</p> : null}
    </div>
  );
}

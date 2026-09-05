"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
  Mail,
  Navigation,
  Search,
  User,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { LocationField, type LocationValue } from "@/components/site/location-field";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import {
  PHONE_PRIMARY,
  tripTypes,
  vehicles,
  pickupPlaces,
  BOOKING_FARE_NOTE,
  ADMIN_WHATSAPP,
  ADMIN_EMAIL,
  vehicleChoiceLabel,
  vehicleDisplayName,
} from "@/lib/site-data";
import { cacheBooking } from "@/lib/bookings";
import {
  ApiError,
  createBooking,
  getAppConfig,
  getVehicleCategories,
  isApiConfigured,
  toApiTripType,
  type VehicleCategory,
} from "@/lib/api";
import { coordsForPlace } from "@/lib/location-search";
import { isSouthIndiaLocation, unserviceableDropMessage } from "@/lib/south-india";

const times = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const ampm = h < 12 ? "AM" : "PM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${String(hh).padStart(2, "0")}:${m} ${ampm}`;
});

const fieldBox = (error?: string) =>
  cn(
    "flex h-11 items-center gap-2.5 rounded-lg border px-3 transition-colors",
    error
      ? "border-error bg-error/5"
      : "border-border/80 bg-muted/35 hover:border-brand/40 focus-within:border-brand focus-within:bg-background focus-within:ring-2 focus-within:ring-brand/15",
  );

const fieldLabel = "mb-1.5 block text-[13px] font-medium text-foreground";

const fieldControl =
  "w-full bg-transparent text-sm font-normal text-foreground outline-none placeholder:text-[13px] placeholder:font-normal placeholder:tracking-wide placeholder:text-muted-foreground/55";

const noAutoComplete = {
  autoComplete: "off" as const,
  autoCorrect: "off" as const,
  autoCapitalize: "none" as const,
  spellCheck: false as const,
  "data-lpignore": "true",
  "data-1p-ignore": "true",
  "data-form-type": "other",
};

function Field({
  label,
  error,
  icon,
  children,
}: {
  label: string;
  error?: string | undefined;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <label className={fieldLabel}>{label}</label>
      <div className={fieldBox(error)}>
        {icon ? <span className="shrink-0 text-muted-foreground [&_svg]:size-4">{icon}</span> : null}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {error ? <p className="mt-1 text-xs text-error">{error}</p> : null}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  error,
  icon,
  type = "text",
  inputMode,
  maxLength,
  placeholder,
  name,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  icon?: React.ReactNode;
  type?: string;
  inputMode?: "text" | "tel" | "numeric" | "email";
  maxLength?: number;
  placeholder?: string;
  name?: string;
}) {
  return (
    <Field label={label} error={error} icon={icon}>
      <input
        {...noAutoComplete}
        name={name}
        type={type}
        inputMode={inputMode ?? "text"}
        maxLength={maxLength ?? 80}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={fieldControl}
        aria-label={label}
      />
    </Field>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  icon,
  error,
  searchable = true,
  placeholder = "Select",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  icon?: React.ReactNode;
  error?: string | undefined;
  searchable?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Field label={label} error={error} icon={icon}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left outline-none"
          >
            <span className={cn("truncate text-sm", value ? "text-foreground" : "text-[13px] tracking-wide text-muted-foreground/55")}>
              {value || placeholder}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground/70" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] min-w-56 border-border bg-popover p-0"
          align="start"
        >
          <Command>
            {searchable && (
              <CommandInput
                placeholder={`Search ${label.toLowerCase()}…`}
                autoComplete="off"
                className="placeholder:text-[13px] placeholder:font-normal placeholder:text-muted-foreground/55"
              />
            )}
            <CommandList>
              <CommandEmpty>No match found.</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem
                    key={o}
                    value={o}
                    onSelect={() => {
                      onChange(o);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 size-4", value === o ? "opacity-100" : "opacity-0")} />
                    {o}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </Field>
  );
}

type FormErrors = {
  name?: string;
  mobile?: string;
  email?: string;
  pickup?: string;
  drop?: string;
  date?: string;
  time?: string;
  vehicle?: string;
};

type DoneBooking = {
  ref: string;
  name: string;
  mobile: string;
  pickup: string;
  drop: string;
  date: string;
  time: string;
  vehicle: string;
  perKm: number;
  trip: string;
  estimate: number;
};

function digitsOnly(v: string) {
  return v.replace(/\D/g, "");
}

function formatPhone(raw: string) {
  const d = digitsOnly(raw).slice(-10);
  if (d.length !== 10) return raw;
  return `${d.slice(0, 5)} ${d.slice(5)}`;
}

function dropServiceError(phone: string) {
  const tel = digitsOnly(phone).slice(-10);
  return (
    <>
      Not serviceable. Please contact us{" "}
      <a href={`tel:+91${tel}`} className="font-semibold underline underline-offset-2">
        {phone}
      </a>
    </>
  );
}

function parsePickupAt(date: Date, timeLabel: string): Date {
  const match = timeLabel.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return date;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const ampm = match[3]!.toUpperCase();
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  const out = new Date(date);
  out.setHours(hour, minute, 0, 0);
  return out;
}

function buildMessage(b: DoneBooking) {
  return [
    `New cab booking — ${b.ref}`,
    `Name: ${b.name}`,
    `Mobile: +91 ${b.mobile}`,
    `Trip: ${b.trip}`,
    `Pickup: ${b.pickup}`,
    `Drop: ${b.drop}`,
    `Date & time: ${b.date}, ${b.time}`,
    `Vehicle: ${b.vehicle} (₹${b.perKm}/km)`,
    `Approx fare: ₹${b.estimate.toLocaleString("en-IN")}`,
    BOOKING_FARE_NOTE,
  ].join("\n");
}

export function BookingForm() {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [pickupMeta, setPickupMeta] = useState<LocationValue | null>(null);
  const [dropMeta, setDropMeta] = useState<LocationValue | null>(null);
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [trip, setTrip] = useState("One Way");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [done, setDone] = useState<DoneBooking | null>(null);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [supportPhone, setSupportPhone] = useState(PHONE_PRIMARY);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  useEffect(() => {
    if (!isApiConfigured()) return;
    getVehicleCategories()
      .then((rows) => {
        setCategories(rows);
        if (rows[0]) setVehicleId((current) => current || rows[0]!.id);
      })
      .catch(() => {
        /* static fallback */
      });
    getAppConfig()
      .then((cfg) => {
        const phone = cfg.settings?.["support_phone"];
        if (phone) setSupportPhone(formatPhone(phone));
      })
      .catch(() => {
        /* keep default */
      });
  }, []);

  const vehicleOptions = useMemo(() => {
    if (categories.length) {
      return categories.map((c) => ({
        id: c.id,
        label: vehicleChoiceLabel(
          c.name,
          c.seating_capacity,
          trip === "Round Trip" ? c.round_trip_rate_per_km : c.one_way_rate_per_km,
        ),
        name: vehicleDisplayName(c.name, c.seating_capacity),
        perKm: trip === "Round Trip" ? c.round_trip_rate_per_km : c.one_way_rate_per_km,
        base: 0,
      }));
    }
    return vehicles.map((v) => ({
      id: v.id,
      label: `${v.name} — ₹${v.perKm}/km`,
      name: v.name,
      perKm: v.perKm,
      base: v.base,
    }));
  }, [categories, trip]);

  useEffect(() => {
    if (!vehicleId && vehicleOptions[0]) setVehicleId(vehicleOptions[0].id);
  }, [vehicleId, vehicleOptions]);

  const selectedVehicle = vehicleOptions.find((v) => v.id === vehicleId) ?? vehicleOptions[0];

  const clearError = (key: keyof FormErrors) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: FormErrors = {};
    const cleanMobile = mobile.replace(/\D/g, "");
    if (!name.trim()) next.name = "Your name is required";
    if (!cleanMobile) next.mobile = "Mobile number is required";
    else if (!/^[6-9]\d{9}$/.test(cleanMobile)) next.mobile = "Enter a valid 10-digit mobile number";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Enter a valid email address";
    }
    if (!pickup.trim()) next.pickup = "Pickup location is required";
    if (!drop.trim()) next.drop = "Drop location is required";
    else if (pickup && drop && pickup.trim() === drop.trim()) next.drop = "Drop must differ from pickup";
    else if (
      !isSouthIndiaLocation({
        label: drop,
        secondary: dropMeta?.secondary,
        latitude: dropMeta?.latitude ?? coordsForPlace(drop)?.latitude,
        longitude: dropMeta?.longitude ?? coordsForPlace(drop)?.longitude,
      })
    ) {
      next.drop = unserviceableDropMessage(supportPhone);
    }
    if (!date) next.date = "Choose a pickup date";
    if (!time) next.time = "Pickup time is mandatory";
    if (!selectedVehicle) next.vehicle = "Select a vehicle";
    setErrors(next);
    if (Object.keys(next).length || !selectedVehicle || !date) return;

    const pickupAt = parsePickupAt(date, time);
    const pickupCoords =
      pickupMeta?.latitude != null && pickupMeta.longitude != null
        ? { latitude: pickupMeta.latitude, longitude: pickupMeta.longitude }
        : coordsForPlace(pickup);
    const dropCoords =
      dropMeta?.latitude != null && dropMeta.longitude != null
        ? { latitude: dropMeta.latitude, longitude: dropMeta.longitude }
        : coordsForPlace(drop);

    setLoading(true);
    try {
      if (!isApiConfigured()) {
        throw new ApiError("Booking API is not configured. Set VITE_API_URL and rebuild.", 503);
      }

      const created = await createBooking({
        vehicle_category_id: selectedVehicle.id,
        trip_type: toApiTripType(trip),
        customer_name: name.trim(),
        customer_phone: cleanMobile,
        customer_email: email.trim() || null,
        pickup_location: pickup.trim(),
        drop_location: drop.trim(),
        pickup_city: pickup.trim(),
        drop_city: drop.trim(),
        pickup_latitude: pickupCoords?.latitude ?? null,
        pickup_longitude: pickupCoords?.longitude ?? null,
        drop_latitude: dropCoords?.latitude ?? null,
        drop_longitude: dropCoords?.longitude ?? null,
        pickup_at: pickupAt.toISOString(),
      });

      const booking: DoneBooking = {
        ref: created.booking_reference,
        name: name.trim(),
        mobile: cleanMobile,
        pickup: pickup.trim(),
        drop: drop.trim(),
        date: format(date, "dd MMM yyyy"),
        time,
        vehicle: selectedVehicle.name,
        perKm: selectedVehicle.perKm,
        trip,
        estimate: Number(created.estimated_total) || selectedVehicle.base + selectedVehicle.perKm * 60,
      };

      cacheBooking({
        ref: booking.ref,
        phone: booking.mobile,
        name: booking.name,
        pickup: booking.pickup,
        drop: booking.drop,
        createdAt: Date.now(),
      });
      setDone(booking);
      trackEvent("generate_lead", { method: "booking_form" });
      toast.success(`Booking ${booking.ref} confirmed`, {
        description: "Saved with our desk. Track status or notify us on WhatsApp.",
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not create booking. Try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    const waHref = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(buildMessage(done))}`;
    const mailHref = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(
      `Cab booking ${done.ref} — ${done.name}`,
    )}&body=${encodeURIComponent(`${buildMessage(done)}\n\nPlease send a confirmation copy to the customer.`)}`;

    return (
      <div className="w-full rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-success">Booking received</p>
        <p className="mt-3 font-data text-2xl font-semibold text-foreground">{done.ref}</p>
        <p className="mt-2 text-sm text-body">
          {done.trip} · {done.pickup} → {done.drop} · {done.date}, {done.time} · {done.vehicle}
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">
          Estimated fare: ₹{done.estimate.toLocaleString("en-IN")}
        </p>
        <p className="mt-3 rounded-lg border border-brand/40 bg-primary/12 px-3 py-2 text-xs text-brand">
          {BOOKING_FARE_NOTE}
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <a
            href={waHref}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground"
          >
            <MessageCircle className="size-4" /> Notify on WhatsApp
          </a>
          <a
            href={mailHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-secondary-foreground"
          >
            <Mail className="size-4 text-primary" /> Email a copy
          </a>
        </div>

        <Link
          to="/status"
          search={{ ref: done.ref }}
          className="mt-3 block rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-success"
        >
          Track booking status
        </Link>

        <button
          type="button"
          onClick={() => setDone(null)}
          className="mt-4 w-full text-xs font-normal text-muted-foreground underline underline-offset-4"
        >
          Book another ride
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      autoComplete="off"
      className="w-full rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 md:p-6"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="section-kicker">Book your ride</p>
          <p className="mt-1 text-xs text-muted-foreground">Fill details — we confirm shortly</p>
        </div>
        <span className="rounded-full border border-brand/45 bg-primary/15 px-3 py-1 text-[10px] font-semibold text-brand sm:text-[11px]">
          24×7 · Instant confirmation
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tripTypes.slice(0, 3).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTrip(t)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium",
              trip === t
                ? "border-brand bg-primary text-primary-foreground"
                : "border-border bg-background text-body hover:border-brand/50 hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Your name"
          name="yc_rider_name"
          value={name}
          onChange={(v) => {
            setName(v);
            if (v.trim()) clearError("name");
          }}
          error={errors.name}
          icon={<User />}
          placeholder="Enter your full name"
        />
        <TextField
          label="Mobile number"
          name="yc_rider_mobile"
          value={mobile}
          onChange={(v) => {
            const digits = v.replace(/\D/g, "").slice(0, 10);
            setMobile(digits);
            if (digits.length > 0) clearError("mobile");
          }}
          error={errors.mobile}
          type="tel"
          inputMode="numeric"
          maxLength={10}
          icon={<Phone />}
          placeholder="10-digit mobile number"
        />

        <LocationField
          label="Pickup location"
          value={pickup}
          onChange={(v, meta) => {
            setPickup(v);
            setPickupMeta(meta ?? (v ? { label: v, ...(coordsForPlace(v) ?? {}) } : null));
            if (v.trim()) clearError("pickup");
          }}
          error={errors.pickup}
          icon={<MapPin />}
          fixedOptions={pickupPlaces}
          placeholder="Select pickup point"
        />
        <div>
          <LocationField
            label="Drop location"
            value={drop}
            onChange={(v, meta) => {
              const resolved = meta ?? (v ? { label: v, ...(coordsForPlace(v) ?? {}) } : null);
              setDrop(v);
              setDropMeta(resolved);
              if (!v.trim()) {
                clearError("drop");
                return;
              }
              if (
                !isSouthIndiaLocation({
                  label: v,
                  secondary: resolved?.secondary,
                  latitude: resolved?.latitude,
                  longitude: resolved?.longitude,
                })
              ) {
                setErrors((prev) => ({ ...prev, drop: unserviceableDropMessage(supportPhone) }));
                return;
              }
              clearError("drop");
            }}
            error={
              errors.drop?.startsWith("Not serviceable") ? dropServiceError(supportPhone) : errors.drop
            }
            icon={<Navigation />}
            placeholder="Search South India city, airport or area"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">Drops within South India only</p>
        </div>

        <Field label="Pickup date" error={errors.date} icon={<CalendarDays />}>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-left outline-none"
              >
                <span className={cn("truncate text-sm", date ? "text-foreground" : "text-[13px] tracking-wide text-muted-foreground/55")}>
                  {date ? format(date, "dd MMM yyyy") : "Choose date"}
                </span>
                <ChevronDown className="size-4 text-muted-foreground/70" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto border-border bg-popover p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  setDateOpen(false);
                  if (d) clearError("date");
                }}
                disabled={{ before: today }}
                autoFocus
              />
            </PopoverContent>
          </Popover>
        </Field>

        <SelectField
          label="Pickup time"
          value={time}
          onChange={(v) => {
            setTime(v);
            if (v) clearError("time");
          }}
          options={times}
          error={errors.time}
          icon={<Clock />}
          placeholder="Select pickup time"
        />

        <SelectField
          label="Vehicle & rate"
          value={selectedVehicle?.label ?? ""}
          onChange={(label) => {
            const hit = vehicleOptions.find((v) => v.label === label);
            if (hit) {
              setVehicleId(hit.id);
              clearError("vehicle");
            }
          }}
          options={vehicleOptions.map((v) => v.label)}
          error={errors.vehicle}
          searchable={false}
          placeholder="Select vehicle"
        />
        <SelectField
          label="Trip type"
          value={trip}
          onChange={setTrip}
          options={tripTypes}
          searchable={false}
          placeholder="Select trip type"
        />
        <TextField
          label="Email (optional)"
          name="yc_rider_email"
          value={email}
          onChange={(v) => {
            setEmail(v);
            if (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) clearError("email");
          }}
          error={errors.email}
          type="email"
          inputMode="email"
          icon={<Mail />}
          placeholder="name@email.com"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground gold-ring hover:bg-primary-dark disabled:opacity-80"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Creating booking
          </>
        ) : (
          <>
            <Search className="size-4" /> Confirm booking
          </>
        )}
      </button>

      <p className="mt-3 rounded-lg border border-brand/40 bg-primary/12 px-3 py-2 text-center text-[11px] font-medium text-brand">
        {BOOKING_FARE_NOTE}
      </p>
      <p className="mt-2 text-center text-[11px] font-normal text-muted-foreground">
        Pickup from Udumalpet, Coimbatore, Tiruppur, Palani &amp; nearby district. Drop anywhere.
      </p>
    </form>
  );
}

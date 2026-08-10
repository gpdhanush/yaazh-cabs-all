"use client";

import { useMemo, useState } from "react";
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
import { LocationField } from "@/components/site/location-field";
import { cn } from "@/lib/utils";
import { tripTypes, vehicles, pickupPlaces, BOOKING_FARE_NOTE, ADMIN_WHATSAPP, ADMIN_EMAIL } from "@/lib/site-data";
import { makeRef, saveBooking, type Booking } from "@/lib/bookings";

const times = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const ampm = h < 12 ? "AM" : "PM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${String(hh).padStart(2, "0")}:${m} ${ampm}`;
});

const vehicleOptions = vehicles.map((v) => `${v.name} — ₹${v.perKm}/km`);

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
      <div
        className={cn(
          "rounded-xl border bg-background px-3.5 py-2.5 transition-colors",
          error ? "border-error" : "border-border focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20",
        )}
      >
        <label className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </label>
        <div className="mt-1 flex items-center gap-2">
          {icon ? <span className="shrink-0 text-brand [&_svg]:size-4">{icon}</span> : null}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  icon?: React.ReactNode;
  type?: string;
  inputMode?: "text" | "tel" | "numeric";
  maxLength?: number;
}) {
  return (
    <Field label={label} error={error} icon={icon}>
      <input
        type={type}
        inputMode={inputMode ?? "text"}
        maxLength={maxLength ?? 80}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  icon?: React.ReactNode;
  error?: string | undefined;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Field label={label} error={error} icon={icon}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-foreground outline-none"
          >
            <span className={cn("truncate", !value && "font-normal text-muted-foreground")}>
              {value || "Select"}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] min-w-56 border-border bg-popover p-0"
          align="start"
        >
          <Command>
            {searchable && <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />}
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
  pickup?: string;
  drop?: string;
  date?: string;
  time?: string;
  vehicle?: string;
};

function buildMessage(b: Booking) {
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
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [trip, setTrip] = useState("One Way");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [done, setDone] = useState<Booking | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: FormErrors = {};
    const cleanMobile = mobile.replace(/\D/g, "");
    if (!name.trim()) next.name = "Your name is required";
    if (!cleanMobile) next.mobile = "Mobile number is required";
    else if (!/^[6-9]\d{9}$/.test(cleanMobile)) next.mobile = "Enter a valid 10-digit mobile number";
    if (!pickup.trim()) next.pickup = "Pickup location is required";
    if (!drop.trim()) next.drop = "Drop location is required";
    if (pickup && drop && pickup.trim() === drop.trim()) next.drop = "Drop must differ from pickup";
    if (!date) next.date = "Choose a pickup date";
    if (!time) next.time = "Pickup time is mandatory";
    if (!vehicle) next.vehicle = "Select a vehicle";
    setErrors(next);
    if (Object.keys(next).length) return;

    const picked = vehicles.find((v) => vehicle.startsWith(v.name))!;
    const booking: Booking = {
      ref: makeRef(),
      name: name.trim(),
      mobile: cleanMobile,
      pickup: pickup.trim(),
      drop: drop.trim(),
      date: date ? format(date, "dd MMM yyyy") : "",
      time,
      vehicle: picked.name,
      perKm: picked.perKm,
      trip,
      estimate: picked.base + picked.perKm * 60,
      createdAt: Date.now(),
    };

    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      saveBooking(booking);
      setDone(booking);
      window.open(
        `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(buildMessage(booking))}`,
        "_blank",
        "noopener",
      );
      toast.success(`Booking ${booking.ref} sent to our team`, {
        description: "WhatsApp opened with your trip details. We'll call you shortly.",
      });
    }, 900);
  };

  if (done) {
    const waHref = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(buildMessage(done))}`;
    const mailHref = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(
      `Cab booking ${done.ref} — ${done.name}`,
    )}&body=${encodeURIComponent(`${buildMessage(done)}\n\nPlease send a confirmation copy to the customer.`)}`;

    return (
      <div className="w-full rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-success">Booking sent</p>
        <p className="mt-3 font-data text-2xl font-semibold text-foreground">{done.ref}</p>
        <p className="mt-2 text-sm text-body">
          {done.trip} · {done.pickup} → {done.drop} · {done.date}, {done.time} · {done.vehicle}
        </p>
        <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          {BOOKING_FARE_NOTE}
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <a
            href={waHref}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground"
          >
            <MessageCircle className="size-4" /> Resend on WhatsApp
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
      className="w-full rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 md:p-6"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">
            Book your ride
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Fill details — we confirm on WhatsApp</p>
        </div>
        <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[10px] font-medium text-success sm:text-[11px]">
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
        <TextField label="Your name" value={name} onChange={setName} error={errors.name} icon={<User />} />
        <TextField
          label="Mobile number"
          value={mobile}
          onChange={(v) => setMobile(v.replace(/[^\d\s]/g, ""))}
          error={errors.mobile}
          type="tel"
          inputMode="tel"
          maxLength={12}
          icon={<Phone />}
        />

        <LocationField
          label="Pickup location"
          value={pickup}
          onChange={setPickup}
          error={errors.pickup}
          icon={<MapPin />}
          fixedOptions={pickupPlaces}
          placeholder="Select pickup point"
        />
        <LocationField
          label="Drop location"
          value={drop}
          onChange={setDrop}
          error={errors.drop}
          icon={<Navigation />}
        />

        <Field label="Pickup date" error={errors.date} icon={<CalendarDays />}>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium outline-none"
              >
                <span className={cn(!date && "font-normal text-muted-foreground")}>
                  {date ? format(date, "dd MMM yyyy") : "Choose date"}
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto border-border bg-popover p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  setDateOpen(false);
                }}
                disabled={{ before: today }}
                autoFocus
              />
            </PopoverContent>
          </Popover>
        </Field>

        <SelectField
          label="Pickup time *"
          value={time}
          onChange={setTime}
          options={times}
          error={errors.time}
          icon={<Clock />}
        />

        <SelectField
          label="Vehicle & rate"
          value={vehicle}
          onChange={setVehicle}
          options={vehicleOptions}
          error={errors.vehicle}
          searchable={false}
        />
        <SelectField
          label="Trip type"
          value={trip}
          onChange={setTrip}
          options={tripTypes}
          searchable={false}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground gold-ring hover:bg-primary-dark disabled:opacity-80"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Sending to our team
          </>
        ) : (
          <>
            <Search className="size-4" /> Book &amp; notify on WhatsApp
          </>
        )}
      </button>

      <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-center text-[11px] font-medium text-warning">
        {BOOKING_FARE_NOTE}
      </p>
      <p className="mt-2 text-center text-[11px] font-normal text-muted-foreground">
        Pickup from Udumalpet, Coimbatore, Tiruppur, Palani &amp; nearby district. Drop anywhere.
      </p>
    </form>
  );
}

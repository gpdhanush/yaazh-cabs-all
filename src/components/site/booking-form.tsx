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
import { cn } from "@/lib/utils";
import { places, tripTypes, vehicles, ADMIN_WHATSAPP, ADMIN_EMAIL } from "@/lib/site-data";
import { makeRef, saveBooking, type Booking } from "@/lib/bookings";

const times = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const ampm = h < 12 ? "AM" : "PM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${String(hh).padStart(2, "0")}:${m} ${ampm}`;
});

const vehicleOptions = vehicles.map((v) => `${v.name} — ₹${v.perKm}/km`);

function FieldShell({
  label,
  filled,
  error,
  hasIcon,
  children,
}: {
  label: string;
  filled: boolean;
  error?: string | undefined;
  hasIcon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <div
        className={cn(
          "group relative rounded-[5px] border bg-surface-2/40 px-3 pb-2 pt-5",
          error ? "border-destructive/70" : "border-border hover:border-primary/50",
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute text-muted-foreground",
            filled
              ? "left-3 top-1.5 text-[10px] uppercase tracking-[0.18em]"
              : cn("top-4 text-sm", hasIcon ? "left-9" : "left-3"),
          )}
        >
          {label}
        </span>
        {children}
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
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
    <FieldShell label={label} filled={Boolean(value)} error={error} hasIcon={Boolean(icon)}>
      <div className="flex items-center gap-2">
        {icon}
        <input
          type={type}
          inputMode={inputMode ?? "text"}
          maxLength={maxLength ?? 80}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-transparent"
          aria-label={label}
        />
      </div>
    </FieldShell>
  );
}

function SearchSelect({
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
    <FieldShell label={label} filled={Boolean(value)} error={error} hasIcon={Boolean(icon)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left text-sm text-foreground outline-none"
          >
            <span className="flex min-w-0 items-center gap-2">
              {icon}
              <span className="truncate">{value || "\u00a0"}</span>
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
    </FieldShell>
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
    if (!pickup) next.pickup = "Pickup location is required";
    if (!drop) next.drop = "Drop location is required";
    if (pickup && drop && pickup === drop) next.drop = "Drop must differ from pickup";
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
      pickup,
      drop,
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
      <div className="glass w-full rounded-2xl p-5 md:p-6">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.22em] text-primary">
          Booking sent
        </p>
        <p className="mt-3 font-display text-2xl font-extrabold text-gradient-gold">{done.ref}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {done.trip} · {done.pickup} → {done.drop} · {done.date}, {done.time} · {done.vehicle}
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <a
            href={waHref}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center justify-center gap-2 rounded-[5px] bg-[image:var(--gradient-gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground"
          >
            <MessageCircle className="size-4" /> Resend on WhatsApp
          </a>
          <a
            href={mailHref}
            className="inline-flex items-center justify-center gap-2 rounded-[5px] border border-border px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-foreground"
          >
            <Mail className="size-4 text-primary" /> Email a copy
          </a>
        </div>

        <Link
          to="/status"
          search={{ ref: done.ref }}
          className="mt-3 block rounded-[5px] border border-primary/40 bg-primary/10 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-primary"
        >
          Track booking status
        </Link>

        <button
          type="button"
          onClick={() => setDone(null)}
          className="mt-4 w-full text-xs text-muted-foreground underline underline-offset-4"
        >
          Book another ride
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="glass w-full rounded-2xl p-4 sm:p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.22em] text-primary">
          Book your ride
        </p>
        <span className="rounded-full border border-border px-3 py-1 text-[10px] text-muted-foreground sm:text-[11px]">
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
              "rounded-full border px-3.5 py-1.5 text-xs",
              trip === t
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Your name"
          value={name}
          onChange={setName}
          error={errors.name}
          icon={<User className="size-4 shrink-0 text-primary" />}
        />
        <TextField
          label="Mobile number"
          value={mobile}
          onChange={(v) => setMobile(v.replace(/[^\d\s]/g, ""))}
          error={errors.mobile}
          type="tel"
          inputMode="tel"
          maxLength={12}
          icon={<Phone className="size-4 shrink-0 text-primary" />}
        />

        <SearchSelect
          label="Pickup"
          value={pickup}
          onChange={setPickup}
          options={places}
          error={errors.pickup}
          icon={<MapPin className="size-4 text-primary" />}
        />
        <SearchSelect
          label="Drop"
          value={drop}
          onChange={setDrop}
          options={places}
          error={errors.drop}
          icon={<Navigation className="size-4 text-primary" />}
        />

        <FieldShell label="Pickup date" filled={Boolean(date)} error={errors.date} hasIcon>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-left text-sm outline-none"
              >
                <span className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" />
                  {date ? format(date, "dd MMM yyyy") : "\u00a0"}
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
        </FieldShell>

        <SearchSelect
          label="Pickup time *"
          value={time}
          onChange={setTime}
          options={times}
          error={errors.time}
          icon={<Clock className="size-4 text-primary" />}
        />

        <SearchSelect
          label="Vehicle & rate"
          value={vehicle}
          onChange={setVehicle}
          options={vehicleOptions}
          error={errors.vehicle}
          searchable={false}
        />
        <SearchSelect
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
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-[5px] bg-[image:var(--gradient-gold)] px-6 py-3.5 font-display text-sm font-bold uppercase tracking-[0.14em] text-primary-foreground gold-ring disabled:opacity-80"
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

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Your booking is sent to our admin on WhatsApp instantly.
      </p>
    </form>
  );
}

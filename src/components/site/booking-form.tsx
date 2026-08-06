"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { places, tripTypes, vehicles } from "@/lib/site-data";
import { Magnetic } from "./motion-primitives";

const times = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const ampm = h < 12 ? "AM" : "PM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${String(hh).padStart(2, "0")}:${m} ${ampm}`;
});

function FieldShell({
  label,
  filled,
  error,
  children,
}: {
  label: string;
  filled: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <div
        className={cn(
          "group relative rounded-[5px] border bg-surface-2/40 px-3 pb-2 pt-5 transition-all duration-300",
          error ? "border-destructive/70" : "border-border hover:border-primary/50",
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute left-3 text-muted-foreground transition-all duration-300",
            filled ? "top-1.5 text-[10px] uppercase tracking-[0.18em]" : "top-4 text-sm",
          )}
        >
          {label}
        </span>
        {children}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-1 text-xs text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
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
  error?: string;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <FieldShell label={label} filled={Boolean(value)} error={error}>
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
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-y-0.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] min-w-56 border-border bg-popover p-0" align="start">
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

export function BookingForm() {
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [trip, setTrip] = useState("One Way");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!pickup) next.pickup = "Pickup location is required";
    if (!drop) next.drop = "Drop location is required";
    if (pickup && drop && pickup === drop) next.drop = "Drop must differ from pickup";
    if (!date) next.date = "Choose a pickup date";
    if (!time) next.time = "Pickup time is mandatory";
    if (!vehicle) next.vehicle = "Select a vehicle";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      toast.success("Ride request received", {
        description: `${trip} · ${pickup} → ${drop} · ${date ? format(date, "dd MMM yyyy") : ""} ${time}. Our team will call you shortly.`,
      });
    }, 1400);
  };

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 40, filter: "blur(14px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 1, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="glass w-full rounded-2xl p-5 md:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.22em] text-primary">
          Book your ride
        </p>
        <span className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground">
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
              "rounded-full border px-3.5 py-1.5 text-xs transition-all duration-300",
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
        <SearchSelect
          label="Pickup"
          value={pickup}
          onChange={(v) => setPickup(v)}
          options={places}
          error={errors.pickup}
          icon={<MapPin className="size-4 text-primary" />}
        />
        <SearchSelect
          label="Drop"
          value={drop}
          onChange={(v) => setDrop(v)}
          options={places}
          error={errors.drop}
          icon={<Navigation className="size-4 text-primary" />}
        />

        <FieldShell label="Pickup date" filled={Boolean(date)} error={errors.date}>
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
          label="Vehicle"
          value={vehicle}
          onChange={setVehicle}
          options={vehicles.map((v) => v.name)}
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

      <Magnetic className="mt-5 block w-full" strength={0.15}>
        <button
          type="submit"
          disabled={loading}
          className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[5px] bg-[image:var(--gradient-gold)] px-6 py-3.5 font-display text-sm font-bold uppercase tracking-[0.14em] text-primary-foreground gold-ring disabled:opacity-80"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Finding your cab
            </>
          ) : (
            <>
              <Search className="size-4" /> Get instant quote
            </>
          )}
        </button>
      </Magnetic>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-2 overflow-hidden"
          >
            {[0, 1, 2].map((i) => (
              <div key={i} className="shimmer h-3 rounded-full" style={{ width: `${100 - i * 18}%` }} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.form>
  );
}

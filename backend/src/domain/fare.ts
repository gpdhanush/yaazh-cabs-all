import { Decimal } from "@prisma/client/runtime/library";
import type { Coupons, TariffPlans, TripType } from "@prisma/client";

export type FareInput = {
  distanceKm: number;
  tripType: TripType;
  tariff: TariffPlans;
  coupon?: Coupons | null;
};

export type FareBreakdown = {
  rate_per_km: number;
  base_fare: number;
  driver_batta: number;
  minimum_fare: number;
  distance_km: number;
  distance_fare: number;
  extra_km_charge: number;
  extra_hour_charge: number;
  night_charge: number;
  waiting_charge: number;
  permit_amount: number;
  toll_amount: number;
  parking_amount: number;
  discount_amount: number;
  gst_percentage: number;
  gst_amount: number;
  subtotal: number;
  estimated_total: number;
};

function n(d: Decimal | number | null | undefined): number {
  if (d == null) return 0;
  return typeof d === "number" ? d : Number(d);
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function calculateFare(input: FareInput): FareBreakdown {
  const { tariff, distanceKm, coupon } = input;
  const rate = n(tariff.rate_per_km);
  const base = n(tariff.base_fare);
  const batta = n(tariff.driver_batta);
  const minFare = n(tariff.minimum_fare);
  const minKm = n(tariff.minimum_km);
  const night = n(tariff.night_charge);
  const permit = n(tariff.permit_charge);
  const gstPct = n(tariff.gst_percentage);

  const billableKm = Math.max(distanceKm, minKm);
  const distanceFare = billableKm * rate;
  const extraKm = Math.max(0, distanceKm - minKm);
  const extraKmCharge = extraKm * n(tariff.extra_km_rate);

  let subtotal = base + distanceFare + batta + night + permit + extraKmCharge;
  if (subtotal < minFare) subtotal = minFare;

  let discount = 0;
  if (coupon) {
    if (coupon.discount_type === "flat") {
      discount = n(coupon.discount_value);
    } else {
      discount = (subtotal * n(coupon.discount_value)) / 100;
      const max = coupon.max_discount_amount != null ? n(coupon.max_discount_amount) : discount;
      discount = Math.min(discount, max);
    }
    if (subtotal < n(coupon.min_booking_amount)) discount = 0;
    discount = Math.min(discount, subtotal);
  }

  const taxable = Math.max(0, subtotal - discount);
  const gstAmount = round2((taxable * gstPct) / 100);
  const estimated = round2(taxable + gstAmount);

  return {
    rate_per_km: round2(rate),
    base_fare: round2(base),
    driver_batta: round2(batta),
    minimum_fare: round2(minFare),
    distance_km: round2(distanceKm),
    distance_fare: round2(distanceFare),
    extra_km_charge: round2(extraKmCharge),
    extra_hour_charge: 0,
    night_charge: round2(night),
    waiting_charge: 0,
    permit_amount: round2(permit),
    toll_amount: 0,
    parking_amount: 0,
    discount_amount: round2(discount),
    gst_percentage: round2(gstPct),
    gst_amount: gstAmount,
    subtotal: round2(subtotal),
    estimated_total: estimated,
  };
}

/** Haversine distance in km */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

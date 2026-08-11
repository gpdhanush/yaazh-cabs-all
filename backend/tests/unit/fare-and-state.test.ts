import { describe, expect, it } from "vitest";
import { calculateFare, haversineKm } from "../../src/domain/fare";
import { assertTransition, canCancel } from "../../src/domain/booking-state-machine";
import { AppError } from "../../src/errors/app-error";
import type { TariffPlans } from "@prisma/client";
import { Prisma } from "@prisma/client";

function tariff(partial: Partial<TariffPlans> = {}): TariffPlans {
  return {
    id: 1n,
    vehicle_category_id: 1n,
    trip_type: "one_way",
    route_id: null,
    rate_per_km: new Prisma.Decimal(15),
    base_fare: new Prisma.Decimal(0),
    driver_batta: new Prisma.Decimal(500),
    minimum_km: new Prisma.Decimal(0),
    minimum_fare: new Prisma.Decimal(0),
    extra_km_rate: new Prisma.Decimal(0),
    extra_hour_rate: new Prisma.Decimal(0),
    night_charge: new Prisma.Decimal(0),
    waiting_charge_per_hour: new Prisma.Decimal(0),
    permit_charge: new Prisma.Decimal(0),
    toll_included: false,
    parking_included: false,
    gst_percentage: new Prisma.Decimal(0),
    effective_from: new Date(),
    effective_to: null,
    is_active: true,
    created_at: new Date(),
    updated_at: null,
    ...partial,
  };
}

describe("fare engine", () => {
  it("calculates distance fare + batta", () => {
    const fare = calculateFare({
      distanceKm: 100,
      tripType: "one_way",
      tariff: tariff(),
    });
    expect(fare.estimated_total).toBe(2000);
  });

  it("applies percentage coupon with max cap", () => {
    const fare = calculateFare({
      distanceKm: 100,
      tripType: "one_way",
      tariff: tariff(),
      coupon: {
        id: 1n,
        code: "SAVE10",
        title: "Save",
        discount_type: "percentage",
        discount_value: new Prisma.Decimal(10),
        max_discount_amount: new Prisma.Decimal(100),
        min_booking_amount: new Prisma.Decimal(0),
        usage_limit: null,
        per_customer_limit: null,
        used_count: 0,
        valid_from: new Date(),
        valid_to: new Date(Date.now() + 86400000),
        is_active: true,
        created_at: new Date(),
        updated_at: null,
      },
    });
    expect(fare.discount_amount).toBe(100);
    expect(fare.estimated_total).toBe(1900);
  });
});

describe("booking state machine", () => {
  it("allows pending -> confirmed", () => {
    expect(() => assertTransition("pending", "confirmed")).not.toThrow();
  });

  it("blocks pending -> completed", () => {
    expect(() => assertTransition("pending", "completed")).toThrow(AppError);
  });

  it("allows confirmed -> driver_assigned (admin hard assign)", () => {
    expect(() => assertTransition("confirmed", "driver_assigned")).not.toThrow();
  });

  it("can cancel confirmed", () => {
    expect(canCancel("confirmed")).toBe(true);
  });
});

describe("haversine", () => {
  it("estimates chennai-madurai roughly", () => {
    const km = haversineKm(13.0827, 80.2707, 9.9252, 78.1198);
    expect(km).toBeGreaterThan(400);
    expect(km).toBeLessThan(520);
  });
});

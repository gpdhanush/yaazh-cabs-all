import { prisma } from "../config/database.js";
import { haversineKm } from "../domain/fare.js";
import { loadEnv } from "../config/env.js";
import { sha256 } from "../utils/crypto.js";

export const mapService = {
  async estimateRoute(pickup: { latitude: number; longitude: number }, drop: { latitude: number; longitude: number }) {
    const env = loadEnv();
    const key = sha256(
      [
        pickup.latitude.toFixed(4),
        pickup.longitude.toFixed(4),
        drop.latitude.toFixed(4),
        drop.longitude.toFixed(4),
        env.MAP_PROVIDER,
      ].join("|"),
    );

    const cached = await prisma.routeEstimateCache.findFirst({
      where: { cache_key: key, expires_at: { gt: new Date() } },
    });
    if (cached) {
      return {
        distance_km: Number(cached.distance_km),
        duration_minutes: cached.duration_minutes,
        provider: cached.provider,
        cached: true,
      };
    }

    let distanceKm: number;
    let durationMinutes: number;
    let provider = env.MAP_PROVIDER;

    if (env.MAP_PROVIDER === "osrm" && env.OSRM_BASE_URL) {
      try {
        const url = `${env.OSRM_BASE_URL.replace(/\/$/, "")}/route/v1/driving/${pickup.longitude},${pickup.latitude};${drop.longitude},${drop.latitude}?overview=false`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`OSRM ${res.status}`);
        const json = (await res.json()) as {
          routes?: Array<{ distance: number; duration: number }>;
        };
        const route = json.routes?.[0];
        if (!route) throw new Error("No route");
        distanceKm = route.distance / 1000;
        durationMinutes = Math.round(route.duration / 60);
        provider = "osrm";
      } catch {
        distanceKm = haversineKm(pickup.latitude, pickup.longitude, drop.latitude, drop.longitude);
        durationMinutes = Math.round((distanceKm / 40) * 60);
        provider = "haversine";
      }
    } else {
      distanceKm = haversineKm(pickup.latitude, pickup.longitude, drop.latitude, drop.longitude);
      durationMinutes = Math.round((distanceKm / 40) * 60);
      provider = "haversine";
    }

    distanceKm = Math.round(distanceKm * 10) / 10;

    await prisma.routeEstimateCache.create({
      data: {
        cache_key: key,
        pickup_latitude: pickup.latitude,
        pickup_longitude: pickup.longitude,
        drop_latitude: drop.latitude,
        drop_longitude: drop.longitude,
        distance_km: distanceKm,
        duration_minutes: durationMinutes,
        provider,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    return { distance_km: distanceKm, duration_minutes: durationMinutes, provider, cached: false };
  },
};

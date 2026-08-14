import type { FastifyRequest } from "fastify";
import { loadEnv } from "../config/env.js";

function hostnameOf(hostOrUrl: string): string {
  const value = hostOrUrl.trim();
  try {
    const withScheme = /^https?:\/\//i.test(value) ? value : `http://${value}`;
    return new URL(withScheme).hostname.toLowerCase();
  } catch {
    return value.split(":")[0]?.toLowerCase() ?? "";
  }
}

export function isLoopbackHost(hostOrUrl: string): boolean {
  const host = hostnameOf(hostOrUrl);
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "[::1]"
  );
}

/** Public API origin for shareable links (invoices, uploads). Never prefer loopback when the request came from a real host. */
export function publicApiOrigin(req?: FastifyRequest): string {
  const env = loadEnv();
  const configured = env.APP_URL.replace(/\/$/, "");
  if (!isLoopbackHost(configured)) return configured;

  const forwarded = String(req?.headers["x-forwarded-host"] ?? "")
    .split(",")[0]
    ?.trim() ?? "";
  const host = forwarded || (String(req?.headers.host ?? "").split(",")[0]?.trim() ?? "");
  if (host && !isLoopbackHost(host)) {
    const proto =
      String(req?.headers["x-forwarded-proto"] ?? "")
        .split(",")[0]
        ?.trim() || (env.NODE_ENV === "production" ? "https" : "http");
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  return configured;
}

export function absolutePublicUrl(pathOrUrl: string | null | undefined, req?: FastifyRequest): string {
  const origin = publicApiOrigin(req);
  const raw = (pathOrUrl ?? "").trim();
  if (!raw) return origin;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (isLoopbackHost(url.hostname)) {
        return `${origin}${url.pathname}${url.search}`;
      }
      return raw;
    } catch {
      return raw;
    }
  }
  return `${origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

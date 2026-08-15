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

function isFrontendHost(hostOrUrl: string): boolean {
  const host = hostnameOf(hostOrUrl);
  if (!host) return false;
  if (host.endsWith(".vercel.app")) return true;
  const env = loadEnv();
  const web = hostnameOf(env.PUBLIC_WEB_URL);
  return Boolean(web) && host === web;
}

function originFromRequest(req?: FastifyRequest): string | null {
  const env = loadEnv();
  const forwarded = String(req?.headers["x-forwarded-host"] ?? "")
    .split(",")[0]
    ?.trim() ?? "";
  const host = forwarded || (String(req?.headers.host ?? "").split(",")[0]?.trim() ?? "");
  if (!host || isLoopbackHost(host) || isFrontendHost(host)) return null;
  const proto =
    String(req?.headers["x-forwarded-proto"] ?? "")
      .split(",")[0]
      ?.trim() || (env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}`.replace(/\/$/, "");
}

/** Public API origin for shareable links (invoices, uploads). Never use the marketing site. */
export function publicApiOrigin(req?: FastifyRequest): string {
  const env = loadEnv();
  const fromReq = originFromRequest(req);
  if (fromReq) return fromReq;

  const render = (process.env.RENDER_EXTERNAL_URL ?? "").replace(/\/$/, "");
  if (render && !isLoopbackHost(render) && !isFrontendHost(render)) return render;

  const configured = env.APP_URL.replace(/\/$/, "");
  if (!isLoopbackHost(configured) && !isFrontendHost(configured)) return configured;

  return fromReq || render || configured;
}

export function publicInvoiceApiPath(invoiceNumber: string): string {
  const num = invoiceNumber.replace(/\.pdf$/i, "").trim();
  return `/api/v1/public/invoices/${encodeURIComponent(num)}.pdf`;
}

/** Persist `/storage/...` paths so files stay on the API host, not the marketing site. */
export function toStoredMediaPath(pathOrUrl: string | null | undefined): string | null {
  const raw = (pathOrUrl ?? "").trim();
  if (!raw) return null;
  let pathname = raw;
  try {
    pathname = new URL(raw).pathname;
  } catch {
    pathname = raw.split("?")[0] ?? raw;
  }
  if (pathname.startsWith("/storage/")) return pathname;
  return raw;
}

function rewriteInvoicePath(raw: string): string {
  const match = raw.match(/\/(?:storage\/public\/invoices|api\/v1\/public\/invoices)\/([^/?#]+)/i);
  if (!match?.[1]) return raw;
  return publicInvoiceApiPath(decodeURIComponent(match[1]));
}

/** Durable API path — Render disk is ephemeral, files are served from stored_media. */
function rewriteStorageMediaPath(raw: string): string {
  const invoiced = rewriteInvoicePath(raw);
  if (invoiced !== raw) return invoiced;
  const match = raw.match(/\/storage\/public\/(.+)/i);
  if (!match?.[1] || match[1].toLowerCase().startsWith("invoices/")) return raw;
  return `/api/v1/public/media/${match[1]}`;
}

export function absolutePublicUrl(pathOrUrl: string | null | undefined, req?: FastifyRequest): string {
  const origin = publicApiOrigin(req);
  let raw = (pathOrUrl ?? "").trim();
  if (!raw) return origin;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const path = rewriteStorageMediaPath(url.pathname);
      if (isLoopbackHost(url.hostname) || isFrontendHost(url.hostname) || path !== url.pathname) {
        return `${origin}${path}${url.search}`;
      }
      return raw;
    } catch {
      return raw;
    }
  }
  raw = rewriteStorageMediaPath(raw);
  return `${origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

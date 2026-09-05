import { environment } from '../../../environments/environment';

const apiOrigin = environment.apiUrl.replace(/\/api\/v1\/?$/i, '').replace(/\/$/, '');

export const DEFAULT_DRIVER_IMAGE = '/driver-default.png';

function durableMediaUrl(value: string): string | null {
  let pathname = value;
  let search = '';
  try {
    const u = new URL(value);
    pathname = u.pathname;
    search = u.search;
  } catch {
    const q = value.indexOf('?');
    if (q >= 0) {
      pathname = value.slice(0, q);
      search = value.slice(q);
    }
  }
  const invoice = pathname.match(/\/(?:storage\/public\/invoices|api\/v1\/public\/invoices)\/([^/]+)/i);
  if (invoice) return `${apiOrigin}/api/v1/public/invoices/${invoice[1]}${search}`;
  const stored = pathname.match(/\/storage\/public\/(.+)/i);
  if (stored) return `${apiOrigin}/api/v1/public/media/${stored[1]}${search}`;
  return null;
}

export function mediaUrl(raw?: string | null): string | null {
  if (raw == null) return null;
  const value = raw.trim();
  if (!value || value === 'null') return null;

  const durable = durableMediaUrl(value);
  if (durable) return durable;

  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase();
    const rewriteHost =
      ['localhost', '127.0.0.1', '10.0.2.2'].includes(host) || host.endsWith('.vercel.app');
    if (rewriteHost) {
      return `${apiOrigin}${u.pathname}${u.search}`;
    }
    return value;
  } catch {
    /* relative */
  }

  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('/')) return `${apiOrigin}${value}`;
  return `${apiOrigin}/${value}`;
}

export function driverPhotoUrl(driver?: { id?: string | null; photo_url?: string | null } | null): string | null {
  if (!driver) return null;
  if (driver.photo_url) return mediaUrl(driver.photo_url);
  if (driver.id) return mediaUrl(`/api/v1/public/drivers/${driver.id}/photo`);
  return null;
}

import { environment } from '../../../environments/environment';

const apiOrigin = environment.apiUrl.replace(/\/$/, '');

export function mediaUrl(raw?: string | null): string | null {
  if (raw == null) return null;
  const value = raw.trim();
  if (!value || value === 'null') return null;

  try {
    const u = new URL(value);
    if (['localhost', '127.0.0.1', '10.0.2.2'].includes(u.hostname)) {
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

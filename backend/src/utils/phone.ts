/** Store and match Indian mobiles as 10-digit numbers. */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function phoneLookupVariants(phone: string): string[] {
  const n = normalizePhone(phone);
  return [...new Set([n, `91${n}`, `+91${n}`, `0${n}`])];
}

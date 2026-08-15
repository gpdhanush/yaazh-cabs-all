import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { loadEnv } from "../config/env.js";
import { NotFoundError, ValidationError } from "../errors/app-error.js";
import { sendMail } from "./mail.service.js";
import { publicInvoiceApiPath } from "../utils/public-url.js";
import { pngBlackToTransparent } from "../utils/png-black-to-transparent.js";

const INVOICE_TZ = "Asia/Kolkata";

function formatInvoiceDateTime(value: Date | null | undefined): string {
  if (!value) return "—";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: INVOICE_TZ,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
      .formatToParts(value)
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const hour = (parts.hour ?? "").padStart(2, "0");
  const ampm = (parts.dayPeriod ?? "").replace(/\./g, "").toUpperCase();
  return `${parts.day}-${parts.month}-${parts.year} ${hour}:${parts.minute}:${parts.second} ${ampm}`;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function dec(n: number) {
  return new Prisma.Decimal(n);
}

function money(n: number): string {
  return `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type InvoiceDto = {
  id: string;
  booking_id: string;
  invoice_number: string;
  invoice_date: string;
  subtotal: number;
  discount_amount: number;
  taxable_amount: number;
  gst_percentage: number;
  gst_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_amount: number;
  currency: string;
  status: string;
  pdf_url: string | null;
  issued_at: string | null;
};

export function serializeInvoice(row: {
  id: bigint;
  booking_id: bigint;
  invoice_number: string;
  invoice_date: Date;
  subtotal: { toString(): string };
  discount_amount: { toString(): string };
  taxable_amount: { toString(): string };
  gst_percentage: { toString(): string };
  gst_amount: { toString(): string };
  total_amount: { toString(): string };
  amount_paid: { toString(): string };
  balance_amount: { toString(): string };
  currency: string;
  status: string;
  pdf_url: string | null;
  issued_at: Date | null;
}): InvoiceDto {
  return {
    id: String(row.id),
    booking_id: String(row.booking_id),
    invoice_number: row.invoice_number,
    invoice_date: row.invoice_date.toISOString().slice(0, 10),
    subtotal: Number(row.subtotal),
    discount_amount: Number(row.discount_amount),
    taxable_amount: Number(row.taxable_amount),
    gst_percentage: Number(row.gst_percentage),
    gst_amount: Number(row.gst_amount),
    total_amount: Number(row.total_amount),
    amount_paid: Number(row.amount_paid),
    balance_amount: Number(row.balance_amount),
    currency: row.currency,
    status: row.status,
    pdf_url: row.pdf_url,
    issued_at: row.issued_at?.toISOString() ?? null,
  };
}

export async function resolveCustomerEmail(bookingId: bigint): Promise<string | null> {
  const booking = await prisma.bookings.findUnique({
    where: { id: bookingId },
    select: { customer_email: true, customer_id: true },
  });
  if (!booking) return null;
  const direct = booking.customer_email?.trim();
  if (direct) return direct;
  if (!booking.customer_id) return null;
  const customer = await prisma.customers.findUnique({
    where: { id: booking.customer_id },
    select: { email: true },
  });
  return customer?.email?.trim() || null;
}

async function companyProfile() {
  const keys = ["company_name", "support_phone", "support_email", "business_address"];
  const rows = await prisma.appSettings.findMany({ where: { setting_key: { in: keys } } });
  const map = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value ?? ""]));
  return {
    name: map.company_name || "Yaazh Cabs",
    phone: map.support_phone || "",
    email: map.support_email || "",
    address: map.business_address || "Udumalpet, Tamil Nadu",
  };
}

function invoiceLogoPath(): string | null {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(process.cwd(), "assets/admin-invoice.png"),
    path.resolve(process.cwd(), "backend/assets/admin-invoice.png"),
    path.resolve(here, "../../assets/admin-invoice.png"),
    path.resolve(here, "../assets/admin-invoice.png"),
    path.resolve(process.cwd(), "assets/invoice-logo.png"),
    path.resolve(here, "../../assets/invoice-logo.png"),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

let cachedInvoiceLogo: Buffer | null | undefined;

function invoiceLogoImage(): Buffer | null {
  if (cachedInvoiceLogo !== undefined) return cachedInvoiceLogo;
  const logoPath = invoiceLogoPath();
  if (!logoPath) {
    cachedInvoiceLogo = null;
    return null;
  }
  const raw = fs.readFileSync(logoPath);
  try {
    cachedInvoiceLogo = pngBlackToTransparent(raw);
  } catch {
    cachedInvoiceLogo = raw;
  }
  return cachedInvoiceLogo;
}

function invoicePdfPath(invoiceNumber: string) {
  const env = loadEnv();
  const dir = path.resolve(env.STORAGE_PATH, "public", "invoices");
  fs.mkdirSync(dir, { recursive: true });
  return {
    abs: path.join(dir, `${invoiceNumber}.pdf`),
    url: publicInvoiceApiPath(invoiceNumber),
  };
}

async function buildInvoicePdf(params: {
  invoiceNumber: string;
  invoiceDate: Date;
  booking: {
    booking_reference: string;
    customer_name: string;
    customer_phone: string;
    customer_email: string | null;
    pickup_location: string;
    drop_location: string;
    pickup_at: Date;
    completed_at: Date | null;
    trip_type: string;
    estimated_distance_km: { toString(): string } | null;
    actual_distance_km: { toString(): string } | null;
  };
  amounts: {
    subtotal: number;
    discount: number;
    taxable: number;
    gstPct: number;
    gst: number;
    total: number;
    paid: number;
    balance: number;
  };
}): Promise<Buffer> {
  const company = await companyProfile();
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const primary = "#4B49AC";
  const text = "#1F1E39";
  const muted = "#6B7289";
  const line = "#E4E7F1";
  const card = "#F4F6FB";
  const paid = params.amounts.balance <= 0 && params.amounts.total > 0;
  const tripLabel = params.booking.trip_type.replace(/_/g, " ");
  const km =
    params.booking.actual_distance_km != null
      ? Number(params.booking.actual_distance_km)
      : params.booking.estimated_distance_km != null
        ? Number(params.booking.estimated_distance_km)
        : null;
  const contact = [company.phone, company.email].filter(Boolean).join("  |  ");
  const invoiceDate = formatInvoiceDateTime(params.invoiceDate);
  const pickup = formatInvoiceDateTime(params.booking.pickup_at);
  const completed = formatInvoiceDateTime(params.booking.completed_at);

  const logoBuf = invoiceLogoImage();
  const logoSize = 180;
  const headerH = logoBuf ? logoSize + 24 : 128;
  doc.rect(0, 0, pageW, headerH).fill(primary);
  doc.rect(0, headerH, pageW, 8).fill("#98BDFF");

  if (logoBuf) {
    doc.image(logoBuf, 12, 12, { fit: [logoSize, logoSize] });
  } else {
    doc.circle(56, 58, 22).fill("#FFFFFF");
    doc.fillColor(primary).font("Helvetica-Bold").fontSize(13).text("YZ", 34, 51, { width: 44, align: "center" });
  }

  const metaX = logoBuf ? 200 : 102;
  const metaW = pageW - metaX - 24;
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(11).text("INVOICE", metaX, 18, {
    width: metaW,
    align: "right",
  });
  doc.font("Helvetica").fontSize(9).fillColor("#E0E7FF");
  doc.text(params.invoiceNumber, metaX, 36, { width: metaW, align: "right" });
  doc.text(`Date ${invoiceDate}`, metaX, 50, { width: metaW, align: "right" });
  doc.text(`Booking ${params.booking.booking_reference}`, metaX, 64, { width: metaW, align: "right" });
  doc.text(`Completed ${completed}`, metaX, 78, { width: metaW, align: "right" });
  if (company.address) doc.text(company.address, metaX, 96, { width: metaW, align: "right" });
  if (contact) doc.text(contact, metaX, 110, { width: metaW, align: "right" });

  const pill = paid ? "PAID" : params.amounts.paid > 0 ? "PARTIAL" : "DUE";
  const pillColor = paid ? "#22C55E" : params.amounts.paid > 0 ? "#F59E0B" : "#F3797E";
  doc.roundedRect(pageW - 74, headerH - 30, 50, 16, 8).fill(pillColor);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8).text(pill, pageW - 74, headerH - 26, {
    width: 50,
    align: "center",
  });

  const left = 40;
  const colW = 247;
  const gap = 16;
  let y = headerH + 28;

  doc.roundedRect(left, y, colW, 136, 8).fill(card);
  doc.roundedRect(left + colW + gap, y, colW, 136, 8).fill(card);

  doc.fillColor(primary).font("Helvetica-Bold").fontSize(8).text("BILL TO", left + 16, y + 14);
  doc.fillColor(text).font("Helvetica-Bold").fontSize(12).text(params.booking.customer_name, left + 16, y + 32, {
    width: colW - 32,
  });
  doc.font("Helvetica").fontSize(10).fillColor(muted);
  doc.text(params.booking.customer_phone, left + 16, y + 54, { width: colW - 32 });
  if (params.booking.customer_email) {
    doc.text(params.booking.customer_email, left + 16, y + 70, { width: colW - 32 });
  }

  const tripX = left + colW + gap;
  doc.fillColor(primary).font("Helvetica-Bold").fontSize(8).text("TRIP", tripX + 16, y + 14);
  doc.fillColor(text).font("Helvetica-Bold").fontSize(11).text(
    `${params.booking.pickup_location}  to  ${params.booking.drop_location}`,
    tripX + 16,
    y + 32,
    { width: colW - 32 },
  );
  doc.font("Helvetica").fontSize(9).fillColor(muted);
  doc.text(`${tripLabel}`, tripX + 16, y + 68, { width: colW - 32 });
  doc.text(`Pickup ${pickup}`, tripX + 16, y + 84, { width: colW - 32 });
  doc.text(`Drop completed ${completed}`, tripX + 16, y + 100, { width: colW - 32 });
  if (km != null) doc.text(`Distance ${km} km`, tripX + 16, y + 116, { width: colW - 32 });

  y += 158;
  doc.fillColor(text).font("Helvetica-Bold").fontSize(13).text("Fare summary", left, y);
  y += 22;

  const tableW = pageW - left * 2;
  const rows: Array<[string, string, boolean]> = [
    ["Subtotal", money(params.amounts.subtotal), false],
    ["Discount", `- ${money(params.amounts.discount)}`, false],
    ["Taxable amount", money(params.amounts.taxable), false],
    [`GST (${params.amounts.gstPct}%)`, money(params.amounts.gst), false],
    ["Total", money(params.amounts.total), true],
    ["Amount paid", money(params.amounts.paid), true],
    ["Balance due", money(params.amounts.balance), true],
  ];

  doc.roundedRect(left, y, tableW, rows.length * 32 + 8, 10).fill(card);
  rows.forEach(([label, value, emphasis], i) => {
    const rowY = y + 8 + i * 32;
    if (i === 4) {
      doc.rect(left, rowY - 4, tableW, 32).fill(primary);
      doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(11);
    } else {
      if (i % 2 === 1 && i < 4) {
        doc.rect(left, rowY - 4, tableW, 32).fill("#EEF0F8");
      }
      doc.fillColor(emphasis ? text : muted).font(emphasis ? "Helvetica-Bold" : "Helvetica").fontSize(10);
    }
    doc.text(label, left + 18, rowY + 6, { width: 240 });
    doc.text(value, left + tableW - 200, rowY + 6, { width: 182, align: "right" });
  });

  y += rows.length * 32 + 36;
  doc.moveTo(left, y).lineTo(pageW - left, y).strokeColor(line).lineWidth(1).stroke();
  doc.font("Helvetica").fontSize(9).fillColor(muted);
  doc.text(
    "Thank you for riding with Yaazh Cabs. Toll, parking and permit charges are extra when applicable.",
    left,
    y + 14,
    { width: tableW, align: "center" },
  );
  doc.text("This is a computer-generated invoice.", left, pageH - 36, { width: tableW, align: "center" });

  doc.end();
  return done;
}

export async function upsertBookingInvoice(bookingId: bigint) {
  const booking = await prisma.bookings.findUnique({ where: { id: bookingId } });
  if (!booking) throw new NotFoundError("Booking not found.");

  const paidAgg = await prisma.payments.aggregate({
    where: { booking_id: bookingId, status: "success" },
    _sum: { amount: true },
  });
  const amountPaid = roundMoney(Number(paidAgg._sum.amount ?? 0));
  const total = roundMoney(Number(booking.final_total ?? booking.estimated_total ?? 0));
  const gst = roundMoney(Number(booking.gst_amount ?? 0));
  const gstPct = roundMoney(Number(booking.gst_percentage ?? 0));
  const discount = roundMoney(Number(booking.discount_amount ?? 0));
  const taxable = roundMoney(Math.max(0, total - gst));
  const subtotal = roundMoney(taxable + discount);
  const balance = roundMoney(Math.max(0, total - amountPaid));
  const status = balance <= 0 && total > 0 ? "paid" : amountPaid > 0 ? "partially_paid" : "issued";
  const invoiceNumber = `INV-${booking.booking_reference}`;
  const invoiceDate = booking.completed_at ?? booking.confirmed_at ?? new Date();

  const pdfBuffer = await buildInvoicePdf({
    invoiceNumber,
    invoiceDate,
    booking: {
      booking_reference: booking.booking_reference,
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      customer_email: booking.customer_email,
      pickup_location: booking.pickup_location,
      drop_location: booking.drop_location,
      pickup_at: booking.pickup_at,
      completed_at: booking.completed_at,
      trip_type: booking.trip_type,
      estimated_distance_km: booking.estimated_distance_km,
      actual_distance_km: booking.actual_distance_km,
    },
    amounts: { subtotal, discount, taxable, gstPct, gst, total, paid: amountPaid, balance },
  });

  const file = invoicePdfPath(invoiceNumber);
  fs.writeFileSync(file.abs, pdfBuffer);

  const data = {
    invoice_number: invoiceNumber,
    invoice_date: invoiceDate,
    subtotal: dec(subtotal),
    discount_amount: dec(discount),
    taxable_amount: dec(taxable),
    gst_percentage: dec(gstPct),
    gst_amount: dec(gst),
    total_amount: dec(total),
    amount_paid: dec(amountPaid),
    balance_amount: dec(balance),
    currency: "INR",
    status: status as "issued" | "paid" | "partially_paid",
    pdf_url: file.url,
    issued_at: new Date(),
  };

  const existing = await prisma.bookingInvoices.findUnique({ where: { booking_id: bookingId } });
  const row = existing
    ? await prisma.bookingInvoices.update({ where: { id: existing.id }, data })
    : await prisma.bookingInvoices.create({ data: { booking_id: bookingId, ...data } });

  return { invoice: serializeInvoice(row), pdfBuffer, pdfPath: file.abs };
}

export async function loadPublicInvoicePdf(invoiceNumber: string) {
  const num = decodeURIComponent(invoiceNumber).replace(/\.pdf$/i, "").trim();
  if (!/^INV-[A-Za-z0-9-]+$/i.test(num)) {
    throw new ValidationError("Invalid invoice number.");
  }
  let row = await prisma.bookingInvoices.findUnique({ where: { invoice_number: num } });
  if (!row) {
    const bookingRef = num.replace(/^INV-/i, "");
    const booking = await prisma.bookings.findFirst({
      where: { booking_reference: bookingRef },
      select: { id: true },
    });
    if (!booking) throw new NotFoundError("Invoice not found.");
    return upsertBookingInvoice(booking.id);
  }
  return upsertBookingInvoice(row.booking_id);
}

export async function sendBookingInvoiceEmail(bookingId: bigint, to?: string | null) {
  const { invoice, pdfBuffer } = await upsertBookingInvoice(bookingId);
  const email = to?.trim() || (await resolveCustomerEmail(bookingId));
  if (!email) {
    return { sent: false as const, email: null, error: "Customer has no email address.", invoice };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError("Customer email is invalid.");
  }
  const booking = await prisma.bookings.findUnique({ where: { id: bookingId } });
  if (!booking) throw new NotFoundError("Booking not found.");

  const company = await companyProfile();
  const total = money(invoice.total_amount);
  const subject = `Yaazh Cabs invoice ${invoice.invoice_number} · ${booking.booking_reference}`;
  const text = [
    `Hello ${booking.customer_name},`,
    "",
    `Please find invoice ${invoice.invoice_number} for booking ${booking.booking_reference}.`,
    `${booking.pickup_location} → ${booking.drop_location}`,
    `Total: ${total}`,
    invoice.balance_amount > 0 ? `Balance due: ${money(invoice.balance_amount)}` : "This invoice is paid.",
    "",
    `— ${company.name}`,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
      <h2 style="margin:0 0 8px">${company.name}</h2>
      <p style="margin:0 0 16px;color:#475569">Booking invoice</p>
      <p>Hello ${escapeHtml(booking.customer_name)},</p>
      <p>Your invoice <strong>${escapeHtml(invoice.invoice_number)}</strong> for booking
      <strong>${escapeHtml(booking.booking_reference)}</strong> is attached.</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Route</td><td>${escapeHtml(booking.pickup_location)} → ${escapeHtml(booking.drop_location)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Total</td><td><strong>${total}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Balance</td><td>${money(invoice.balance_amount)}</td></tr>
      </table>
      <p style="color:#64748b;font-size:13px">Thank you for riding with ${escapeHtml(company.name)}.</p>
    </div>
  `;

  const result = await sendMail({
    to: email,
    subject,
    text,
    html,
    attachments: [
      {
        filename: `${invoice.invoice_number}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  return { sent: result.sent, email, error: result.error, invoice };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { loadEnv } from "../config/env.js";
import { NotFoundError, ValidationError } from "../errors/app-error.js";
import { sendMail } from "./mail.service.js";
import { publicInvoiceApiPath } from "../utils/public-url.js";

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function dec(n: number) {
  return new Prisma.Decimal(n);
}

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const tripLabel = params.booking.trip_type.replace(/_/g, " ");
  const km =
    params.booking.actual_distance_km != null
      ? Number(params.booking.actual_distance_km)
      : params.booking.estimated_distance_km != null
        ? Number(params.booking.estimated_distance_km)
        : null;

  doc.fillColor("#0f172a").fontSize(22).font("Helvetica-Bold").text(company.name);
  doc.fontSize(10).font("Helvetica").fillColor("#475569");
  if (company.address) doc.text(company.address);
  const contact = [company.phone, company.email].filter(Boolean).join("  ·  ");
  if (contact) doc.text(contact);

  doc.moveDown(1.2);
  doc.fillColor("#0f172a").fontSize(18).font("Helvetica-Bold").text("Booking invoice");
  doc.fontSize(10).font("Helvetica").fillColor("#475569");
  doc.text(`Invoice ${params.invoiceNumber}`);
  doc.text(`Date ${params.invoiceDate.toISOString().slice(0, 10)}`);
  doc.text(`Booking ${params.booking.booking_reference}`);

  doc.moveDown(1);
  doc.fillColor("#0f172a").fontSize(11).font("Helvetica-Bold").text("Bill to");
  doc.font("Helvetica").fontSize(10).fillColor("#334155");
  doc.text(params.booking.customer_name);
  doc.text(params.booking.customer_phone);
  if (params.booking.customer_email) doc.text(params.booking.customer_email);

  doc.moveDown(0.8);
  doc.fillColor("#0f172a").fontSize(11).font("Helvetica-Bold").text("Trip");
  doc.font("Helvetica").fontSize(10).fillColor("#334155");
  doc.text(`${params.booking.pickup_location}  →  ${params.booking.drop_location}`);
  doc.text(`${tripLabel}  ·  Pickup ${params.booking.pickup_at.toLocaleString("en-IN")}`);
  if (km != null) doc.text(`Distance ${km} km`);

  doc.moveDown(1.2);
  const tableTop = doc.y;
  const labelX = 48;
  const valueX = 400;
  const rows: Array<[string, string]> = [
    ["Subtotal", money(params.amounts.subtotal)],
    ["Discount", `- ${money(params.amounts.discount)}`],
    ["Taxable amount", money(params.amounts.taxable)],
    [`GST (${params.amounts.gstPct}%)`, money(params.amounts.gst)],
    ["Total", money(params.amounts.total)],
    ["Amount paid", money(params.amounts.paid)],
    ["Balance due", money(params.amounts.balance)],
  ];
  doc.fontSize(10);
  rows.forEach(([label, value], i) => {
    const y = tableTop + i * 20;
    const last = i >= rows.length - 3;
    doc.font(last ? "Helvetica-Bold" : "Helvetica").fillColor("#0f172a");
    doc.text(label, labelX, y, { width: 280 });
    doc.text(value, valueX, y, { width: 140, align: "right" });
  });

  doc.moveDown(4);
  doc.font("Helvetica").fontSize(9).fillColor("#64748b");
  doc.text("Thank you for riding with Yaazh Cabs. Toll, parking and permit charges are extra when applicable.", 48, doc.y + 16, {
    width: 500,
  });

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

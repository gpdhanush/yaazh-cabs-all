const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const COLORS = {
  ink: '#172033',
  muted: '#64748b',
  gold: '#f5b700',
  goldDark: '#c88f00',
  navy: '#0b1220',
  line: '#e2e8f0',
  pale: '#f8fafc',
  green: '#15803d',
};

function money(value) {
  return `INR ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateText(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function logoPath() {
  const candidates = [
    path.resolve(__dirname, '../storage/public/logo.png'),
    path.resolve(process.cwd(), 'storage/public/logo.png'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function label(document, text, x, y, width) {
  document.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8).text(text.toUpperCase(), x, y, { width, characterSpacing: 0.8 });
}

function value(document, text, x, y, width, options = {}) {
  document.fillColor(options.color || COLORS.ink).font(options.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(options.size || 10).text(String(text || '-'), x, y, { width, lineGap: 2 });
}

function createInvoicePdf({ booking, invoice }) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const chunks = [];
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);

    const pageWidth = 595.28;
    const left = 42;
    const right = pageWidth - 42;
    const contentWidth = right - left;
    const number = invoice?.invoice_number || `INV-${booking.booking_reference || booking.id}`;
    const subtotal = Number(invoice?.subtotal ?? booking.estimated_total ?? 0);
    const discount = Number(invoice?.discount_amount || 0);
    const gst = Number(invoice?.gst_amount || 0);
    const total = Number(invoice?.total_amount ?? booking.final_total ?? booking.estimated_total ?? 0);
    const paymentRows = Array.isArray(invoice?.payments) ? invoice.payments : [];
    const recordedPaid = paymentRows
      .filter((payment) => payment.status === 'success')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const paid = paymentRows.length ? recordedPaid : Number(invoice?.amount_paid || 0);
    const balance = Math.max(0, total - paid);
    const paymentStatus = balance <= 0 ? 'paid' : paid > 0 ? 'partially_paid' : (invoice?.status || booking.payment_status || 'issued');

    document.rect(0, 0, pageWidth, 132).fill(COLORS.navy);
    const logo = logoPath();
    if (logo) {
      document.image(logo, left, 27, { fit: [210, 76] });
    } else {
      document.fillColor('#ffffff').font('Helvetica-Bold').fontSize(25).text('YAAZH', left, 38);
      document.fillColor(COLORS.gold).text(' CABS', left + 88, 38);
    }
    document.fillColor('#ffffff').font('Helvetica-Bold').fontSize(25).text('INVOICE', 370, 38, { width: 183, align: 'right' });
    document.fillColor('#cbd5e1').font('Helvetica').fontSize(9).text(number, 370, 73, { width: 183, align: 'right' });

    document.roundedRect(left, 158, contentWidth, 80, 10).fill(COLORS.pale);
    label(document, 'Invoice date', left + 18, 176, 130);
    value(document, dateText(invoice?.invoice_date), left + 18, 191, 130, { bold: true });
    label(document, 'Booking reference', left + 185, 176, 145);
    value(document, booking.booking_reference, left + 185, 191, 145, { bold: true });
    label(document, 'Payment status', left + 370, 176, 140);
    value(document, paymentStatus.toUpperCase(), left + 370, 191, 140, { bold: true, color: balance <= 0 ? COLORS.green : COLORS.goldDark });

    document.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(14).text('Billed to', left, 275);
    document.fillColor(COLORS.gold).rect(left, 299, 4, 58).fill();
    label(document, 'Customer', left + 16, 303, 220);
    value(document, String(booking.customer_name || '').toUpperCase(), left + 16, 318, 220, { bold: true, size: 11 });
    value(document, booking.customer_phone, left + 16, 337, 220);
    value(document, String(booking.customer_email || '').toLowerCase(), left + 16, 354, 220);

    document.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(14).text('Trip details', 330, 275);
    document.fillColor(COLORS.gold).rect(330, 299, 4, 58).fill();
    label(document, 'Pickup', 346, 303, 200);
    value(document, booking.pickup_location, 346, 318, 207, { bold: true });
    label(document, 'Drop', 346, 337, 200);
    value(document, booking.drop_location, 346, 352, 207, { bold: true });
    value(document, `Pickup time: ${dateText(booking.pickup_at)}`, 346, 371, 207, { color: COLORS.muted, size: 9 });

    document.roundedRect(left, 406, contentWidth, 42, 8).fill(COLORS.navy);
    document.fillColor('#cbd5e1').font('Helvetica-Bold').fontSize(9).text('DESCRIPTION', left + 16, 422);
    document.text('AMOUNT', 430, 422, { width: 105, align: 'right' });

    let rowY = 475;
    const row = (name, amount, color = COLORS.ink) => {
      document.fillColor(color).font('Helvetica').fontSize(10).text(name, left + 16, rowY, { width: 300 });
      document.font('Helvetica-Bold').text(money(amount), 430, rowY, { width: 105, align: 'right' });
      document.strokeColor(COLORS.line).lineWidth(0.7).moveTo(left + 16, rowY + 24).lineTo(right - 16, rowY + 24).stroke();
      rowY += 38;
    };
    row('Trip fare', subtotal);
    if (discount) row('Discount', -discount, COLORS.green);
    if (gst) row(`Tax / GST${invoice?.gst_percentage ? ` (${invoice.gst_percentage}%)` : ''}`, gst);

    document.roundedRect(335, rowY + 8, 218, 106, 10).fill('#fff8df');
    label(document, 'Amount due', 355, rowY + 27, 100);
    document.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(22).text(money(total), 355, rowY + 43, { width: 178, align: 'right' });
    label(document, 'Balance remaining', 355, rowY + 79, 120);
    value(document, money(balance), 355, rowY + 94, 178, { bold: true, color: balance > 0 ? COLORS.goldDark : COLORS.green, size: 10 });

    document.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text('Toll, parking and permit charges may be billed separately where applicable.', left, 720, { width: contentWidth });
    document.strokeColor(COLORS.line).lineWidth(1).moveTo(left, 760).lineTo(right, 760).stroke();
    document.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(10).text('Thank you for riding with Yaazh Cabs.', left, 778);
    document.text('yaazhcabsudumalpet.in', 350, 778, { width: 203, align: 'right' });
    document.end();
  });
}

module.exports = { createInvoicePdf };

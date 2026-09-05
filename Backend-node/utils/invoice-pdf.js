const PDFDocument = require('pdfkit');

function createInvoicePdf({ booking, invoice }) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks = [];
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);

    const number = invoice?.invoice_number || `INV-${booking.id}`;
    const total = Number(invoice?.total_amount ?? booking.final_total ?? booking.estimated_total ?? 0);
    document.fontSize(22).text('Yaazh Cabs', { bold: true });
    document.fontSize(10).fillColor('#666').text('Safe journey, every time');
    document.moveDown(2).fillColor('#111').fontSize(18).text('Invoice');
    document.fontSize(10).text(`Invoice number: ${number}`);
    document.text(`Booking reference: ${booking.booking_reference}`);
    document.text(`Date: ${new Date().toLocaleDateString('en-IN')}`);
    document.moveDown();
    document.fontSize(12).text('Customer', { underline: true });
    document.fontSize(10).text(`${booking.customer_name} | ${booking.customer_phone}`);
    if (booking.customer_email) document.text(booking.customer_email);
    document.moveDown();
    document.fontSize(12).text('Trip', { underline: true });
    document.fontSize(10).text(`${booking.pickup_location} to ${booking.drop_location}`);
    document.text(`Pickup: ${booking.pickup_at}`);
    document.moveDown();
    document.fontSize(12).text('Amount', { underline: true });
    document.fontSize(14).text(`Total: INR ${total.toFixed(2)}`);
    document.fontSize(9).fillColor('#666').text('Toll, parking and permit charges may be billed separately where applicable.');
    document.end();
  });
}

module.exports = { createInvoicePdf };

const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const COLORS = {
  ink: "#172033",
  muted: "#64748b",
  gold: "#f5b700",
  goldDark: "#c88f00",
  navy: "#0b1220",
  line: "#e2e8f0",
  pale: "#f8fafc",
  green: "#15803d",
};

function money(value) {
  return `INR ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function dateText(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function logoPath() {
  const candidates = [
    path.resolve(__dirname, "../storage/public/logo.png"),
    path.resolve(process.cwd(), "storage/public/logo.png"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

/**
 * Font helpers
 *
 * Put Inter font files here if you have them:
 *
 * storage/public/fonts/Inter-Regular.ttf
 * storage/public/fonts/Inter-SemiBold.ttf
 * storage/public/fonts/Inter-Bold.ttf
 *
 * Helvetica remains the fallback so the PDF will still work
 * if the font files are not present.
 */
function fontPaths() {
  return {
    regular: [
      path.resolve(__dirname, "../storage/public/fonts/Inter-Regular.ttf"),
      path.resolve(process.cwd(), "storage/public/fonts/Inter-Regular.ttf"),
    ].find((file) => fs.existsSync(file)),

    semibold: [
      path.resolve(__dirname, "../storage/public/fonts/Inter-SemiBold.ttf"),
      path.resolve(process.cwd(), "storage/public/fonts/Inter-SemiBold.ttf"),
    ].find((file) => fs.existsSync(file)),

    bold: [
      path.resolve(__dirname, "../storage/public/fonts/Inter-Bold.ttf"),
      path.resolve(process.cwd(), "storage/public/fonts/Inter-Bold.ttf"),
    ].find((file) => fs.existsSync(file)),
  };
}

function setupFonts(document) {
  const fonts = fontPaths();

  document.registerFont("AppRegular", fonts.regular || "Helvetica");

  document.registerFont("AppSemiBold", fonts.semibold || fonts.regular || "Helvetica-Bold");

  document.registerFont(
    "AppBold",
    fonts.bold || fonts.semibold || fonts.regular || "Helvetica-Bold",
  );

  return {
    regular: "AppRegular",
    semibold: "AppSemiBold",
    bold: "AppBold",
  };
}

function label(document, text, x, y, width, fonts) {
  document
    .fillColor(COLORS.muted)
    .font(fonts.semibold)
    .fontSize(7.5)
    .text(text.toUpperCase(), x, y, {
      width,
      characterSpacing: 0.7,
    });
}

function value(document, text, x, y, width, fonts, options = {}) {
  document
    .fillColor(options.color || COLORS.ink)
    .font(options.bold ? fonts.semibold : fonts.regular)
    .fontSize(options.size || 9.5)
    .text(String(text || "-"), x, y, {
      width,
      lineGap: options.lineGap || 2,
    });
}

function roundedCard(document, x, y, width, height) {
  document.roundedRect(x, y, width, height, 10).fill(COLORS.pale);
}

function createInvoicePdf({ booking, invoice }) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "A4",
      margin: 0,
      bufferPages: true,
      info: {
        Title: "Yaazh Cabs Invoice",
        Author: "Yaazh Cabs",
        Subject: "Travel Invoice",
      },
    });

    const chunks = [];

    document.on("data", (chunk) => chunks.push(chunk));

    document.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    document.on("error", reject);

    const fonts = setupFonts(document);

    const pageWidth = 595.28;
    const pageHeight = 841.89;

    /*
     * Modern A4 margins
     */
    const marginX = 44;
    const contentWidth = pageWidth - marginX * 2;
    const right = pageWidth - marginX;

    const number = invoice?.invoice_number || `INV-${booking.booking_reference || booking.id}`;

    const subtotal = Number(invoice?.subtotal ?? booking.estimated_total ?? 0);

    const discount = Number(invoice?.discount_amount || 0);

    const gst = Number(invoice?.gst_amount || 0);

    const total = Number(
      invoice?.total_amount ?? booking.final_total ?? booking.estimated_total ?? 0,
    );

    const paymentRows = Array.isArray(invoice?.payments) ? invoice.payments : [];

    const recordedPaid = paymentRows
      .filter((payment) => payment.status === "success")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const paid = paymentRows.length ? recordedPaid : Number(invoice?.amount_paid || 0);

    const balance = Math.max(0, total - paid);

    const paymentStatus =
      balance <= 0
        ? "Paid"
        : paid > 0
          ? "Partially Paid"
          : String(invoice?.status || booking.payment_status || "Issued")
              .replace(/_/g, " ")
              .replace(/\b\w/g, (char) => char.toUpperCase());

    /*
     * ============================================================
     * HEADER
     * ============================================================
     */

    document.rect(0, 0, pageWidth, 105).fill(COLORS.navy);

    const logo = logoPath();

    if (logo) {
      document.image(logo, marginX, 28, {
        fit: [190, 70],
        valign: "center",
      });
    } else {
      document.fillColor("#ffffff").font(fonts.bold).fontSize(25).text("YAAZH", marginX, 38);

      document.fillColor(COLORS.gold).text(" CABS", marginX + 88, 38);
    }

    /*
     * Invoice title
     */
    document.fillColor("#ffffff").font(fonts.bold).fontSize(25).text("INVOICE", 350, 33, {
      width: 201,
      align: "right",
    });

    document.fillColor("#cbd5e1").font(fonts.regular).fontSize(9).text(number, 350, 68, {
      width: 201,
      align: "right",
    });

    /*
     * Small gold accent
     */
    document.roundedRect(535, 93, 16, 3, 1.5).fill(COLORS.gold);

    /*
     * ============================================================
     * INVOICE META
     * ============================================================
     */

    const metaY = 128;
    const metaHeight = 76;

    roundedCard(document, marginX, metaY, contentWidth, metaHeight);

    const metaColumns = [
      {
        x: marginX + 18,
        width: 135,
        label: "Invoice date",
        value: dateText(invoice?.invoice_date),
      },
      {
        x: marginX + 183,
        width: 150,
        label: "Booking reference",
        value: booking.booking_reference || "-",
      },
      {
        x: marginX + 365,
        width: 140,
        label: "Payment status",
        value: paymentStatus,
        color: balance <= 0 ? COLORS.green : COLORS.goldDark,
      },
    ];

    metaColumns.forEach((item) => {
      label(document, item.label, item.x, metaY + 19, item.width, fonts);

      value(document, item.value, item.x, metaY + 36, item.width, fonts, {
        bold: true,
        size: 10,
        color: item.color,
      });
    });

    /*
     * ============================================================
     * CUSTOMER + TRIP
     * ============================================================
     */

    const infoY = 263;

    document.fillColor(COLORS.ink).font(fonts.bold).fontSize(13).text("Billed to", marginX, infoY);

    document.fillColor(COLORS.ink).font(fonts.bold).fontSize(13).text("Trip details", 332, infoY);

    /*
     * Customer card
     */
    const customerCardY = infoY + 28;

    document.roundedRect(marginX, customerCardY, 250, 116, 10).fill(COLORS.pale);

    document.rect(marginX, customerCardY, 4, 116).fill(COLORS.gold);

    label(document, "Customer", marginX + 18, customerCardY + 17, 210, fonts);

    value(
      document,
      String(booking.customer_name || "").toUpperCase(),
      marginX + 18,
      customerCardY + 34,
      210,
      fonts,
      {
        bold: true,
        size: 10.5,
      },
    );

    value(document, booking.customer_phone, marginX + 18, customerCardY + 59, 210, fonts);

    value(
      document,
      String(booking.customer_email || "").toLowerCase(),
      marginX + 18,
      customerCardY + 79,
      210,
      fonts,
      {
        size: 8.5,
      },
    );

    /*
     * Trip card
     */
    document.roundedRect(314, customerCardY, 237, 116, 10).fill(COLORS.pale);

    document.rect(314, customerCardY, 4, 116).fill(COLORS.gold);

    label(document, "Pickup", 332, customerCardY + 17, 200, fonts);

    value(document, booking.pickup_location, 332, customerCardY + 34, 201, fonts, {
      bold: true,
      size: 9,
    });

    label(document, "Drop", 332, customerCardY + 61, 200, fonts);

    value(document, booking.drop_location, 332, customerCardY + 78, 201, fonts, {
      bold: true,
      size: 9,
    });

    value(
      document,
      `Pickup time: ${dateText(booking.pickup_at)}`,
      332,
      customerCardY + 98,
      201,
      fonts,
      {
        color: COLORS.muted,
        size: 7.8,
      },
    );

    /*
     * ============================================================
     * CHARGES
     * ============================================================
     */

    const tableY = 430;

    document.roundedRect(marginX, tableY, contentWidth, 40, 8).fill(COLORS.navy);

    document
      .fillColor("#cbd5e1")
      .font(fonts.semibold)
      .fontSize(8)
      .text("DESCRIPTION", marginX + 16, tableY + 14);

    document.text("AMOUNT", 420, tableY + 14, {
      width: 115,
      align: "right",
    });

    let rowY = tableY + 59;

    const row = (name, amount, color = COLORS.ink) => {
      document
        .fillColor(color)
        .font(fonts.regular)
        .fontSize(9.5)
        .text(name, marginX + 16, rowY, {
          width: 300,
        });

      document.fillColor(color).font(fonts.semibold).fontSize(9.5).text(money(amount), 420, rowY, {
        width: 115,
        align: "right",
      });

      document
        .strokeColor(COLORS.line)
        .lineWidth(0.7)
        .moveTo(marginX + 16, rowY + 24)
        .lineTo(right - 16, rowY + 24)
        .stroke();

      rowY += 38;
    };

    row("Trip fare", subtotal);

    if (discount) {
      row("Discount", -discount, COLORS.green);
    }

    if (gst) {
      row(`Tax / GST${invoice?.gst_percentage ? ` (${invoice.gst_percentage}%)` : ""}`, gst);
    }

    /*
     * ============================================================
     * TOTAL SUMMARY
     * ============================================================
     */

    const summaryY = rowY + 8;

    document.roundedRect(326, summaryY, 225, 118, 10).fill("#fff8df");

    label(document, "Amount due", 347, summaryY + 18, 95, fonts);

    document
      .fillColor(COLORS.navy)
      .font(fonts.bold)
      .fontSize(20)
      .text(money(total), 347, summaryY + 36, {
        width: 180,
        align: "right",
      });

    label(document, "Balance remaining", 347, summaryY + 77, 125, fonts);

    value(document, money(balance), 347, summaryY + 94, 180, fonts, {
      bold: true,
      color: balance > 0 ? COLORS.goldDark : COLORS.green,
      size: 9.5,
    });

    /*
     * ============================================================
     * PAYMENT HISTORY
     * ============================================================
     *
    * Compact payment rows without boxed separators.
     */

    let paymentSectionY = summaryY + 8;

    if (paymentRows.length) {
      document
        .fillColor(COLORS.ink)
        .font(fonts.bold)
        .fontSize(11)
        .text("Payment history", marginX, paymentSectionY);

      paymentSectionY += 22;

      /*
       * Header
       */
      label(document, "Date / Method", marginX, paymentSectionY, 210, fonts);

      label(document, "Amount", 420, paymentSectionY, 115, fonts);

      paymentSectionY += 19;

      paymentRows.forEach((payment, index) => {
        const method = String(payment.method || "payment")
          .replace(/_/g, " ")
          .toUpperCase();

        const paymentDate = dateText(payment.paid_at || payment.created_at);

        document
          .fillColor(COLORS.ink)
          .font(fonts.regular)
          .fontSize(8.5)
          .text(`${paymentDate}  ·  ${method}`, marginX, paymentSectionY, {
            width: 300,
          });

        document
          .fillColor(COLORS.ink)
          .font(fonts.semibold)
          .fontSize(8.5)
          .text(money(payment.amount), 420, paymentSectionY, {
            width: 115,
            align: "right",
          });

        paymentSectionY += 27;
      });
    }

    /*
     * ============================================================
     * NOTES
     * ============================================================
     */

    const notesY = Math.max(paymentSectionY + 12, 690);

    document.roundedRect(marginX, notesY, contentWidth, 50, 8).fill(COLORS.pale);

    label(document, "Notes", marginX + 15, notesY + 11, 60, fonts);

    document
      .fillColor(COLORS.muted)
      .font(fonts.regular)
      .fontSize(8)
      .text(
        "Toll, parking and permit charges may be billed separately where applicable.",
        marginX + 15,
        notesY + 27,
        {
          width: contentWidth - 30,
          lineGap: 2,
        },
      );

    /*
     * ============================================================
     * FOOTER
     * ============================================================
     */

    const footerLineY = 782;

    document
      .strokeColor(COLORS.line)
      .lineWidth(1)
      .moveTo(marginX, footerLineY)
      .lineTo(right, footerLineY)
      .stroke();

    document
      .fillColor(COLORS.ink)
      .font(fonts.semibold)
      .fontSize(9)
      .text("Thank you for riding with Yaazh Cabs.", marginX, footerLineY + 16);

    document
      .fillColor(COLORS.muted)
      .font(fonts.regular)
      .fontSize(8)
      .text("yaazhcabsudumalpet.in", 350, footerLineY + 17, {
        width: 201,
        align: "right",
      });

    /*
     * Small gold footer accent
     */
    document.roundedRect(marginX, footerLineY + 40, 28, 3, 1.5).fill(COLORS.gold);

    document.end();
  });
}

module.exports = {
  createInvoicePdf,
};

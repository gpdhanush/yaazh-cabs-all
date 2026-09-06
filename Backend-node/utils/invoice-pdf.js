const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

/*
|--------------------------------------------------------------------------
| COLORS
|--------------------------------------------------------------------------
| Existing Yaazh Cabs colors - DO NOT CHANGE
|--------------------------------------------------------------------------
*/

const COLORS = {
  ink: "#172033",
  muted: "#64748b",
  gold: "#f5b700",
  goldDark: "#c88f00",
  navy: "#0b1220",
  line: "#e2e8f0",
  pale: "#f8fafc",
  green: "#15803d",
  paleGold: "#fff8df",
};

/*
|--------------------------------------------------------------------------
| MONEY
|--------------------------------------------------------------------------
*/

function money(value) {
  return `INR ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/*
|--------------------------------------------------------------------------
| DATE
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| DATE + TIME
|--------------------------------------------------------------------------
*/

function dateTimeText(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/*
|--------------------------------------------------------------------------
| LOGO
|--------------------------------------------------------------------------
*/

function logoPath() {
  const candidates = [
    path.resolve(__dirname, "../storage/public/logo.png"),
    path.resolve(process.cwd(), "storage/public/logo.png"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

/*
|--------------------------------------------------------------------------
| FONT PATHS
|--------------------------------------------------------------------------
|
| Recommended:
|
| storage/public/fonts/
|   Inter-Regular.ttf
|   Inter-SemiBold.ttf
|   Inter-Bold.ttf
|
| Helvetica fallback is used if Inter is not available.
|--------------------------------------------------------------------------
*/

function fontPath(name) {
  const candidates = [
    path.resolve(__dirname, `../storage/public/fonts/${name}.ttf`),
    path.resolve(process.cwd(), `storage/public/fonts/${name}.ttf`),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

/*
|--------------------------------------------------------------------------
| SETUP FONTS
|--------------------------------------------------------------------------
*/

function setupFonts(document) {
  const regular = fontPath("Inter-Regular");
  const semibold = fontPath("Inter-SemiBold");
  const bold = fontPath("Inter-Bold");

  if (regular) {
    document.registerFont("InterRegular", regular);
  }

  if (semibold) {
    document.registerFont("InterSemiBold", semibold);
  }

  if (bold) {
    document.registerFont("InterBold", bold);
  }

  return {
    regular: regular ? "InterRegular" : "Helvetica",
    semibold: semibold ? "InterSemiBold" : "Helvetica-Bold",
    bold: bold ? "InterBold" : "Helvetica-Bold",
  };
}

/*
|--------------------------------------------------------------------------
| LABEL
|--------------------------------------------------------------------------
*/

function drawLabel(document, text, x, y, width, fonts, options = {}) {
  document
    .fillColor(options.color || COLORS.muted)
    .font(fonts.semibold)
    .fontSize(options.size || 7.5)
    .text(String(text || "").toUpperCase(), x, y, {
      width,
      characterSpacing: options.characterSpacing !== undefined ? options.characterSpacing : 0.6,
      lineGap: 0,
    });
}

/*
|--------------------------------------------------------------------------
| VALUE
|--------------------------------------------------------------------------
*/

function drawValue(document, text, x, y, width, fonts, options = {}) {
  document
    .fillColor(options.color || COLORS.ink)
    .font(options.bold ? fonts.bold : fonts.regular)
    .fontSize(options.size || 9)
    .text(String(text === undefined || text === null || text === "" ? "-" : text), x, y, {
      width,
      lineGap: options.lineGap || 1,
      align: options.align || "left",
    });
}

/*
|--------------------------------------------------------------------------
| CARD
|--------------------------------------------------------------------------
*/

function drawCard(document, x, y, width, height, radius = 9, color = COLORS.pale) {
  document.fillColor(color).roundedRect(x, y, width, height, radius).fill();
}

/*
|--------------------------------------------------------------------------
| SECTION TITLE
|--------------------------------------------------------------------------
*/

function drawSectionTitle(document, text, x, y, fonts) {
  document.fillColor(COLORS.ink).font(fonts.bold).fontSize(12.5).text(text, x, y);
}

/*
|--------------------------------------------------------------------------
| CREATE INVOICE PDF
|--------------------------------------------------------------------------
*/

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

    document.on("data", (chunk) => {
      chunks.push(chunk);
    });

    document.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    document.on("error", reject);

    /*
    |--------------------------------------------------------------------------
    | PAGE
    |--------------------------------------------------------------------------
    */

    const pageWidth = 595.28;
    const pageHeight = 841.89;

    /*
    |--------------------------------------------------------------------------
    | MARGINS
    |--------------------------------------------------------------------------
    */

    const marginX = 42;
    const marginTop = 30;
    const marginBottom = 30;

    const contentWidth = pageWidth - marginX * 2;

    const right = pageWidth - marginX;

    /*
    |--------------------------------------------------------------------------
    | FONTS
    |--------------------------------------------------------------------------
    */

    const fonts = setupFonts(document);

    /*
    |--------------------------------------------------------------------------
    | DATA
    |--------------------------------------------------------------------------
    */

    const number = invoice?.invoice_number || `INV-${booking?.booking_reference || booking?.id}`;

    const subtotal = Number(invoice?.subtotal ?? booking?.estimated_total ?? 0);

    const discount = Number(invoice?.discount_amount || 0);

    const gst = Number(invoice?.gst_amount || 0);

    const total = Number(
      invoice?.total_amount ?? booking?.final_total ?? booking?.estimated_total ?? 0,
    );

    const paymentRows = Array.isArray(invoice?.payments) ? invoice.payments : [];

    /*
    |--------------------------------------------------------------------------
    | PAID AMOUNT
    |--------------------------------------------------------------------------
    */

    const recordedPaid = paymentRows
      .filter((payment) => String(payment?.status || "").toLowerCase() === "success")
      .reduce((sum, payment) => sum + Number(payment?.amount || 0), 0);

    const paid = paymentRows.length ? recordedPaid : Number(invoice?.amount_paid || 0);

    const balance = Math.max(0, total - paid);

    /*
    |--------------------------------------------------------------------------
    | PAYMENT STATUS
    |--------------------------------------------------------------------------
    */

    let paymentStatus;

    if (balance <= 0) {
      paymentStatus = "Paid";
    } else if (paid > 0) {
      paymentStatus = "Partially Paid";
    } else {
      paymentStatus = String(invoice?.status || booking?.payment_status || "Issued")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    /*
    |--------------------------------------------------------------------------
    | ================================================================
    | HEADER
    | ================================================================
    |--------------------------------------------------------------------------
    |
    | Reduced header height:
    |
    | Old: 132
    | New: 105
    |
    |--------------------------------------------------------------------------
    */

    const headerHeight = 105;

    document
      .fillColor(COLORS.navy)
      .rect(0, pageHeight - headerHeight, pageWidth, headerHeight)
      .fill();

    /*
    |--------------------------------------------------------------------------
    | LOGO
    |--------------------------------------------------------------------------
    */

    const logo = logoPath();

    if (logo) {
      document.image(logo, marginX, pageHeight - 78, {
        fit: [190, 55],
        valign: "center",
      });
    } else {
      document
        .fillColor("#ffffff")
        .font(fonts.bold)
        .fontSize(23)
        .text("YAAZH", marginX, pageHeight - 65);

      document.fillColor(COLORS.gold).text(" CABS", marginX + 80, pageHeight - 65);
    }

    /*
    |--------------------------------------------------------------------------
    | INVOICE TITLE
    |--------------------------------------------------------------------------
    */

    document
      .fillColor("#ffffff")
      .font(fonts.bold)
      .fontSize(23)
      .text("INVOICE", 350, pageHeight - 55, {
        width: 203,
        align: "right",
      });

    /*
    |--------------------------------------------------------------------------
    | INVOICE NUMBER
    |--------------------------------------------------------------------------
    */

    document
      .fillColor("#cbd5e1")
      .font(fonts.regular)
      .fontSize(8)
      .text(number, 350, pageHeight - 77, {
        width: 203,
        align: "right",
      });

    /*
    |--------------------------------------------------------------------------
    | GOLD ACCENT
    |--------------------------------------------------------------------------
    */

    document
      .fillColor(COLORS.gold)
      .roundedRect(right - 14, pageHeight - 90, 14, 3, 1.5)
      .fill();

    /*
    |--------------------------------------------------------------------------
    | ================================================================
    | INVOICE META CARD
    | ================================================================
    |--------------------------------------------------------------------------
    */

    const metaTop = pageHeight - headerHeight - 25;

    const metaHeight = 68;

    const metaY = metaTop - metaHeight;

    drawCard(document, marginX, metaY, contentWidth, metaHeight, 9);

    /*
    |--------------------------------------------------------------------------
    | META 1
    |--------------------------------------------------------------------------
    */

    const meta1X = marginX + 17;

    drawLabel(document, "Invoice date", meta1X, metaY + 47, 130, fonts);

    drawValue(document, dateText(invoice?.invoice_date), meta1X, metaY + 28, 130, fonts, {
      bold: true,
      size: 9.2,
    });

    /*
    |--------------------------------------------------------------------------
    | META 2
    |--------------------------------------------------------------------------
    */

    const meta2X = marginX + 180;

    drawLabel(document, "Booking reference", meta2X, metaY + 47, 150, fonts);

    drawValue(document, booking?.booking_reference, meta2X, metaY + 28, 150, fonts, {
      bold: true,
      size: 9.2,
    });

    /*
    |--------------------------------------------------------------------------
    | META 3
    |--------------------------------------------------------------------------
    */

    const meta3X = marginX + 360;

    drawLabel(document, "Payment status", meta3X, metaY + 47, 140, fonts);

    drawValue(document, paymentStatus, meta3X, metaY + 28, 140, fonts, {
      bold: true,
      size: 9.2,
      color: balance <= 0 ? COLORS.green : COLORS.goldDark,
    });

    /*
    |--------------------------------------------------------------------------
    | ================================================================
    | CUSTOMER / TRIP
    | ================================================================
    |--------------------------------------------------------------------------
    */

    const headingY = metaY - 35;

    drawSectionTitle(document, "Billed to", marginX, headingY, fonts);

    drawSectionTitle(document, "Trip details", 325, headingY, fonts);

    /*
    |--------------------------------------------------------------------------
    | CUSTOMER CARD
    |--------------------------------------------------------------------------
    */

    const cardY = headingY - 112;

    const cardHeight = 92;

    drawCard(document, marginX, cardY, 245, cardHeight);

    /*
    |--------------------------------------------------------------------------
    | CUSTOMER GOLD LINE
    |--------------------------------------------------------------------------
    */

    document.fillColor(COLORS.gold).rect(marginX, cardY, 4, cardHeight).fill();

    drawLabel(document, "Customer", marginX + 17, cardY + 72, 210, fonts);

    drawValue(
      document,
      String(booking?.customer_name || "").toUpperCase(),
      marginX + 17,
      cardY + 54,
      210,
      fonts,
      {
        bold: true,
        size: 10,
      },
    );

    drawValue(document, booking?.customer_phone, marginX + 17, cardY + 35, 210, fonts, {
      size: 8.5,
    });

    drawValue(
      document,
      String(booking?.customer_email || "").toLowerCase(),
      marginX + 17,
      cardY + 17,
      210,
      fonts,
      {
        size: 8,
      },
    );

    /*
    |--------------------------------------------------------------------------
    | TRIP CARD
    |--------------------------------------------------------------------------
    */

    drawCard(document, 314, cardY, 239, cardHeight);

    /*
    |--------------------------------------------------------------------------
    | TRIP GOLD LINE
    |--------------------------------------------------------------------------
    */

    document.fillColor(COLORS.gold).rect(314, cardY, 4, cardHeight).fill();

    drawLabel(document, "Pickup", 331, cardY + 72, 205, fonts);

    drawValue(document, booking?.pickup_location, 331, cardY + 54, 205, fonts, {
      bold: true,
      size: 9,
    });

    drawLabel(document, "Drop", 331, cardY + 38, 205, fonts);

    drawValue(document, booking?.drop_location, 331, cardY + 21, 205, fonts, {
      bold: true,
      size: 9,
    });

    /*
    |--------------------------------------------------------------------------
    | PICKUP TIME
    |--------------------------------------------------------------------------
    */

    /*
     * If you want date only, replace dateTimeText()
     * with dateText().
     */

    /*
    |--------------------------------------------------------------------------
    | ================================================================
    | CHARGES TABLE
    | ================================================================
    |--------------------------------------------------------------------------
    */

    const tableTop = cardY - 28;

    const tableHeight = 35;

    document
      .fillColor(COLORS.navy)
      .roundedRect(marginX, tableTop - tableHeight, contentWidth, tableHeight, 7)
      .fill();

    document
      .fillColor("#cbd5e1")
      .font(fonts.semibold)
      .fontSize(7.5)
      .text("DESCRIPTION", marginX + 15, tableTop - 22);

    document.text("AMOUNT", right - 90, tableTop - 22, {
      width: 75,
      align: "right",
    });

    /*
    |--------------------------------------------------------------------------
    | CHARGE ROW
    |--------------------------------------------------------------------------
    */

    let rowY = tableTop - tableHeight - 25;

    const drawChargeRow = (description, amount, color = COLORS.ink) => {
      document
        .fillColor(color)
        .font(fonts.regular)
        .fontSize(9)
        .text(description, marginX + 15, rowY, {
          width: 300,
        });

      document
        .fillColor(color)
        .font(fonts.semibold)
        .fontSize(9)
        .text(money(amount), right - 115, rowY, {
          width: 100,
          align: "right",
        });

      /*
      | Bottom border
      */

      document
        .strokeColor(COLORS.line)
        .lineWidth(0.7)
        .moveTo(marginX + 15, rowY + 20)
        .lineTo(right - 15, rowY + 20)
        .stroke();

      rowY += 34;
    };

    drawChargeRow("Trip fare", subtotal);

    if (discount) {
      drawChargeRow("Discount", -discount, COLORS.green);
    }

    if (gst) {
      drawChargeRow(
        `Tax / GST${invoice?.gst_percentage ? ` (${invoice.gst_percentage}%)` : ""}`,
        gst,
      );
    }

    /*
    |--------------------------------------------------------------------------
    | ================================================================
    | PAYMENT + AMOUNT DUE SECTION
    | ================================================================
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | Payment History and Amount Due have separate columns.
    |
    | Payment borders NEVER enter the Amount Due card.
    |
    |--------------------------------------------------------------------------
    */

    const financeTop = rowY + 4;

    /*
    |--------------------------------------------------------------------------
    | LEFT COLUMN
    |--------------------------------------------------------------------------
    */

    const paymentX = marginX;

    const paymentWidth = 325;

    /*
    |--------------------------------------------------------------------------
    | RIGHT COLUMN
    |--------------------------------------------------------------------------
    */

    const summaryX = paymentX + paymentWidth + 18;

    const summaryWidth = right - summaryX;

    /*
    |--------------------------------------------------------------------------
    | PAYMENT HISTORY TITLE
    |--------------------------------------------------------------------------
    */

    document
      .fillColor(COLORS.ink)
      .font(fonts.bold)
      .fontSize(11)
      .text("Payment history", paymentX, financeTop);

    /*
    |--------------------------------------------------------------------------
    | PAYMENT TABLE HEADER
    |--------------------------------------------------------------------------
    */

    const paymentHeaderY = financeTop + 22;

    drawLabel(document, "Date / Method", paymentX, paymentHeaderY, 220, fonts, {
      size: 7.2,
    });

    drawLabel(document, "Amount", paymentX + 235, paymentHeaderY, 90, fonts, {
      size: 7.2,
    });

    /*
    |--------------------------------------------------------------------------
    | PAYMENT ROWS
    |--------------------------------------------------------------------------
    */

    let paymentY = paymentHeaderY + 22;

    if (paymentRows.length) {
      paymentRows.forEach((payment) => {
        const method = String(payment?.method || "payment")
          .replace(/_/g, " ")
          .toUpperCase();

        const paymentDate = dateText(payment?.paid_at || payment?.created_at);

        /*
          |--------------------------------------------------------------------------
          | DATE + METHOD
          |--------------------------------------------------------------------------
          */

        document
          .fillColor(COLORS.ink)
          .font(fonts.regular)
          .fontSize(8.3)
          .text(`${paymentDate}  ·  ${method}`, paymentX, paymentY, {
            width: 220,
          });

        /*
          |--------------------------------------------------------------------------
          | PAYMENT AMOUNT
          |--------------------------------------------------------------------------
          */

        document
          .fillColor(COLORS.ink)
          .font(fonts.semibold)
          .fontSize(8.3)
          .text(money(payment?.amount), paymentX + 235, paymentY, {
            width: 90,
            align: "right",
          });

        /*
          |--------------------------------------------------------------------------
          | PAYMENT BOTTOM BORDER
          |--------------------------------------------------------------------------
          |
          | IMPORTANT:
          | Border width is ONLY paymentWidth.
          |
          */

        document
          .strokeColor(COLORS.line)
          .lineWidth(0.8)
          .moveTo(paymentX, paymentY + 16)
          .lineTo(paymentX + paymentWidth, paymentY + 16)
          .stroke();

        paymentY += 29;
      });
    } else {
      document
        .fillColor(COLORS.muted)
        .font(fonts.regular)
        .fontSize(8.5)
        .text("No payment records available.", paymentX, paymentY);

      paymentY += 29;
    }

    /*
    |--------------------------------------------------------------------------
    | ================================================================
    | AMOUNT DUE CARD
    | ================================================================
    */

    const summaryHeight = 137;

    const summaryTop = financeTop + 13;

    const summaryY = summaryTop - summaryHeight;

    drawCard(document, summaryX, summaryY, summaryWidth, summaryHeight, 10, COLORS.paleGold);

    /*
    |--------------------------------------------------------------------------
    | AMOUNT DUE LABEL
    |--------------------------------------------------------------------------
    */

    drawLabel(document, "Amount due", summaryX + 18, summaryTop - 24, summaryWidth - 36, fonts, {
      size: 7.2,
    });

    /*
    |--------------------------------------------------------------------------
    | TOTAL
    |--------------------------------------------------------------------------
    */

    document
      .fillColor(COLORS.navy)
      .font(fonts.bold)
      .fontSize(17)
      .text(money(total), summaryX + 18, summaryTop - 52, {
        width: summaryWidth - 36,
        align: "right",
      });

    /*
    |--------------------------------------------------------------------------
    | SUMMARY SEPARATOR
    |--------------------------------------------------------------------------
    */

    document
      .strokeColor("#eadfba")
      .lineWidth(0.7)
      .moveTo(summaryX + 18, summaryTop - 68)
      .lineTo(summaryX + summaryWidth - 18, summaryTop - 68)
      .stroke();

    /*
    |--------------------------------------------------------------------------
    | BALANCE LABEL
    |--------------------------------------------------------------------------
    */

    drawLabel(
      document,
      "Balance remaining",
      summaryX + 18,
      summaryTop - 88,
      summaryWidth - 36,
      fonts,
      {
        size: 7.2,
      },
    );

    /*
    |--------------------------------------------------------------------------
    | BALANCE VALUE
    |--------------------------------------------------------------------------
    */

    document
      .fillColor(balance > 0 ? COLORS.goldDark : COLORS.green)
      .font(fonts.bold)
      .fontSize(11)
      .text(money(balance), summaryX + 18, summaryTop - 109, {
        width: summaryWidth - 36,
        align: "left",
      });

    /*
    |--------------------------------------------------------------------------
    | ================================================================
    | NOTES
    | ================================================================
    |--------------------------------------------------------------------------
    */

    /*
     * Make sure notes are below both columns.
     */

    const financeBottom = Math.max(paymentY, summaryY);

    const notesY = financeBottom + 22;

    const notesHeight = 48;

    drawCard(document, marginX, notesY, contentWidth, notesHeight, 8, COLORS.pale);

    drawLabel(document, "Notes", marginX + 14, notesY + 32, 70, fonts, {
      size: 7,
    });

    document
      .fillColor(COLORS.muted)
      .font(fonts.regular)
      .fontSize(7.8)
      .text(
        "Toll, parking and permit charges may be billed separately where applicable.",
        marginX + 14,
        notesY + 16,
        {
          width: contentWidth - 28,
          lineGap: 1,
        },
      );

    /*
    |--------------------------------------------------------------------------
    | ================================================================
    | FOOTER
    | ================================================================
    |--------------------------------------------------------------------------
    */

    /*
     * Keep footer at a fixed safe position.
     */

    const footerLineY = 55;

    document
      .strokeColor(COLORS.line)
      .lineWidth(1)
      .moveTo(marginX, footerLineY)
      .lineTo(right, footerLineY)
      .stroke();

    /*
    |--------------------------------------------------------------------------
    | FOOTER TEXT LEFT
    |--------------------------------------------------------------------------
    */

    document
      .fillColor(COLORS.ink)
      .font(fonts.semibold)
      .fontSize(8.5)
      .text("Thank you for riding with Yaazh Cabs.", marginX, footerLineY - 20);

    /*
    |--------------------------------------------------------------------------
    | WEBSITE
    |--------------------------------------------------------------------------
    */

    document
      .fillColor(COLORS.muted)
      .font(fonts.regular)
      .fontSize(7.5)
      .text("yaazhcabsudumalpet.in", 350, footerLineY - 20, {
        width: 203,
        align: "right",
      });

    /*
    |--------------------------------------------------------------------------
    | GOLD FOOTER ACCENT
    |--------------------------------------------------------------------------
    */

    document
      .fillColor(COLORS.gold)
      .roundedRect(marginX, footerLineY - 40, 26, 3, 1.5)
      .fill();

    /*
    |--------------------------------------------------------------------------
    | END PDF
    |--------------------------------------------------------------------------
    */

    document.end();
  });
}

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {
  createInvoicePdf,
};

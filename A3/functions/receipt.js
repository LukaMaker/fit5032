const PDFDocument = require("pdfkit");

// Checks a donation again on the server. Returns a problem description, or null if it is valid.
const validateDonation = (donation) => {
  if (typeof donation.userId !== "string" || donation.userId.length === 0) {
    return "missing userId";
  }
  if (typeof donation.email !== "string" || !donation.email.includes("@")) {
    return "missing email";
  }
  if (!Number.isInteger(donation.amount) || donation.amount < 2 || donation.amount > 10000) {
    return "amount must be a whole number from 2 to 10000";
  }
  if (typeof donation.showOnLeaderboard !== "boolean") {
    return "showOnLeaderboard must be true or false";
  }
  if (typeof donation.suburb !== "string" || donation.suburb.length > 50) {
    return "suburb must be text of 50 characters or less";
  }
  return null;
};

// Short, readable receipt number made from the donation's document id
const getReceiptNumber = (donationId) => `TW-${donationId.slice(0, 8).toUpperCase()}`;

const formatCurrency = (amount) =>
  amount.toLocaleString("en-AU", {style: "currency", currency: "AUD"});

// Builds the PDF receipt in memory and resolves with it as a Buffer, ready to attach to the email
const buildReceiptPdf = ({receiptNumber, name, email, amount, date}) => {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({size: "A4", margin: 50});
    const chunks = [];
    pdf.on("data", (chunk) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    // Green header band
    pdf.rect(0, 0, pdf.page.width, 100).fill("#2e7d32");
    pdf.fillColor("#ffffff").fontSize(28).text("Tree World", 50, 32);
    pdf.fontSize(12).text("Donation receipt", 50, 66);

    // Receipt details as label / value rows
    const rows = [
      ["Receipt number", receiptNumber],
      ["Date", date.toLocaleString("en-AU", {
        timeZone: "Australia/Melbourne", dateStyle: "long", timeStyle: "short",
      })],
      ["Donor", name],
      ["Email", email],
      ["Amount", formatCurrency(amount)],
    ];
    let y = 140;
    rows.forEach(([label, value]) => {
      pdf.fillColor("#555555").fontSize(11).text(label, 50, y);
      pdf.fillColor("#000000").fontSize(12).text(value, 200, y);
      y += 28;
    });

    pdf.moveTo(50, y + 6).lineTo(pdf.page.width - 50, y + 6).strokeColor("#cccccc").stroke();

    pdf.fillColor("#000000").fontSize(12).text(
        `Thank you, ${name}! Your gift of ${formatCurrency(amount)} helps us plant trees ` +
        "and grow greener, cooler streets in communities across Melbourne.",
        50, y + 24, {width: pdf.page.width - 100},
    );

    pdf.fillColor("#777777").fontSize(9).text(
        "Tree World is a fictional charity created for FIT5032. " +
        "No payment was taken and this receipt has no tax value.",
        50, pdf.page.height - 90, {width: pdf.page.width - 100, align: "center"},
    );

    pdf.end();
  });
};

// Escapes text before it goes into the email's HTML, so a name can't inject HTML into the email
const escapeHtml = (text) => String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

module.exports = {validateDonation, getReceiptNumber, formatCurrency, buildReceiptPdf, escapeHtml};

const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {defineSecret, defineString} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const sgMail = require("@sendgrid/mail");
const {
  validateDonation, getReceiptNumber, formatCurrency, buildReceiptPdf, escapeHtml,
} = require("./receipt");

initializeApp();
const db = getFirestore();

// The SendGrid key is a secret stored by Firebase (firebase functions:secrets:set SENDGRID_API_KEY),
// so it never appears in the code. SENDGRID_FROM is read from functions/.env.
const sendgridApiKey = defineSecret("SENDGRID_API_KEY");
const sendgridFrom = defineString("SENDGRID_FROM");

// Runs automatically whenever a new document is added to "donations".
// It emails the donor a PDF receipt and, if they opted in, adds the donation to the leaderboard.
// The trigger must be in the same region as the Firestore database.
exports.onDonationCreated = onDocumentCreated(
    {
      document: "donations/{donationId}",
      region: "australia-southeast2",
      secrets: [sendgridApiKey],
    },
    async (event) => {
      const snapshot = event.data;
      if (!snapshot) {
        return;
      }
      const donationRef = snapshot.ref;
      const donationId = event.params.donationId;

      // 1. Claim the donation (pending -> processing) in a transaction.
      // Triggers can occasionally run twice, so this stops a second run sending another email
      // or counting the donation twice.
      const donation = await db.runTransaction(async (transaction) => {
        const current = await transaction.get(donationRef);
        if (!current.exists || current.data().status !== "pending") {
          return null;
        }
        transaction.update(donationRef, {status: "processing"});
        return current.data();
      });
      if (!donation) {
        logger.info(`Donation ${donationId} was already processed, skipping`);
        return;
      }

      try {
        // 2. Check the donation again on the server
        const problem = validateDonation(donation);
        if (problem) {
          throw new Error(`Invalid donation: ${problem}`);
        }

        // The donor's name comes from their profile, not from the browser,
        // so nobody can put a made-up name on a receipt or the public leaderboard
        const profileSnap = await db.collection("users").doc(donation.userId).get();
        const profile = profileSnap.exists ? profileSnap.data() : {};
        const firstName = profile.firstName || "Supporter";
        const lastName = profile.lastName || "";
        const fullName = `${firstName} ${lastName}`.trim();

        const donatedAt = donation.createdAt ? donation.createdAt.toDate() : new Date();
        const receiptNumber = getReceiptNumber(donationId);

        // 3. Add to the leaderboard if the donor opted in. FieldValue.increment adds to the
        // existing totals safely, even if two donations are processed at the same time.
        if (donation.showOnLeaderboard) {
          await db.collection("donors").doc(donation.userId).set({
            name: lastName ? `${firstName} ${lastName[0]}.` : firstName,
            suburb: donation.suburb,
            totalDonated: FieldValue.increment(donation.amount),
            donationCount: FieldValue.increment(1),
            lastDonation: donatedAt.toLocaleDateString("en-CA", {timeZone: "Australia/Melbourne"}),
          }, {merge: true});
        }

        // 4. Build the PDF receipt
        const pdfBuffer = await buildReceiptPdf({
          receiptNumber,
          name: fullName,
          email: donation.email,
          amount: donation.amount,
          date: donatedAt,
        });

        // 5. Email it with SendGrid, attaching the PDF
        const amountText = formatCurrency(donation.amount);
        sgMail.setApiKey(sendgridApiKey.value());
        await sgMail.send({
          to: donation.email,
          from: {email: sendgridFrom.value(), name: "Tree World"},
          subject: "Your Tree World donation receipt",
          text: `Hi ${firstName},\n\nThank you for your donation of ${amountText} to Tree World. ` +
            `Your receipt (${receiptNumber}) is attached.\n\nThe Tree World team`,
          html: `<p>Hi ${escapeHtml(firstName)},</p>` +
            `<p>Thank you for your donation of <strong>${amountText}</strong> to Tree World. ` +
            `Your receipt (${receiptNumber}) is attached.</p>` +
            "<p>The Tree World team</p>",
          attachments: [{
            content: pdfBuffer.toString("base64"),
            filename: `receipt-${receiptNumber}.pdf`,
            type: "application/pdf",
            disposition: "attachment",
          }],
        });

        // 6. Mark the donation as done so the Donate page can show the success message
        await donationRef.update({
          status: "sent",
          receiptNumber,
          sentAt: FieldValue.serverTimestamp(),
        });
        logger.info(`Receipt ${receiptNumber} sent for donation ${donationId}`);
      } catch (error) {
        // Full details go to the function logs; the user only sees a short message
        logger.error(`Donation ${donationId} failed`, error);
        await donationRef.update({
          status: "failed",
          errorMessage: "We couldn't send your receipt. Please try again later or contact us.",
        });
      }
    },
);

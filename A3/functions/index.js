const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret, defineString} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const sgMail = require("@sendgrid/mail");
const {GoogleGenAI} = require("@google/genai");
const {
  validateDonation, getReceiptNumber, formatCurrency, buildReceiptPdf, escapeHtml,
} = require("./receipt");
const {buildSystemInstruction, buildInput, validateRequest} = require("./assistant");

initializeApp();
const db = getFirestore();

const sendgridApiKey = defineSecret("SENDGRID_API_KEY");
const sendgridFrom = defineString("SENDGRID_FROM");

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const geminiModel = defineString("GEMINI_MODEL", {default: "gemini-3.5-flash-lite"});
const dailyQuestionLimit = 20;

// Runs automatically whenever a new document is added to "donations".
// It emails the donor a PDF receipt and, if they opted in, adds the donation to the leaderboard.
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

// Called from the chat panel with httpsCallable. Callable functions check the Firebase login
// automatically, so request.auth is only set for logged-in users.
exports.askAssistant = onCall(
    {region: "australia-southeast2", secrets: [geminiApiKey], timeoutSeconds: 60},
    async (request) => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Please log in to ask a question.");
      }
      const problem = validateRequest(request.data);
      if (problem) {
        throw new HttpsError("invalid-argument", problem);
      }
      const question = request.data.question.trim();
      const history = request.data.history || [];

      // Each user can ask 20 questions a day, counted in a transaction so the count is always right.
      // This protects the free Gemini quota from being used up by one person.
      const today = new Date().toLocaleDateString("en-CA", {timeZone: "Australia/Melbourne"});
      const usageRef = db.collection("assistantUsage").doc(request.auth.uid);
      const remaining = await db.runTransaction(async (transaction) => {
        const usage = await transaction.get(usageRef);
        const count = usage.exists && usage.data().date === today ? usage.data().count : 0;
        if (count >= dailyQuestionLimit) {
          return -1;
        }
        transaction.set(usageRef, {date: today, count: count + 1});
        return dailyQuestionLimit - count - 1;
      });
      if (remaining < 0) {
        throw new HttpsError("resource-exhausted",
            `You've asked ${dailyQuestionLimit} questions today. Please come back tomorrow.`);
      }

      try {
        // Give Gemini the current events and resources so its answers are accurate
        const [eventsSnapshot, resourcesSnapshot] = await Promise.all([
          db.collection("events").get(),
          db.collection("resources").get(),
        ]);
        const events = eventsSnapshot.docs.map((eventDoc) => eventDoc.data());
        const resources = resourcesSnapshot.docs.map((resourceDoc) => resourceDoc.data());

        const model = geminiModel.value() || "gemini-3.5-flash-lite";
        const startedAt = Date.now();
        const ai = new GoogleGenAI({apiKey: geminiApiKey.value()});
        const response = await ai.models.generateContent({
          model,
          contents: buildInput(history, question),
          config: {
            systemInstruction: buildSystemInstruction(events, resources, today),
            maxOutputTokens: 1024,
            // Give up after 25 seconds
            httpOptions: {timeout: 25000},
          },
        });
        logger.info(`Gemini (${model}) answered in ${Date.now() - startedAt} ms`);
        const answer = (response.text || "").trim();
        if (!answer) {
          throw new Error("Gemini returned an empty answer");
        }
        return {answer, remaining};
      } catch (error) {
        // Give the question back so a failed request doesn't count toward the daily limit
        logger.error("Assistant request failed", error);
        await usageRef.update({count: FieldValue.increment(-1)}).catch(() => {});
        throw new HttpsError("unavailable",
            "The assistant is unavailable right now. Please try again in a moment.");
      }
    },
);

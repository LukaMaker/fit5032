const {onRequest} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});

admin.initializeApp();

exports.countBooks = onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const booksCollection = admin.firestore().collection("books");
      const snapshot = await booksCollection.get();
      const count = snapshot.size;
      res.status(200).json({count});
    } catch (error) {
      console.error("Error counting books:", error.message);
      res.status(500).send("Error counting books");
    }
  });
});

// Runs automatically whenever a new document is added to "books".
// Every text field is converted to UPPERCASE and saved back to Firestore.
// The trigger must be in the same region as the Firestore database.
exports.capitalizeBook = onDocumentCreated(
    {document: "books/{bookId}", region: "australia-southeast2"},
    async (event) => {
      const snapshot = event.data;
      if (!snapshot) {
        return;
      }
      const data = snapshot.data();
      const updates = {};
      for (const [field, value] of Object.entries(data)) {
        if (typeof value === "string" && value !== value.toUpperCase()) {
          updates[field] = value.toUpperCase();
        }
      }
      if (Object.keys(updates).length === 0) {
        return;
      }
      console.log(`Capitalising book ${event.params.bookId}:`, updates);
      await snapshot.ref.update(updates);
    },
);

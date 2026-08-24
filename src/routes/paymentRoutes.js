const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/auth");

const {
  createCheckoutSession,
} = require("../controllers/paymentController");

// Catatan: route webhook Stripe TIDAK didaftarkan di sini.
// Webhook butuh express.raw() dan harus dipasang SEBELUM
// express.json() global, sehingga didaftarkan langsung di
// index.js: app.post("/api/payment/webhook", express.raw(...), handleStripeWebhook)
// Jangan duplikasi route webhook di sini agar tidak ada dua
// definisi yang membingungkan untuk path yang sama.

router.post(
  "/create-checkout-session",
  protect,
  createCheckoutSession
);

module.exports = router;


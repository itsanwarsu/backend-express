require("dotenv").config();

const express = require("express");
const cors = require("cors");

const hubungkanDB = require("./config/db");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/product");
const cartRoutes = require("./routes/cart");

const app = express();
const PORT = process.env.PORT || 3000;

// =======================
// Database
// =======================
hubungkanDB();

// =======================
// Middleware
// =======================
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "ngrok-skip-browser-warning",
    ],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parsing request body berupa form-urlencoded/form-data

// Bypass warning ngrok
app.use((req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// =======================
// Routes
// =======================
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);

// =======================
// Health Check
// =======================
app.get("/", (req, res) => {
  res.json({
    message: "Backend Ecommerce API berjalan",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
  });
});

// =======================
// 404 Handler
// =======================
app.use((req, res) => {
  res.status(404).json({
    message: "Endpoint tidak ditemukan",
  });
});

// =======================
// Global Error Handler (Pesan Error Lebih Detail)
// =======================
app.use((err, req, res, next) => {
  console.error("Global Error Handler Caught:", err);

  res.status(err.status || 500).json({
    message: err.message || "Terjadi kesalahan pada server",
    error: err,
  });
});

// =======================
// Start Server
// =======================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server berjalan di port ${PORT}`);
});


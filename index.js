//Kredensial
require("dotenv").config();

//expressjs
const express = require("express");
const cors = require("cors");
const hubungkanDB = require("./config/db");

//routes
const authRoutes = require("./src/routes/auth");
const productRoutes = require("./src/routes/product");
const cartRoutes = require("./src/routes/cart");
const orderRoutes = require("./src/routes/order");
const wishlistRoutes = require("./src/routes/wishlistRoutes");
const conversationRoutes = require("./src/routes/conversationRoutes");
const messageRoutes = require("./src/routes/messageRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");
const {handleStripeWebhook,} = require("./src/controllers/paymentController");
const galleryRoutes = require("./src/routes/gallery");

const http = require("http");
const { Server } = require("socket.io");
const { initializeSocket } = require("./socket/socket");

//Google Oauth
const passport = require("passport");
require("./config/passport");

//inisialisasi
const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;


// =======================
// Database
// =======================

(async () => {
  try {await hubungkanDB();
    console.log('✅ Database connected, starting server...');

// =======================
// Start Server (pindahkan ke sini)
// =======================

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server berjalan di port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
})();

// =======================
// Middleware
// =======================

app.use(cors({
    origin: "*",
    methods: ["GET","POST","PUT","DELETE","PATCH","OPTIONS",],
    allowedHeaders: ["Content-Type","Authorization","ngrok-skip-browser-warning",],
  }));

app.post("/api/payment/webhook",express.raw({ type: "application/json" }),handleStripeWebhook);

app.use(express.json());
app.use(express.urlencoded({extended: true,}));

// =======================
// Google OAuth Passport
// =======================

app.use(passport.initialize());

// =======================
// Bypass warning ngrok
// =======================

app.use((req, res, next) => {
res.setHeader("ngrok-skip-browser-warning","true");
if (req.method === "OPTIONS") {return res.sendStatus(200);}
next();
});

// =======================
// Routes
// =======================

app.use("/api/auth",authRoutes);
app.use("/api/products",productRoutes);
app.use("/api/cart",cartRoutes);
app.use("/api/orders",orderRoutes);
app.use("/api/wishlist",wishlistRoutes);
app.use("/api/conversations",conversationRoutes);
app.use("/api/messages",messageRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/gallery", galleryRoutes); // path URL harus "gallery" (benar) walau nama file "galery"

// =======================
// Health Check
// =======================

app.get("/", (req, res) => {
res.json({ message:"Backend Ecommerce API berjalan", });
});

app.get("/health", (req, res) => {
res.json({status: "OK",});
});

// =======================
// 404 Handler
// =======================

app.use((req, res) => {
res.status(404).json({message:"Endpoint tidak ditemukan",});
});

// =======================
// Global Error Handler
// =======================

app.use((err, req, res, next) => {
console.error("Global Error Handler:",err);

const isProduction = process.env.NODE_ENV === "production";

res.status(err.status || 500).json({
  message: err.message || "Terjadi kesalahan pada server",
  // Detail error (stack trace, dsb) hanya dikirim ke client
  // saat BUKAN production, agar tidak bocor ke publik.
  ...(isProduction ? {} : { error: err.stack || err }),
});
});

// =======================
// Socket.io
// =======================

const io = new Server(server, {
cors: {
origin: "*",
methods: ["GET","POST","PUT","DELETE",],},
});

initializeSocket(io);

// Tangkap error tak terduga agar aplikasi tidak langsung crash tanpa log
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

process.on('SIGTERM', () => {
  console.log('Menerima sinyal SIGTERM, menutup server...');
  server.close(() => {
    console.log('Server berhasil ditutup secara aman.');
    process.exit(0);
  });
});


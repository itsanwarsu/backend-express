require("dotenv").config();

const express = require("express");
const cors = require("cors");
const hubungkanDB = require("./config/db");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/product");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/order");
const wishlistRoutes = require("./routes/wishlistRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");

const http = require("http");
const { Server } = require("socket.io");
const { initializeSocket } = require("./socket/socket");

const passport = require("passport");
require("./config/passport");


const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;


// =======================
// Database
// =======================
// HUBUNGANI DB DENGAN AWAIT
(async () => {
  try {
    await hubungkanDB();
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

app.use(
  cors({
    origin: "*",
    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "ngrok-skip-browser-warning",
    ],
  })
);


app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);


// =======================
// Google OAuth Passport
// =======================

app.use(passport.initialize());


// =======================
// Bypass warning ngrok
// =======================

app.use((req, res, next) => {

  res.setHeader(
    "ngrok-skip-browser-warning",
    "true"
  );


  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }


  next();

});



// =======================
// Routes
// =======================

app.use(
  "/api/auth",
  authRoutes
);


app.use(
  "/api/products",
  productRoutes
);


app.use(
  "/api/cart",
  cartRoutes
);


app.use(
  "/api/orders",
  orderRoutes
);


app.use(
  "/api/wishlist",
  wishlistRoutes
);


app.use(
  "/api/conversations",
  conversationRoutes
);


app.use(
  "/api/messages",
  messageRoutes
);



// =======================
// Health Check
// =======================

app.get("/", (req, res) => {

  res.json({
    message:
      "Backend Ecommerce API berjalan",
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
    message:
      "Endpoint tidak ditemukan",
  });

});



// =======================
// Global Error Handler
// =======================

app.use((err, req, res, next) => {

  console.error(
    "Global Error Handler:",
    err
  );


  res.status(err.status || 500).json({

    message:
      err.message ||
      "Terjadi kesalahan pada server",

    error: err,

  });

});



// =======================
// Socket.io
// =======================

const io = new Server(server, {

  cors: {

    origin: "*",

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
    ],

  },

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


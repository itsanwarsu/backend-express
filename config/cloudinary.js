const cloudinary = require("cloudinary").v2;

// Konfigurasi Cloudinary menggunakan environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:428451622149387,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Pengecekan singkat saat server start
console.log("Cloudinary Config Status:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "TIDAK ADA",
  api_key: process.env.CLOUDINARY_API_KEY || "TIDAK ADA",
  api_secret: process.env.CLOUDINARY_API_SECRET ? "ADA" : "TIDAK ADA",
});

module.exports = cloudinary;


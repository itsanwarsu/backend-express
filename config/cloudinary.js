const cloudinary = require("cloudinary").v2;

console.log({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET ? "ADA" : "TIDAK ADA",
});

module.exports = cloudinary;

const multer = require("multer");

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) {
      return cb(new Error("Hanya JPG, PNG, atau WEBP yang diperbolehkan"));
    }
    cb(null, true);
  },
});

module.exports = upload;

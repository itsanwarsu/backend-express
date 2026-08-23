const express = require("express");
const multer = require("multer");
const { protect } = require("../middleware/auth");
const isSuperuser = require("../middleware/isSuperuser");
const {
  getGallery,
  addGalleryImage,
  deleteGalleryImage,
} = require("../controllers/galleryController");

const router = express.Router();

// Pakai memoryStorage — sama seperti productController, bukan diskStorage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("File harus berupa gambar"));
    }
    cb(null, true);
  },
});

router.get("/", getGallery);
router.post("/", protect, isSuperuser, upload.single("image"), addGalleryImage);
router.delete("/:id", protect, isSuperuser, deleteGalleryImage);

module.exports = router;

const express = require("express");
const multer = require("multer");
const path = require("path");
const prisma = require("../../config/prisma");
const { protect } = require("../middleware/auth");
const isSuperuser = require("../middleware/isSuperuser");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/gallery"),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${file.originalname}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("File harus berupa gambar"));
    }
    cb(null, true);
  },
});

// GET semua foto galeri (publik)
router.get("/", async (req, res) => {
  try {
    const images = await prisma.gallery.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    res.json(images);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil galeri" });
  }
});

// POST tambah foto (superuser only)
router.post(
  "/",
  protect,
  isSuperuser,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "File gambar wajib diisi" });
      }

      const url = `/uploads/gallery/${req.file.filename}`;
      const newImage = await prisma.gallery.create({
        data: {
          url,
          caption: req.body.caption || "",
        },
      });

      res.status(201).json(newImage);
    } catch (err) {
      res.status(500).json({ message: "Gagal upload foto" });
    }
  }
);

// DELETE hapus foto (superuser only)
router.delete("/:id", protect, isSuperuser, async (req, res) => {
  try {
    await prisma.gallery.delete({
      where: { id: req.params.id },
    });
    res.json({ message: "Foto dihapus" });
  } catch (err) {
    res.status(404).json({ message: "Foto tidak ditemukan" });
  }
});

module.exports = router;

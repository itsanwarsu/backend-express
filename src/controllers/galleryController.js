const prisma = require("../../config/prisma");
const cloudinary = require("../../config/cloudinary");
const streamifier = require("streamifier");

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "gallery" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

// GET semua foto galeri
exports.getGallery = async (req, res) => {
  try {
    const images = await prisma.gallery.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return res.json(images);
  } catch (err) {
    console.error("Get Gallery Error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// POST tambah foto (superadmin only)
exports.addGalleryImage = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "File gambar wajib diisi" });
    }

    const result = await uploadToCloudinary(req.file.buffer);

    const newImage = await prisma.gallery.create({
      data: {
        url: result.secure_url,
        caption: req.body.caption || "",
      },
    });

    return res.status(201).json(newImage);
  } catch (err) {
    console.error("Add Gallery Error:", err);
    return res.status(500).json({
      message: "Gagal upload foto",
      error: err.message || err,
    });
  }
};

// DELETE foto (superadmin only)
exports.deleteGalleryImage = async (req, res) => {
  try {
    const { id } = req.params;

    const image = await prisma.gallery.findUnique({ where: { id } });
    if (!image) {
      return res.status(404).json({ message: "Foto tidak ditemukan" });
    }

    await prisma.gallery.delete({ where: { id } });

    return res.json({ message: "Foto berhasil dihapus" });
  } catch (err) {
    console.error("Delete Gallery Error:", err);
    return res.status(500).json({ message: err.message });
  }
};

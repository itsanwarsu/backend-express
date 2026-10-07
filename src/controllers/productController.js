const prisma = require("../../config/prisma");
const cloudinary = require("../../config/cloudinary");
const streamifier = require("streamifier");

// =======================
// HELPER
// =======================
const uploadToCloudinary = (fileBuffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "products" },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });

// Upload banyak file sekaligus -> [{ url, publicId }]
const uploadMany = async (files = []) => {
  const results = await Promise.all(
    files.map((f) => uploadToCloudinary(f.buffer))
  );
  return results.map((r) => ({ url: r.secure_url, publicId: r.public_id }));
};

const destroyMany = (items = []) =>
  Promise.allSettled(
    items
      .filter((i) => i && i.publicId)
      .map((i) => cloudinary.uploader.destroy(i.publicId))
  );

// Foto produk lama (sebelum kolom images ada) dikonversi ke format baru
const currentImages = (product) => {
  if (Array.isArray(product.images)) return product.images;
  if (product.imageUrl) {
    return [{ url: product.imageUrl, publicId: product.imagePublicId || "" }];
  }
  return [];
};

const sellerInclude = {
  seller: { select: { id: true, name: true, email: true } },
};

// =======================
// CREATE PRODUCT
// =======================
exports.createProduct = async (req, res) => {
  let uploaded = [];

  try {
    const { name, description, price, stock, category } = req.body;

    if (!name || price === undefined || price === "" || !category) {
      return res.status(400).json({
        message: "Nama, harga, dan kategori wajib diisi",
      });
    }

    const sellerId = Number(req.user.id);

    if (!sellerId) {
      return res.status(401).json({ message: "User tidak valid" });
    }

    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ message: "Minimal satu gambar wajib diunggah" });
    }

    uploaded = await uploadMany(req.files);

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        description: description || "",
        price: Number(price),
        stock: Number(stock) || 0,
        category,
        imageUrl: uploaded[0].url, // foto utama
        imagePublicId: uploaded[0].publicId,
        images: uploaded, // semua foto
        isActive: true,
        sellerId,
      },
      include: sellerInclude,
    });

    return res.status(201).json({
      message: "Produk berhasil ditambahkan",
      product,
    });
  } catch (err) {
    await destroyMany(uploaded); // jangan tinggalkan foto yatim di Cloudinary
    console.error("Upload/Create Error:", err);

    return res.status(500).json({
      message: "Terjadi kesalahan pada server",
    });
  }
};

// =======================
// GET ALL PRODUCTS
// =======================
exports.getProducts = async (req, res) => {
  try {
    const keyword = req.query.search || "";

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        // MySQL sudah case-insensitive, jangan pakai mode: "insensitive"
        ...(keyword ? { name: { contains: keyword } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: sellerInclude,
    });

    return res.json(products);
  } catch (err) {
    console.error("Get Products Error:", err);

    return res.status(500).json({
      message: "Terjadi kesalahan pada server",
    });
  }
};

// =======================
// GET PRODUCT BY ID
// =======================
exports.getProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        message: "Format ID produk tidak valid",
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: sellerInclude,
    });

    if (!product) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }

    return res.json(product);
  } catch (err) {
    console.error("Get Product Error:", err);

    return res.status(500).json({
      message: "Terjadi kesalahan pada server",
    });
  }
};

// =======================
// UPDATE PRODUCT
// =======================
exports.updateProduct = async (req, res) => {
  let uploaded = [];

  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        message: "Format ID produk tidak valid",
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }

    const existing = currentImages(product);

    // keepImages = JSON array berisi publicId foto lama yang dipertahankan.
    // Kalau tidak dikirim, semua foto lama dipertahankan.
    let keep = existing;

    if (req.body.keepImages !== undefined) {
      let ids;
      try {
        ids = JSON.parse(req.body.keepImages);
        if (!Array.isArray(ids)) throw new Error("bukan array");
      } catch (e) {
        return res.status(400).json({ message: "keepImages tidak valid" });
      }
      keep = existing.filter((i) => ids.includes(i.publicId));
    }

    const newCount = req.files ? req.files.length : 0;

    if (keep.length + newCount > 10) {
      return res.status(400).json({ message: "Maksimal 10 foto" });
    }

    if (keep.length + newCount === 0) {
      return res
        .status(400)
        .json({ message: "Produk harus punya minimal satu foto" });
    }

    uploaded = await uploadMany(req.files || []);

    const finalImages = [...keep, ...uploaded];
    const removed = existing.filter(
      (i) => !keep.some((k) => k.publicId === i.publicId)
    );

    const data = {
      images: finalImages,
      imageUrl: finalImages[0].url,
      imagePublicId: finalImages[0].publicId,
    };

    if (req.body.name !== undefined) {
      data.name = req.body.name.trim();
    }

    if (req.body.description !== undefined) {
      data.description = req.body.description;
    }

    if (req.body.price !== undefined && req.body.price !== "") {
      data.price = Number(req.body.price);
    }

    if (req.body.stock !== undefined && req.body.stock !== "") {
      data.stock = Number(req.body.stock);
    }

    if (req.body.category !== undefined) {
      data.category = req.body.category;
    }

    if (req.body.isActive !== undefined) {
      data.isActive =
        req.body.isActive === true || req.body.isActive === "true";
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data,
      include: sellerInclude,
    });

    // Hapus foto lama di Cloudinary hanya setelah DB berhasil
    await destroyMany(removed);

    return res.json({
      message: "Produk berhasil diperbarui",
      product: updatedProduct,
    });
  } catch (err) {
    await destroyMany(uploaded);
    console.error("Update Product Error:", err);

    return res.status(500).json({
      message: "Terjadi kesalahan pada server",
    });
  }
};

// =======================
// DELETE PRODUCT
// =======================
exports.deleteProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        message: "Format ID produk tidak valid",
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }

    // Hapus record dulu, baru fotonya
    await prisma.product.delete({ where: { id: productId } });
    await destroyMany(currentImages(product));

    return res.json({ message: "Produk berhasil dihapus" });
  } catch (err) {
    console.error("Delete Product Error:", err);

    return res.status(500).json({
      message: "Terjadi kesalahan pada server",
    });
  }
};

const prisma = require("../../config/prisma");
const cloudinary = require("../../config/cloudinary");
const streamifier = require("streamifier");

// =======================
// HELPER UPLOAD CLOUDINARY
// =======================
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "products",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

// =======================
// CREATE PRODUCT
// =======================
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, category } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({
        message: "Nama, harga, dan kategori wajib diisi",
      });
    }

    let imageUrl = "";
    let imagePublicId = "";

    if (req.file && req.file.buffer) {
      const result = await uploadToCloudinary(req.file.buffer);

      imageUrl = result.secure_url;
      imagePublicId = result.public_id;
    }

    const sellerId = Number(req.user.id);

    if (!sellerId) {
      return res.status(401).json({
        message: "User tidak valid",
      });
    }

    // Pastikan seller memang ada
    const seller = await prisma.user.findUnique({
      where: {
        id: sellerId,
      },
    });

    if (!seller) {
      return res.status(404).json({
        message: "Seller tidak ditemukan",
      });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: description || "",
        price: Number(price),
        stock: Number(stock) || 0,
        category,
        imageUrl,
        imagePublicId,
        isActive: true,
        sellerId,
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: "Produk berhasil ditambahkan",
      product,
    });
  } catch (err) {
    console.error("Upload/Create Error:", err);

    return res.status(500).json({
      message: "Terjadi kesalahan pada server",
      error: err.message || err,
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

        ...(keyword
          ? {
              name: {
                contains: keyword,
                mode: "insensitive",
              },
            }
          : {}),
      },

      orderBy: {
        createdAt: "desc",
      },

      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.json(products);
  } catch (err) {
    console.error("Get Products Error:", err);

    return res.status(500).json({
      message: err.message,
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
      where: {
        id: productId,
      },

      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        message: "Produk tidak ditemukan",
      });
    }

    return res.json(product);
  } catch (err) {
    console.error("Get Product Error:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

// =======================
// UPDATE PRODUCT
// =======================
exports.updateProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        message: "Format ID produk tidak valid",
      });
    }

    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      return res.status(404).json({
        message: "Produk tidak ditemukan",
      });
    }

    let imageUrl = product.imageUrl;
    let imagePublicId = product.imagePublicId;

    // Jika upload gambar baru
    if (req.file && req.file.buffer) {
      // Hapus gambar lama
      if (product.imagePublicId) {
        await cloudinary.uploader.destroy(product.imagePublicId);
      }

      // Upload gambar baru
      const result = await uploadToCloudinary(req.file.buffer);

      imageUrl = result.secure_url;
      imagePublicId = result.public_id;
    }

    const data = {
      imageUrl,
      imagePublicId,
    };

    if (req.body.name !== undefined) {
      data.name = req.body.name;
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
      where: {
        id: productId,
      },

      data,

      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.json({
      message: "Produk berhasil diperbarui",
      product: updatedProduct,
    });
  } catch (err) {
    console.error("Update Product Error:", err);

    return res.status(500).json({
      message: "Terjadi kesalahan pada server",
      error: err.message || err,
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
      where: {
        id: productId,
      },
    });

    if (!product) {
      return res.status(404).json({
        message: "Produk tidak ditemukan",
      });
    }

    // Hapus gambar dari Cloudinary
    if (product.imagePublicId) {
      await cloudinary.uploader.destroy(product.imagePublicId);
    }

    await prisma.product.delete({
      where: {
        id: productId,
      },
    });

    return res.json({
      message: "Produk berhasil dihapus",
    });
  } catch (err) {
    console.error("Delete Product Error:", err);

    return res.status(500).json({
      message: "Terjadi kesalahan pada server",
      error: err.message || err,
    });
  }
};

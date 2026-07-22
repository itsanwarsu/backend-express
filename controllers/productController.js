const Product = require("../models/Product");
const cloudinary = require("../config/cloudinary");
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

    let image = {
      url: "",
      public_id: "",
    };

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);

      image = {
        url: result.secure_url,
        public_id: result.public_id,
      };
    }

    const product = await Product.create({
      name,
      description,
      price: Number(price),
      stock: Number(stock),
      category,
      image,
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
      stack: err.stack,
    });
  }
};

// =======================
// GET ALL PRODUCTS
// =======================
exports.getProducts = async (req, res) => {
  try {
    const keyword = req.query.search || "";

    const products = await Product.find({
      name: {
        $regex: keyword,
        $options: "i",
      },
      isActive: true,
    }).sort({
      createdAt: -1,
    });

    res.json(products);

  } catch (err) {
    console.error("Get Products Error:", err);

    res.status(500).json({
      message: err.message,
      stack: err.stack,
    });
  }
};

// =======================
// GET PRODUCT (Updated)
// =======================
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Produk tidak ditemukan",
      });
    }

    res.json(product);

  } catch (err) {
    // Tangani jika ID bukan format MongoDB valid
    if (err.name === "CastError") {
      return res.status(400).json({
        message: "Format ID produk tidak valid",
      });
    }

    res.status(500).json({
      message: err.message,
    });
  }
};

// =======================
// UPDATE PRODUCT
// =======================
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Produk tidak ditemukan",
      });
    }

    let image = product.image;

    // Upload gambar baru jika ada
    if (req.file) {
      // Hapus gambar lama dari Cloudinary
      if (product.image?.public_id) {
        await cloudinary.uploader.destroy(product.image.public_id);
      }

      // Upload gambar baru
      const result = await uploadToCloudinary(req.file.buffer);

      image = {
        url: result.secure_url,
        public_id: result.public_id,
      };
    }

    // Update data produk
    product.name = req.body.name ?? product.name;
    product.description =
      req.body.description ?? product.description;

    if (req.body.price !== undefined) {
      product.price = Number(req.body.price);
    }

    if (req.body.stock !== undefined) {
      product.stock = Number(req.body.stock);
    }

    product.category =
      req.body.category ?? product.category;

    product.image = image;

    await product.save();

    return res.json({
      message: "Produk berhasil diperbarui",
      product,
    });

  } catch (err) {
    console.error("Update Product Error:", err);

    return res.status(500).json({
      message: "Terjadi kesalahan pada server",
      error: err.message || err,
      stack: err.stack,
    });
  }
};

// =======================
// DELETE PRODUCT
// =======================
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Produk tidak ditemukan",
      });
    }

    // Hapus gambar dari Cloudinary jika ada
    if (product.image?.public_id) {
      await cloudinary.uploader.destroy(product.image.public_id);
    }

    // Hapus produk dari database
    await product.deleteOne();

    return res.json({
      message: "Produk berhasil dihapus",
    });

  } catch (err) {
    console.error("Delete Product Error:", err);

    return res.status(500).json({
      message: "Terjadi kesalahan pada server",
      error: err.message || err,
      stack: err.stack,
    });
  }
};

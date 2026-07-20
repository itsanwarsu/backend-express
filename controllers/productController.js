const Product = require("../models/Product");

// =======================
// CREATE PRODUCT
// =======================
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      stock,
      category,
      image,
    } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({
        message: "Nama, harga, dan kategori wajib diisi",
      });
    }

    const product = await Product.create({
      name,
      description,
      price,
      stock,
      category,
      image,
    });

    res.status(201).json({
      message: "Produk berhasil ditambahkan",
      product,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
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

    res.status(200).json(products);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// =======================
// GET PRODUCT BY ID
// =======================
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Produk tidak ditemukan",
      });
    }

    res.status(200).json(product);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// =======================
// UPDATE PRODUCT
// =======================
exports.updateProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      stock,
      category,
      image,
      isActive,
    } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        price,
        stock,
        category,
        image,
        isActive,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      return res.status(404).json({
        message: "Produk tidak ditemukan",
      });
    }

    res.status(200).json({
      message: "Produk berhasil diperbarui",
      product,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// =======================
// DELETE PRODUCT
// =======================
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Produk tidak ditemukan",
      });
    }

    res.status(200).json({
      message: "Produk berhasil dihapus",
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

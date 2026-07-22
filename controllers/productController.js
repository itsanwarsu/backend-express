const Product = require("../models/Product");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

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
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "products",
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );

        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

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

    res.json(products);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// =======================
// GET PRODUCT
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

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Produk tidak ditemukan",
      });
    }

    let image = product.image;

    if (req.file) {

      if (product.image?.public_id) {
        await cloudinary.uploader.destroy(
          product.image.public_id
        );
      }

      const result = await new Promise((resolve, reject) => {

        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "products",
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );

        streamifier
          .createReadStream(req.file.buffer)
          .pipe(stream);

      });

      image = {
        url: result.secure_url,
        public_id: result.public_id,
      };

    }

    product.name = req.body.name;
    product.description = req.body.description;
    product.price = req.body.price;
    product.stock = req.body.stock;
    product.category = req.body.category;
    product.image = image;

    await product.save();

    res.json({
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

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Produk tidak ditemukan",
      });
    }

    if (product.image?.public_id) {
      await cloudinary.uploader.destroy(
        product.image.public_id
      );
    }

    await product.deleteOne();

    res.json({
      message: "Produk berhasil dihapus",
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

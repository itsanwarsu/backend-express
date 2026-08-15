const User = require("../models/User");
const Product = require("../models/Product");

// =====================================
// GET WISHLIST
// =====================================
const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("wishlist");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    res.status(200).json({
      success: true,
      total: user.wishlist.length,
      wishlist: user.wishlist,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// ADD WISHLIST
// =====================================
const addWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    // Cek apakah produk ada
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Produk tidak ditemukan",
      });
    }

    // Tambahkan ke wishlist jika belum ada
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $addToSet: { wishlist: productId },
      },
      { new: true }
    ).populate("wishlist");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    res.status(200).json({
      success: true,
      message: "Produk berhasil ditambahkan ke wishlist",
      wishlist: user.wishlist,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// REMOVE WISHLIST
// =====================================
const removeWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $pull: { wishlist: productId },
      },
      { new: true }
    ).populate("wishlist");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    res.status(200).json({
      success: true,
      message: "Produk berhasil dihapus dari wishlist",
      wishlist: user.wishlist,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getWishlist,
  addWishlist,
  removeWishlist,
};


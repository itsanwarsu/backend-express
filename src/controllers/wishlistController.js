const prisma = require("../../config/prisma");

// =====================================
// GET WISHLIST
// =====================================
const getWishlist = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    if (!Number.isInteger(userId)) {
      return res.status(401).json({
        success: false,
        message: "User tidak valid",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        wishlistProducts: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    return res.status(200).json({
      success: true,
      total: user.wishlistProducts.length,
      wishlist: user.wishlistProducts,
    });
  } catch (error) {
    console.error("Get Wishlist Error:", error);

    return res.status(500).json({
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
    const userId = Number(req.user.id);
    const productId = Number(req.params.productId);

    if (!Number.isInteger(userId)) {
      return res.status(401).json({
        success: false,
        message: "User tidak valid",
      });
    }

    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        success: false,
        message: "Product ID tidak valid",
      });
    }

    // Cek produk
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Produk tidak ditemukan",
      });
    }

    // Cek user
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    // Tambahkan product ke wishlist
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        wishlistProducts: {
          connect: {
            id: productId,
          },
        },
      },
    });

    // Ambil wishlist terbaru
    const updatedUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        wishlistProducts: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Produk berhasil ditambahkan ke wishlist",
      wishlist: updatedUser.wishlistProducts,
    });
  } catch (error) {
    console.error("Add Wishlist Error:", error);

    return res.status(500).json({
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
    const userId = Number(req.user.id);
    const productId = Number(req.params.productId);

    if (!Number.isInteger(userId)) {
      return res.status(401).json({
        success: false,
        message: "User tidak valid",
      });
    }

    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        success: false,
        message: "Product ID tidak valid",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    // Hapus product dari wishlist
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        wishlistProducts: {
          disconnect: {
            id: productId,
          },
        },
      },
    });

    // Ambil wishlist terbaru
    const updatedUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        wishlistProducts: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Produk berhasil dihapus dari wishlist",
      wishlist: updatedUser.wishlistProducts,
    });
  } catch (error) {
    console.error("Remove Wishlist Error:", error);

    return res.status(500).json({
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

const prisma = require("../../config/prisma");

// Helper untuk validasi & parse quantity
const parseQuantity = (qty) => {
  const parsed = parseInt(qty, 10);
  return isNaN(parsed) || parsed < 1 ? 1 : parsed;
};

// Helper untuk parse ID PostgreSQL
const parseId = (id) => {
  const parsed = Number(id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

// Helper mengambil cart lengkap dengan product
const getCartWithItems = async (userId) => {
  return await prisma.cart.findUnique({
    where: {
      userId,
    },
    include: {
      items: {
        include: {
          product: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
};

// =======================
// GET CART
// =======================
exports.getCart = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    if (!Number.isInteger(userId)) {
      return res.status(401).json({
        message: "User tidak valid",
      });
    }

    let cart = await getCartWithItems(userId);

    // Jika cart belum ada, buat cart baru
    if (!cart) {
      await prisma.cart.create({
        data: {
          userId,
        },
      });

      cart = await getCartWithItems(userId);
    }

    return res.json(cart);
  } catch (err) {
    console.error("Get Cart Error:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

// =======================
// ADD TO CART
// =======================
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    const parsedProductId = parseId(productId);

    if (!parsedProductId) {
      return res.status(400).json({
        message: "productId tidak valid",
      });
    }

    const userId = Number(req.user.id);

    if (!Number.isInteger(userId)) {
      return res.status(401).json({
        message: "User tidak valid",
      });
    }

    // Pastikan product ada
    const product = await prisma.product.findUnique({
      where: {
        id: parsedProductId,
      },
    });

    if (!product) {
      return res.status(404).json({
        message: "Produk tidak ditemukan",
      });
    }

    const addQty = parseQuantity(quantity);

    // Cari cart user
    let cart = await prisma.cart.findUnique({
      where: {
        userId,
      },
    });

    // Buat cart jika belum ada
    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId,
        },
      });
    }

    // Cari item product di cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: parsedProductId,
        },
      },
    });

    if (existingItem) {
      // Product sudah ada → tambah quantity
      await prisma.cartItem.update({
        where: {
          id: existingItem.id,
        },
        data: {
          quantity: {
            increment: addQty,
          },
        },
      });
    } else {
      // Product belum ada → buat item
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: parsedProductId,
          quantity: addQty,
        },
      });
    }

    const updatedCart = await getCartWithItems(userId);

    return res.json(updatedCart);
  } catch (err) {
    console.error("Add To Cart Error:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

// =======================
// REMOVE FROM CART
// =======================
exports.removeFromCart = async (req, res) => {
  try {
    const productId = parseId(req.params.id);

    if (!productId) {
      return res.status(400).json({
        message: "Format product ID tidak valid",
      });
    }

    const userId = Number(req.user.id);

    const cart = await prisma.cart.findUnique({
      where: {
        userId,
      },
    });

    if (!cart) {
      return res.status(404).json({
        message: "Cart tidak ditemukan",
      });
    }

    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId,
      },
    });

    const updatedCart = await getCartWithItems(userId);

    return res.json(updatedCart);
  } catch (err) {
    console.error("Remove From Cart Error:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

// =======================
// INCREASE QUANTITY
// =======================
exports.increaseQty = async (req, res) => {
  try {
    const productId = parseId(req.params.id);

    if (!productId) {
      return res.status(400).json({
        message: "Format product ID tidak valid",
      });
    }

    const userId = Number(req.user.id);

    const cart = await prisma.cart.findUnique({
      where: {
        userId,
      },
    });

    if (!cart) {
      return res.status(404).json({
        message: "Cart tidak ditemukan",
      });
    }

    const item = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    if (!item) {
      return res.status(404).json({
        message: "Produk tidak ditemukan di keranjang",
      });
    }

    await prisma.cartItem.update({
      where: {
        id: item.id,
      },
      data: {
        quantity: {
          increment: 1,
        },
      },
    });

    const updatedCart = await getCartWithItems(userId);

    return res.json(updatedCart);
  } catch (err) {
    console.error("Increase Quantity Error:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

// =======================
// DECREASE QUANTITY
// =======================
exports.decreaseQty = async (req, res) => {
  try {
    const productId = parseId(req.params.id);

    if (!productId) {
      return res.status(400).json({
        message: "Format product ID tidak valid",
      });
    }

    const userId = Number(req.user.id);

    const cart = await prisma.cart.findUnique({
      where: {
        userId,
      },
    });

    if (!cart) {
      return res.status(404).json({
        message: "Cart tidak ditemukan",
      });
    }

    const item = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    if (!item) {
      return res.status(404).json({
        message: "Produk tidak ditemukan di keranjang",
      });
    }

    if (item.quantity > 1) {
      await prisma.cartItem.update({
        where: {
          id: item.id,
        },
        data: {
          quantity: {
            decrement: 1,
          },
        },
      });
    } else {
      await prisma.cartItem.delete({
        where: {
          id: item.id,
        },
      });
    }

    const updatedCart = await getCartWithItems(userId);

    return res.json(updatedCart);
  } catch (err) {
    console.error("Decrease Quantity Error:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

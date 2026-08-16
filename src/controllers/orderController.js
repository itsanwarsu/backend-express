const prisma = require("../../config/prisma");

// ===============================
// CREATE ORDER
// ===============================
exports.createOrder = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const { customerName, address } = req.body;

    if (!customerName || !address) {
      return res.status(400).json({
        message: "Nama customer dan alamat wajib diisi",
      });
    }

    if (!Number.isInteger(userId)) {
      return res.status(401).json({
        message: "User tidak valid",
      });
    }

    // Ambil cart + product
    const cart = await prisma.cart.findUnique({
      where: {
        userId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Cart kosong
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        message: "Keranjang kosong",
      });
    }

    // Pastikan semua product masih ada
    const invalidItem = cart.items.find(
      (item) => !item.product
    );

    if (invalidItem) {
      return res.status(400).json({
        message: "Ada produk di keranjang yang sudah tidak tersedia",
      });
    }

    // Buat OrderItem
    const orderItems = cart.items.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      price: item.product.price,
    }));

    // Hitung total
    const total = orderItems.reduce(
      (sum, item) =>
        sum + Number(item.price) * item.quantity,
      0
    );

    // ==========================================
    // TRANSACTION
    // ==========================================
    const order = await prisma.$transaction(async (tx) => {
      // Buat order
      const newOrder = await tx.order.create({
        data: {
          userId,
          customerName,
          address,
          total,
          status: "pending",

          items: {
            create: orderItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },

        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // Kosongkan cart
      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
        },
      });

      return newOrder;
    });

    return res.status(201).json(order);

  } catch (err) {
    console.error("Create Order Error:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};


// ===============================
// GET ALL ORDERS USER
// ===============================
exports.getOrders = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    if (!Number.isInteger(userId)) {
      return res.status(401).json({
        message: "User tidak valid",
      });
    }

    const orders = await prisma.order.findMany({
      where: {
        userId,
      },

      include: {
        items: {
          include: {
            product: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(orders);

  } catch (err) {
    console.error("Get Orders Error:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};


// ===============================
// GET ORDER BY ID
// ===============================
exports.getOrder = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const orderId = Number(req.params.id);

    if (!Number.isInteger(userId)) {
      return res.status(401).json({
        message: "User tidak valid",
      });
    }

    if (!Number.isInteger(orderId)) {
      return res.status(400).json({
        message: "Order ID tidak valid",
      });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },

      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order tidak ditemukan",
      });
    }

    return res.json(order);

  } catch (err) {
    console.error("Get Order Error:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

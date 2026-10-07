const prisma = require("../../config/prisma");

// =====================================
// CHECKOUT (tanpa payment gateway)
// =====================================
// Order sudah dibuat sebelumnya dengan status "pending".
// Fungsi ini memvalidasi order milik user, lalu mengembalikan
// ringkasan untuk pembayaran manual (COD / transfer).
const createCheckoutSession = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const parsedOrderId = Number(req.body.orderId);

    if (!Number.isInteger(userId)) {
      return res.status(401).json({
        success: false,
        message: "User tidak valid",
      });
    }

    if (!Number.isInteger(parsedOrderId)) {
      return res.status(400).json({
        success: false,
        message: "Order ID tidak valid",
      });
    }

    const order = await prisma.order.findFirst({
      where: { id: parsedOrderId, userId },
      include: {
        items: { include: { product: true } },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order tidak ditemukan",
      });
    }

    if (order.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Order berstatus "${order.status}", tidak bisa diproses lagi`,
      });
    }

    if (!order.items.length) {
      return res.status(400).json({
        success: false,
        message: "Order tidak memiliki produk",
      });
    }

    // Validasi harga dan jumlah tiap item
    for (const item of order.items) {
      const price = Number(item.price);
      const quantity = Number(item.quantity);

      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({
          success: false,
          message: `Harga tidak valid untuk produk "${item.product.name}"`,
        });
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Jumlah tidak valid untuk produk "${item.product.name}"`,
        });
      }
    }

    return res.status(200).json({
      success: true,
      orderId: order.id,
      status: order.status,
      total: order.total,
      message: "Pesanan dibuat, menunggu pembayaran",
    });
  } catch (error) {
    console.error("Checkout Error:", error);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
    });
  }
};

// =====================================
// ADMIN: TANDAI ORDER SUDAH DIBAYAR
// =====================================
// Pastikan route yang memakai fungsi ini dilindungi middleware admin.
const markOrderPaid = async (req, res) => {
  try {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Order ID tidak valid",
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order tidak ditemukan",
      });
    }

    if (order.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Order berstatus "${order.status}", tidak bisa ditandai paid`,
      });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: "paid" },
    });

    return res.json({ success: true, order: updated });
  } catch (error) {
    console.error("Mark Paid Error:", error);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
    });
  }
};

module.exports = {
  createCheckoutSession,
  markOrderPaid,
};

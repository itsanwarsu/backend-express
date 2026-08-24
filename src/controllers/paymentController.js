const stripe = require("../services/stripeService");
const prisma = require("../../config/prisma");

// =====================================
// CREATE STRIPE CHECKOUT SESSION
// =====================================
const createCheckoutSession = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const { orderId } = req.body;

    if (!Number.isInteger(userId)) {
      return res.status(401).json({
        success: false,
        message: "User tidak valid",
      });
    }

    const parsedOrderId = Number(orderId);

    if (!Number.isInteger(parsedOrderId)) {
      return res.status(400).json({
        success: false,
        message: "Order ID tidak valid",
      });
    }

    // Cari order milik user yang sedang login
    const order = await prisma.order.findFirst({
      where: {
        id: parsedOrderId,
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
        success: false,
        message: "Order tidak ditemukan",
      });
    }

    // Jangan membuat pembayaran untuk order yang sudah dibayar
    if (order.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Order sudah dibayar",
      });
    }

    if (!order.items.length) {
      return res.status(400).json({
        success: false,
        message: "Order tidak memiliki produk",
      });
    }

    // Validasi harga tiap item sebelum dikirim ke Stripe
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

    // Buat item Stripe berdasarkan harga OrderItem
    // Catatan: IDR adalah zero-decimal currency di Stripe,
    // jadi unit_amount TIDAK perlu dikali 100.
    const lineItems = order.items.map((item) => ({
      price_data: {
        currency: "idr",

        product_data: {
          name: item.product.name,
        },

        unit_amount: Math.round(Number(item.price)),
      },

      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: lineItems,

      metadata: {
        orderId: String(order.id),
        userId: String(userId),
      },

      success_url:
        `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url:
        `${process.env.FRONTEND_URL}/payment/cancel?order_id=${order.id}`,
    });

    // Simpan Stripe Checkout Session
    await prisma.order.update({
      where: {
        id: order.id,
      },

      data: {
        stripeSessionId: session.id,
      },
    });

    return res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error(
      "Create Stripe Checkout Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// =====================================
// STRIPE WEBHOOK
// =====================================
// PENTING: route ini WAJIB pakai express.raw({ type: "application/json" })
// sebagai middleware, dan didaftarkan SEBELUM express.json() global,
// karena stripe.webhooks.constructEvent butuh raw body (Buffer),
// bukan hasil parsing JSON. Lihat contoh route di bawah.
const handleStripeWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error(
      "Stripe Webhook Error:",
      error.message
    );

    return res.status(400).send(
      `Webhook Error: ${error.message}`
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;

        // checkout.session.completed bisa terjadi walau pembayaran
        // belum lunas (mis. metode async seperti VA/QRIS/e-wallet
        // yang butuh konfirmasi tambahan). Pastikan sudah "paid".
        if (session.payment_status !== "paid") {
          console.log(
            `Session ${session.id} belum "paid" (status: ${session.payment_status}), menunggu event berikutnya`
          );
          break;
        }

        const orderId = Number(
          session.metadata?.orderId
        );

        if (!Number.isInteger(orderId)) {
          console.error(
            "Order ID tidak valid dari Stripe metadata"
          );

          break;
        }

        const paymentIntent =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null;

        const existingOrder = await prisma.order.findUnique({
          where: { id: orderId },
        });

        if (!existingOrder) {
          console.error(`Order ${orderId} tidak ditemukan di database`);
          break;
        }

        // Cegah pemrosesan ganda jika Stripe mengirim event yang sama
        // lebih dari sekali (retry) atau session tidak cocok dengan order.
        if (existingOrder.status === "paid") {
          console.log(`Order ${orderId} sudah berstatus paid, skip`);
          break;
        }

        if (
          existingOrder.stripeSessionId &&
          existingOrder.stripeSessionId !== session.id
        ) {
          console.error(
            `Session ID tidak cocok untuk order ${orderId}, kemungkinan data tidak konsisten`
          );
          break;
        }

        await prisma.order.update({
          where: {
            id: orderId,
          },

          data: {
            status: "paid",
            stripeSessionId: session.id,
            stripePaymentId: paymentIntent,
          },
        });

        console.log(
          `Order ${orderId} berhasil dibayar`
        );

        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object;
        const orderId = Number(session.metadata?.orderId);

        if (Number.isInteger(orderId)) {
          console.log(`Pembayaran gagal untuk order ${orderId}`);
          // Opsional: update status order jadi "failed"/"cancelled" di sini
        }

        break;
      }

      default:
        console.log(
          `Unhandled Stripe event: ${event.type}`
        );
    }

    return res.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Stripe Webhook Processing Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


module.exports = {
  createCheckoutSession,
  handleStripeWebhook,
};


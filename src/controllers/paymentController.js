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

    // Buat item Stripe berdasarkan harga OrderItem
    const lineItems = order.items.map((item) => ({
      price_data: {
        currency: "idr",

        product_data: {
          name: item.product.name,
        },

        unit_amount: Math.round(
          Number(item.price)
        ),
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
      case "checkout.session.completed": {
        const session = event.data.object;

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

const Cart = require("../models/Cart");
const Order = require("../models/Order");

exports.createOrder = async (req, res) => {
  try {
    const { customerName, address } = req.body;

    const cart = await Cart.findOne({
      user: req.user.id,
    }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        message: "Keranjang kosong",
      });
    }

    const items = cart.items.map((item) => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.product.price,
    }));

    const total = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const order = await Order.create({
      user: req.user.id,
      customerName,
      address,
      items,
      total,
    });

    cart.items = [];
    await cart.save();

    await order.populate("items.product");

    res.status(201).json(order);

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user.id,
    })
      .populate("items.product")
      .sort({
        createdAt: -1,
      });

    res.json(orders);

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate("items.product");

    if (!order) {
      return res.status(404).json({
        message: "Order tidak ditemukan",
      });
    }

    res.json(order);

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

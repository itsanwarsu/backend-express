const Cart = require("../models/Cart");

exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({
      user: req.user.id,
    }).populate("items.product");

    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,
        items: [],
      });
    }

    res.json(cart);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    let cart = await Cart.findOne({
      user: req.user.id,
    });

    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,
        items: [],
      });
    }

    const item = cart.items.find(
      (i) => i.product.toString() === productId
    );

    if (item) {
      item.quantity += quantity || 1;
    } else {
      cart.items.push({
        product: productId,
        quantity: quantity || 1,
      });
    }

    await cart.save();

    res.json(cart);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.removeFromCart = async (req, res) => {
  const { id } = req.params;

  const cart = await Cart.findOne({
    user: req.user.id,
  });

  cart.items = cart.items.filter(
    (item) => item.product.toString() !== id
  );

  await cart.save();

  res.json(cart);
};

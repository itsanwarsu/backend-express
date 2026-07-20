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
await cart.populate("items.product");

    res.json(cart);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const { id } = req.params;

    const cart = await Cart.findOne({
      user: req.user.id,
    });

    if (!cart) {
      return res.status(404).json({
        message: "Cart tidak ditemukan",
      });
    }

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== id
    );

    await cart.save();
    await cart.populate("items.product");

    res.json(cart);

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.increaseQty = async (req, res) => {
  try {
    const { id } = req.params;

    const cart = await Cart.findOne({
      user: req.user.id,
    });

    if (!cart) {
      return res.status(404).json({
        message: "Cart tidak ditemukan",
      });
    }

    const item = cart.items.find(
      (item) => item.product.toString() === id
    );

    if (!item) {
      return res.status(404).json({
        message: "Produk tidak ditemukan",
      });
    }

    item.quantity++;

    await cart.save();
    await cart.populate("items.product");

    res.json(cart);

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.decreaseQty = async (req, res) => {
  try {
    const { id } = req.params;

    const cart = await Cart.findOne({
      user: req.user.id,
    });

    if (!cart) {
      return res.status(404).json({
        message: "Cart tidak ditemukan",
      });
    }

    const item = cart.items.find(
      (item) => item.product.toString() === id
    );

    if (!item) {
      return res.status(404).json({
        message: "Produk tidak ditemukan",
      });
    }

    if (item.quantity > 1) {
      item.quantity--;
    } else {
      cart.items = cart.items.filter(
        (item) => item.product.toString() !== id
      );
    }

    await cart.save();
    await cart.populate("items.product");

    res.json(cart);

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

const Cart = require("../models/Cart");
const Product = require("../models/Product");
const mongoose = require("mongoose");

// Helper untuk validasi & parse quantity
const parseQuantity = (qty) => {
  const parsed = parseInt(qty, 10);
  return isNaN(parsed) || parsed < 1 ? 1 : parsed;
};

// Helper untuk cek ObjectId valid
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Helper untuk buang item yang product-nya sudah null (produk terhapus)
const cleanCartItems = (cart) => {
  const before = cart.items.length;
  cart.items = cart.items.filter((item) => item.product != null);
  return before !== cart.items.length;
};

exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate("items.product");

    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }

    // Bersihkan item yang produknya sudah tidak ada
    if (cleanCartItems(cart)) {
      await cart.save();
    }

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || !isValidId(productId)) {
      return res.status(400).json({ message: "productId tidak valid" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }

    const addQty = parseQuantity(quantity);

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }

    const targetId = productId.toString();
    const item = cart.items.find(
      (i) => i.product && i.product.toString() === targetId
    );

    if (item) {
      item.quantity += addQty;
    } else {
      cart.items.push({ product: productId, quantity: addQty });
    }

    await cart.save();
    await cart.populate("items.product");

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const { id } = req.params;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: "Cart tidak ditemukan" });
    }

    cart.items = cart.items.filter(
      (item) => item.product && item.product.toString() !== id
    );

    await cart.save();
    await cart.populate("items.product");

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.increaseQty = async (req, res) => {
  try {
    const { id } = req.params;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: "Cart tidak ditemukan" });
    }

    const item = cart.items.find(
      (item) => item.product && item.product.toString() === id
    );

    if (!item) {
      return res.status(404).json({ message: "Produk tidak ditemukan di keranjang" });
    }

    item.quantity += 1;

    await cart.save();
    await cart.populate("items.product");

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.decreaseQty = async (req, res) => {
  try {
    const { id } = req.params;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: "Cart tidak ditemukan" });
    }

    const item = cart.items.find(
      (item) => item.product && item.product.toString() === id
    );

    if (!item) {
      return res.status(404).json({ message: "Produk tidak ditemukan di keranjang" });
    }

    if (item.quantity > 1) {
      item.quantity -= 1;
    } else {
      cart.items = cart.items.filter(
        (i) => i.product && i.product.toString() !== id
      );
    }

    await cart.save();
    await cart.populate("items.product");

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

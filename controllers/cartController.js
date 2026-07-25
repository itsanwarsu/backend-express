const Cart = require("../models/Cart");

// Helper untuk validasi & parse quantity
const parseQuantity = (qty) => {
  const parsed = parseInt(qty, 10);
  return isNaN(parsed) || parsed < 1 ? 1 : parsed;
};

exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate("items.product");

    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,
        items: [],
      });
    }

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const addQty = parseQuantity(quantity);

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,
        items: [],
      });
    }

const item = cart.items.find((i) => {
  // Ambil _id jika i.product adalah object hasil populate, atau gunakan i.product langsung jika masih ObjectId
  const existingId = i.product._id ? i.product._id.toString() : i.product.toString();
  
  // Pastikan productId target juga berupa String murni
  const targetId = typeof productId === 'object' ? productId._id.toString() : productId.toString();

  return existingId === targetId;
});

    if (item) {
      item.quantity += addQty;
    } else {
      cart.items.push({
        product: productId,
        quantity: addQty,
      });
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

    cart.items = cart.items.filter((item) => item.product.toString() !== id);

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

    const item = cart.items.find((item) => item.product.toString() === id);

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

    const item = cart.items.find((item) => item.product.toString() === id);

    if (!item) {
      return res.status(404).json({ message: "Produk tidak ditemukan di keranjang" });
    }

    if (item.quantity > 1) {
      item.quantity -= 1;
    } else {
      cart.items = cart.items.filter((i) => i.product.toString() !== id);
    }

    await cart.save();
    await cart.populate("items.product");

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


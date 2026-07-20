const router = require("express").Router();

const auth = require("../middleware/auth");

const {
  getCart,
  addToCart,
  removeFromCart,
  increaseQty,
  decreaseQty,
} = require("../controllers/cartController");

router.get("/", auth, getCart);

router.post("/", auth, addToCart);

router.delete("/:id", auth, removeFromCart);

router.patch("/increase/:id", auth, increaseQty);

router.patch("/decrease/:id", auth, decreaseQty);

module.exports = router;

exports.increaseQty = async (req, res) => {
  try {
    const cartItem = await Cart.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!cartItem) {
      return res.status(404).json({
        message: "Item tidak ditemukan",
      });
    }

    cartItem.quantity += 1;

    await cartItem.save();

    const items = await Cart.find({
      user: req.user.id,
    }).populate("product");

    res.json({ items });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.decreaseQty = async (req, res) => {
  try {
    const cartItem = await Cart.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!cartItem) {
      return res.status(404).json({
        message: "Item tidak ditemukan",
      });
    }

    if (cartItem.quantity > 1) {
      cartItem.quantity -= 1;
      await cartItem.save();
    }

    const items = await Cart.find({
      user: req.user.id,
    }).populate("product");

    res.json({ items });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};



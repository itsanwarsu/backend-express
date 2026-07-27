const router = require("express").Router();

const { protect: auth } = require("../middleware/auth");

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



const express = require("express");
const router = express.Router();

const {
  getWishlist,
  addWishlist,
  removeWishlist,
} = require("../controllers/wishlistController");

const { protect: auth } = require("../middleware/auth");

router.get("/", auth, getWishlist);

router.post("/:productId", auth, addWishlist);

router.delete("/:productId", auth, removeWishlist);

module.exports = router;

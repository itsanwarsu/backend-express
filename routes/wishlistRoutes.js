const express = require("express");
const router = express.Router();

const {
  getWishlist,
  addWishlist,
  removeWishlist,
} = require("../controllers/wishlistController");

const { protect } = require("../middleware/auth");

router.get("/", protect, getWishlist);

router.post("/:productId", protect, addWishlist);

router.delete("/:productId", protect, removeWishlist);

module.exports = router;

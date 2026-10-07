const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth");
const admin = require("../middleware/admin");
const upload = require("../middleware/upload");

const {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

// Public
router.get("/", getProducts);
router.get("/:id", getProduct);

// Admin (maks 10 foto, key "images" harus sama dengan frontend)
router.post("/", protect, admin, upload.array("images", 10), createProduct);
router.put("/:id", protect, admin, upload.array("images", 10), updateProduct);
router.delete("/:id", protect, admin, deleteProduct);

module.exports = router;

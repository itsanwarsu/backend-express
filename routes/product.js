const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
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

// Admin
router.post("/", auth, admin, upload.single("image"), createProduct);
router.put("/:id", auth, admin, upload.single("image"), updateProduct);
router.delete("/:id", auth, admin, deleteProduct);

module.exports = router;

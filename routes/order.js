const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");

const {
  createOrder,
  getOrders,
  getOrder,
} = require("../controllers/orderController");

router.post("/", auth, createOrder);

router.get("/", auth, getOrders);

router.get("/:id", auth, getOrder);

module.exports = router;

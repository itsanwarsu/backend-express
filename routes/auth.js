const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.get("/profile", protect, authController.profile);

router.post("/register", authController.register);
router.post("/login", authController.login);

module.exports = router;

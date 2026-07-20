const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const auth = require("../middleware/auth");

router.get("/profile", auth, authController.profile);
// Register
router.post("/register", authController.register);

// Login
router.post("/login", authController.login);

module.exports = router;

const express = require("express");
const router = express.Router();
const passport = require("passport");

const authController = require("../controllers/authController");
const { protect } = require("../middleware/auth");


// =====================
// JWT Authentication
// =====================

router.post("/register", authController.register);

router.post("/login", authController.login);

router.get("/profile", protect, authController.profile);


// =====================
// Google OAuth
// =====================

// Redirect ke halaman login Google
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);


// Callback dari Google
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  authController.googleCallback
);


module.exports = router;

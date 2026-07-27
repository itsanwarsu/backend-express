const express = require("express");
const router = express.Router();

const {
  createConversation,
  getConversations,
} = require("../controllers/conversationController");

const { protect } = require("../middleware/auth");

router.post("/", protect, createConversation);
router.get("/", protect, getConversations);

module.exports = router;

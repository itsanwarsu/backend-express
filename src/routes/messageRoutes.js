const express = require("express");
const router = express.Router();

const {
  sendMessage,
  getMessages,
  markAsRead,
} = require("../controllers/messageController");

const { protect } = require("../middleware/auth");

router.post("/", protect, sendMessage);
router.get("/:conversationId", protect, getMessages);
router.patch("/read/:conversationId", protect, markAsRead);

module.exports = router;

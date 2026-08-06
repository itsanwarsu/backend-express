const express = require("express");
const router = express.Router();

const {
  sendMessage,
  getMessages,
} = require("../controllers/messageController");

const { protect } = require("../middleware/auth");

router.post("/", protect, sendMessage);
router.get("/:conversationId", protect, getMessages);
router.patch("/read/:conversationId", protect, messageController.markAsRead);

module.exports = router;

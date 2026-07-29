const express = require("express");
const router = express.Router();

const {
deleteConversation,
  createConversation,
  getConversations,
} = require("../controllers/conversationController");

const { protect } = require("../middleware/auth");

router.post("/", protect, createConversation);
router.get("/", protect, getConversations);
router.delete("/:conversationId", protect, deleteConversation);

module.exports = router;

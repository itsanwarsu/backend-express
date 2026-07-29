const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const { getIO } = require("../socket/socket");

// Kirim pesan
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, text } = req.body;

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user.id,
      text,
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text,
      lastSender: req.user.id,
      lastMessageAt: new Date(),
    });

    const data = await Message.findById(message._id)
      .populate("sender", "name");

    // Kirim event socket real-time
    getIO().emit("newMessage", data);

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// Semua pesan
exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      conversation: req.params.conversationId,
    })
      .populate("sender", "name")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};


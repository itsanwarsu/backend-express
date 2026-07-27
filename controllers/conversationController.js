const Conversation = require("../models/Conversation");

// Membuat atau mengambil conversation
exports.createConversation = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user.id;

    let conversation = await Conversation.findOne({
      members: { $all: [senderId, receiverId] },
    });

    if (conversation) {
      return res.json(conversation);
    }

    conversation = await Conversation.create({
      members: [senderId, receiverId],
    });

    res.status(201).json(conversation);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// Semua conversation user
exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      members: req.user.id,
    })
      .populate("members", "name email")
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

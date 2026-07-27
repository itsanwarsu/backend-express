const Conversation = require("../models/Conversation");

exports.createConversation = async (req, res) => {
  try {
    const { receiverId, productId } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !productId) {
      return res.status(400).json({
        message: "receiverId dan productId wajib diisi.",
      });
    }

    if (senderId === receiverId) {
      return res.status(400).json({
        message: "Tidak dapat membuat percakapan dengan diri sendiri.",
      });
    }

    let conversation = await Conversation.findOne({
      members: { $all: [senderId, receiverId] },
      product: productId,
    }).populate("members", "name email").populate("product");

    if (conversation) {
      return res.status(200).json(conversation);
    }

    conversation = await Conversation.create({
      members: [senderId, receiverId],
      product: productId,
    });

    conversation = await Conversation.findById(conversation._id)
      .populate("members", "name email")
      .populate("product");

    return res.status(201).json(conversation);
  } catch (err) {
    console.error("Create Conversation Error:", err);

    return res.status(500).json({
      message: "Gagal membuat percakapan.",
      error: err.message,
    });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      members: req.user.id,
    })
      .populate("members", "name email")
      .populate("product")
      .sort({ lastMessageAt: -1 });

    return res.status(200).json(conversations);
  } catch (err) {
    console.error("Get Conversations Error:", err);

    return res.status(500).json({
      message: "Gagal mengambil daftar percakapan.",
      error: err.message,
    });
  }
};

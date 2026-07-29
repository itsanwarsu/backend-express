const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const { getIO } = require("../socket/socket");

// Kirim pesan
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, text, productId } = req.body;

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user.id,
      text: text || "",
      product: productId || null, // Lampirkan ID produk jika ada
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text || "Mengirimkan produk",
      lastSender: req.user.id,
      lastMessageAt: new Date(),
    });

    // Populate sender dan product
    const data = await Message.findById(message._id)
      .populate("sender", "name")
      .populate("product");

    // Kirim event socket real-time
    getIO().emit("newMessage", data);

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// Semua pesan dalam percakapan
exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      conversation: req.params.conversationId,
    })
      .populate("sender", "name")
      .populate("product") // Populate produk agar dirender pada timeline pesan di frontend
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};


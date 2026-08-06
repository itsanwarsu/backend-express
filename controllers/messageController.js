const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const { getIO, getOnlineSocketId } = require("../socket/socket");

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

    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        lastMessage: text || "Mengirimkan produk",
        lastSender: req.user.id,
        lastMessageAt: new Date(),
      },
      { new: true }
    );

    // Populate sender dan product
    const data = await Message.findById(message._id)
      .populate("sender", "name")
      .populate("product");

    // Kirim event socket hanya ke member percakapan ini,
    // bukan broadcast ke semua user yang sedang online.
    if (conversation) {
      conversation.members.forEach((memberId) => {
        const socketId = getOnlineSocketId(String(memberId));
        if (socketId) {
          getIO().to(socketId).emit("newMessage", data);
        }
      });
    }

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

// Tandai semua pesan dari lawan bicara di percakapan ini sebagai sudah dibaca
exports.markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Update hanya pesan yang BUKAN dari diri sendiri dan belum ditandai dibaca
    const result = await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        readBy: { $ne: userId },
      },
      { $addToSet: { readBy: userId } }
    );

    // Kalau ada pesan yang baru saja ditandai, beri tahu member lain (pengirim asli)
    // secara realtime supaya centang di sisi mereka langsung berubah jadi biru.
    if (result.modifiedCount > 0) {
      const conversation = await Conversation.findById(conversationId);

      if (conversation) {
        conversation.members.forEach((memberId) => {
          const idStr = String(memberId);
          if (idStr === String(userId)) return; // skip diri sendiri

          const socketId = getOnlineSocketId(idStr);
          if (socketId) {
            getIO().to(socketId).emit("messagesRead", {
              conversationId,
              readerId: userId,
            });
          }
        });
      }
    }

    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};


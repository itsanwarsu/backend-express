const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

/**
 * CREATE / GET CONVERSATION
 *
 * PostgreSQL:
 * - User
 * - Product
 *
 * MongoDB:
 * - Conversation
 *
 * MongoDB hanya menyimpan ID PostgreSQL.
 */
exports.createConversation = async (req, res) => {
  try {
    const senderId = Number(req.user.id);
    const receiverId = Number(req.body.receiverId);
    const productId = req.body.productId
      ? Number(req.body.productId)
      : null;

    // =========================
    // VALIDASI USER
    // =========================

    if (!Number.isInteger(senderId) || senderId <= 0) {
      return res.status(401).json({
        message: "User tidak valid.",
      });
    }

    if (!Number.isInteger(receiverId) || receiverId <= 0) {
      return res.status(400).json({
        message: "receiverId tidak valid.",
      });
    }

    if (senderId === receiverId) {
      return res.status(400).json({
        message: "Tidak dapat membuat percakapan dengan diri sendiri.",
      });
    }

    // =========================
    // VALIDASI PRODUCT
    // =========================

    if (
      productId !== null &&
      (!Number.isInteger(productId) || productId <= 0)
    ) {
      return res.status(400).json({
        message: "productId tidak valid.",
      });
    }

    // =========================
    // CARI CONVERSATION
    // =========================
    //
    // Percakapan dibuat berdasarkan
    // pasangan user.
    //
    // Produk hanya menjadi konteks.
    //

    let conversation = await Conversation.findOne({
      members: {
        $all: [senderId, receiverId],
      },
    });

    // =========================
    // CONVERSATION SUDAH ADA
    // =========================

    if (conversation) {
      // Kalau user sedang membuka produk tertentu,
      // update konteks produk.
      if (
        productId !== null &&
        conversation.productId !== productId
      ) {
        conversation.productId = productId;
        await conversation.save();
      }

      return res.status(200).json(conversation);
    }

    // =========================
    // BUAT CONVERSATION BARU
    // =========================

    conversation = await Conversation.create({
      members: [senderId, receiverId],
      productId,
      lastMessage: "",
      lastSender: null,
      lastMessageAt: new Date(),
    });

    return res.status(201).json(conversation);
  } catch (err) {
    console.error("Create Conversation Error:", err);

    return res.status(500).json({
      message: "Gagal membuat percakapan.",
      error: err.message,
    });
  }
};

/**
 * GET SEMUA CONVERSATION USER
 */
exports.getConversations = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        message: "User tidak valid.",
      });
    }

    const conversations = await Conversation.find({
      members: userId,
    }).sort({
      lastMessageAt: -1,
      updatedAt: -1,
    });

    const conversationIds = conversations.map(
      (conversation) => conversation._id
    );

    // =========================
    // HITUNG UNREAD
    // =========================

    const unreadCounts = await Message.aggregate([
      {
        $match: {
          conversation: {
            $in: conversationIds,
          },

          sender: {
            $ne: userId,
          },

          readBy: {
            $ne: userId,
          },
        },
      },

      {
        $group: {
          _id: "$conversation",
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const unreadMap = {};

    unreadCounts.forEach((item) => {
      unreadMap[item._id.toString()] = item.count;
    });

    // =========================
    // RESPONSE
    // =========================

    const result = conversations.map((conversation) => ({
      ...conversation.toObject(),

      unreadCount:
        unreadMap[conversation._id.toString()] || 0,
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error("Get Conversations Error:", err);

    return res.status(500).json({
      message: "Gagal mengambil daftar percakapan.",
      error: err.message,
    });
  }
};

/**
 * DELETE CONVERSATION
 */
exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = Number(req.user.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        message: "User tidak valid.",
      });
    }

    // =========================
    // CEK CONVERSATION
    // =========================

    const conversation = await Conversation.findOne({
      _id: conversationId,
      members: userId,
    });

    if (!conversation) {
      return res.status(404).json({
        message:
          "Percakapan tidak ditemukan atau kamu tidak memiliki akses.",
      });
    }

    // =========================
    // HAPUS PESAN
    // =========================

    await Message.deleteMany({
      conversation: conversationId,
    });

    // =========================
    // HAPUS CONVERSATION
    // =========================

    await Conversation.findByIdAndDelete(
      conversationId
    );

    return res.status(200).json({
      message: "Percakapan berhasil dihapus.",
      conversationId,
    });
  } catch (err) {
    console.error("Delete Conversation Error:", err);

    return res.status(500).json({
      message: "Gagal menghapus percakapan.",
      error: err.message,
    });
  }
};

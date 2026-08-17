const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

const {
  getIO,
  getOnlineSocketId,
} = require("../../socket/socket");

/**
 * KIRIM PESAN
 */
exports.sendMessage = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const {
      conversationId,
      text,
      productId,
    } = req.body;

    const parsedProductId =
      productId !== null &&
      productId !== undefined &&
      productId !== ""
        ? Number(productId)
        : null;

    // =========================
    // VALIDASI USER
    // =========================

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        message: "User tidak valid.",
      });
    }

    // =========================
    // VALIDASI CONVERSATION
    // =========================

    if (!conversationId) {
      return res.status(400).json({
        message: "conversationId wajib diisi.",
      });
    }

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
    // VALIDASI PRODUCT ID
    // =========================

    if (
      parsedProductId !== null &&
      (!Number.isInteger(parsedProductId) ||
        parsedProductId <= 0)
    ) {
      return res.status(400).json({
        message: "productId tidak valid.",
      });
    }

    // =========================
    // VALIDASI PESAN
    // =========================

    const cleanText =
      typeof text === "string"
        ? text.trim()
        : "";

    if (!cleanText && parsedProductId === null) {
      return res.status(400).json({
        message: "Pesan atau produk wajib diisi.",
      });
    }

    // =========================
    // BUAT MESSAGE
    // =========================

    const message = await Message.create({
      conversation: conversationId,
      sender: userId,
      text: cleanText,
      productId: parsedProductId,
      readBy: [userId],
    });

    // =========================
    // UPDATE CONVERSATION
    // =========================

    conversation.lastMessage =
      cleanText || "Mengirimkan produk";

    conversation.lastSender = userId;
    conversation.lastMessageAt = new Date();

    // Kalau ada produk, simpan juga sebagai
    // konteks produk terakhir.
    if (parsedProductId !== null) {
      conversation.productId = parsedProductId;
    }

    await conversation.save();

    // =========================
    // RESPONSE
    // =========================
    //
    // Tidak menggunakan populate.
    //
    // Frontend menerima:
    // sender = PostgreSQL user ID
    // productId = PostgreSQL product ID
    //

    const responseMessage = {
      ...message.toObject(),

      sender: userId,

      productId: parsedProductId,
    };

    // =========================
    // SOCKET REALTIME
    // =========================

    const io = getIO();

    if (io && conversation.members) {
      const senderId = String(userId);

      conversation.members.forEach((memberId) => {
        const memberIdString = String(memberId);

        // Jangan kirim kembali ke pengirim
        if (memberIdString === senderId) {
          return;
        }

        const socketId =
          getOnlineSocketId(memberIdString);

        if (socketId) {
          io.to(socketId).emit(
            "newMessage",
            responseMessage
          );
        }
      });
    }

    return res.status(201).json(responseMessage);
  } catch (err) {
    console.error("Send Message Error:", err);

    return res.status(500).json({
      message: "Gagal mengirim pesan.",
      error: err.message,
    });
  }
};

/**
 * GET SEMUA PESAN DALAM CONVERSATION
 */
exports.getMessages = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const { conversationId } = req.params;

    // =========================
    // VALIDASI USER
    // =========================

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        message: "User tidak valid.",
      });
    }

    // =========================
    // PASTIKAN USER MEMBER
    // =========================

    const conversation =
      await Conversation.findOne({
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
    // AMBIL MESSAGE
    // =========================

    const messages = await Message.find({
      conversation: conversationId,
    }).sort({
      createdAt: 1,
    });

    // =========================
    // RESPONSE
    // =========================

    const result = messages.map((message) => ({
      ...message.toObject(),

      sender: Number(message.sender),

      productId:
        message.productId !== null
          ? Number(message.productId)
          : null,
    }));

    return res.json(result);
  } catch (err) {
    console.error("Get Messages Error:", err);

    return res.status(500).json({
      message: "Gagal mengambil pesan.",
      error: err.message,
    });
  }
};

/**
 * MARK MESSAGE AS READ
 */
exports.markAsRead = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const { conversationId } = req.params;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        message: "User tidak valid.",
      });
    }

    // =========================
    // CEK CONVERSATION
    // =========================

    const conversation =
      await Conversation.findOne({
        _id: conversationId,
        members: userId,
      });

    if (!conversation) {
      return res.status(404).json({
        message: "Percakapan tidak ditemukan.",
      });
    }

    // =========================
    // UPDATE READ
    // =========================

    const result = await Message.updateMany(
      {
        conversation: conversationId,

        sender: {
          $ne: userId,
        },

        readBy: {
          $ne: userId,
        },
      },
      {
        $addToSet: {
          readBy: userId,
        },
      }
    );

    // =========================
    // SOCKET READ NOTIFICATION
    // =========================

    if (result.modifiedCount > 0) {
      const io = getIO();

      conversation.members.forEach((memberId) => {
        const memberIdString = String(memberId);

        if (memberIdString === String(userId)) {
          return;
        }

        const socketId =
          getOnlineSocketId(memberIdString);

        if (socketId) {
          io.to(socketId).emit(
            "messagesRead",
            {
              conversationId,
              readerId: userId,
            }
          );
        }
      });
    }

    return res.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("Mark As Read Error:", err);

    return res.status(500).json({
      message: "Gagal menandai pesan sebagai dibaca.",
      error: err.message,
    });
  }
};

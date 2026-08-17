const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const prisma = require("../../config/prisma");

const {
  getIO,
  getOnlineSocketId,
} = require("../../socket/socket");

// =====================================================
// KIRIM PESAN
// =====================================================

exports.sendMessage = async (req, res) => {
  try {
    const senderId = Number(req.user.id);

    const {
      conversationId,
      text,
      productId,
    } = req.body;

    // =========================
    // VALIDASI USER
    // =========================

    if (!Number.isInteger(senderId) || senderId <= 0) {
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

    const conversation =
      await Conversation.findOne({
        _id: conversationId,
        members: senderId,
      });

    if (!conversation) {
      return res.status(404).json({
        message:
          "Percakapan tidak ditemukan atau kamu tidak memiliki akses.",
      });
    }

    // =========================
    // VALIDASI PRODUCT
    // =========================

    let validProductId = null;

    if (productId !== null && productId !== undefined && productId !== "") {
      validProductId = Number(productId);

      if (
        !Number.isInteger(validProductId) ||
        validProductId <= 0
      ) {
        return res.status(400).json({
          message: "productId tidak valid.",
        });
      }

      // Cari product di PostgreSQL
      const product = await prisma.product.findUnique({
        where: {
          id: validProductId,
        },
      });

      if (!product) {
        return res.status(404).json({
          message: "Produk tidak ditemukan.",
        });
      }
    }

    // =========================
    // VALIDASI PESAN
    // =========================

    const messageText = typeof text === "string"
      ? text.trim()
      : "";

    if (!messageText && !validProductId) {
      return res.status(400).json({
        message: "Pesan atau produk harus diisi.",
      });
    }

    // =========================
    // SIMPAN MESSAGE
    // =========================

    const message = await Message.create({
      conversation: conversationId,
      sender: senderId,
      text: messageText,
      productId: validProductId,
      readBy: [],
    });

    // =========================
    // UPDATE CONVERSATION
    // =========================

    conversation.lastMessage =
      messageText || "Mengirimkan produk";

    conversation.lastSender = senderId;
    conversation.lastMessageAt = new Date();

    // Kalau pesan membawa produk,
    // update konteks conversation juga.
    if (validProductId) {
      conversation.productId = validProductId;
    }

    await conversation.save();

    // =========================
    // AMBIL USER DARI POSTGRESQL
    // =========================

    const sender = await prisma.user.findUnique({
      where: {
        id: senderId,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // =========================
    // AMBIL PRODUCT DARI POSTGRESQL
    // =========================

    let product = null;

    if (validProductId) {
      product = await prisma.product.findUnique({
        where: {
          id: validProductId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          stock: true,
          category: true,
          imageUrl: true,
          sellerId: true,
          isActive: true,
        },
      });
    }

    // =========================
    // RESPONSE UNTUK FRONTEND
    // =========================

    const data = {
      ...message.toObject(),

      sender: sender
        ? {
            id: sender.id,
            name: sender.name,
            email: sender.email,
          }
        : {
            id: senderId,
            name: "Pengguna",
          },

      product: product
        ? {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            stock: product.stock,
            category: product.category,
            imageUrl: product.imageUrl,
            sellerId: product.sellerId,
            isActive: product.isActive,
          }
        : null,
    };

    // =========================
    // SOCKET REALTIME
    // =========================

    const io = getIO();

    const senderIdString = String(senderId);

    conversation.members.forEach((memberId) => {
      const receiverIdString = String(memberId);

      // Jangan kirim kembali ke pengirim
      if (receiverIdString === senderIdString) {
        return;
      }

      const socketId =
        getOnlineSocketId(receiverIdString);

      if (socketId) {
        io.to(socketId).emit(
          "newMessage",
          data
        );
      }
    });

    return res.status(201).json(data);
  } catch (err) {
    console.error(
      "Send Message Error:",
      err
    );

    return res.status(500).json({
      message: "Gagal mengirim pesan.",
      error: err.message,
    });
  }
};

// =====================================================
// GET SEMUA PESAN
// =====================================================

exports.getMessages = async (req, res) => {
  try {
    const conversationId =
      req.params.conversationId;

    const userId = Number(req.user.id);

    // =========================
    // CEK AKSES
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
    // AMBIL PESAN MONGODB
    // =========================

    const messages = await Message.find({
      conversation: conversationId,
    }).sort({
      createdAt: 1,
    });

    // =========================
    // AMBIL SEMUA USER
    // =========================

    const userIds = [
      ...new Set(
        messages.map((message) =>
          Number(message.sender)
        )
      ),
    ];

    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: {
              id: {
                in: userIds,
              },
            },
            select: {
              id: true,
              name: true,
              email: true,
            },
          })
        : [];

    const userMap = {};

    users.forEach((user) => {
      userMap[user.id] = user;
    });

    // =========================
    // AMBIL SEMUA PRODUCT
    // =========================

    const productIds = [
      ...new Set(
        messages
          .map((message) => message.productId)
          .filter(
            (id) =>
              id !== null &&
              id !== undefined
          )
          .map(Number)
      ),
    ];

    const products =
      productIds.length > 0
        ? await prisma.product.findMany({
            where: {
              id: {
                in: productIds,
              },
            },
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              stock: true,
              category: true,
              imageUrl: true,
              sellerId: true,
              isActive: true,
            },
          })
        : [];

    const productMap = {};

    products.forEach((product) => {
      productMap[product.id] = product;
    });

    // =========================
    // GABUNG DATA
    // =========================

    const result = messages.map(
      (message) => ({
        ...message.toObject(),

        sender:
          userMap[message.sender] || {
            id: message.sender,
            name: "Pengguna",
          },

        product:
          message.productId
            ? productMap[message.productId] || null
            : null,
      })
    );

    return res.status(200).json(result);
  } catch (err) {
    console.error(
      "Get Messages Error:",
      err
    );

    return res.status(500).json({
      message: "Gagal mengambil pesan.",
      error: err.message,
    });
  }
};

// =====================================================
// MARK AS READ
// =====================================================

exports.markAsRead = async (req, res) => {
  try {
    const conversationId =
      req.params.conversationId;

    const userId = Number(req.user.id);

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
        message:
          "Percakapan tidak ditemukan.",
      });
    }

    // =========================
    // UPDATE READ
    // =========================

    const result =
      await Message.updateMany(
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
    // SOCKET
    // =========================

    if (result.modifiedCount > 0) {
      const io = getIO();

      conversation.members.forEach(
        (memberId) => {
          const memberIdString =
            String(memberId);

          if (
            memberIdString ===
            String(userId)
          ) {
            return;
          }

          const socketId =
            getOnlineSocketId(
              memberIdString
            );

          if (socketId) {
            io.to(socketId).emit(
              "messagesRead",
              {
                conversationId,
                readerId: userId,
              }
            );
          }
        }
      );
    }

    return res.status(200).json({
      success: true,
      modifiedCount:
        result.modifiedCount,
    });
  } catch (err) {
    console.error(
      "Mark As Read Error:",
      err
    );

    return res.status(500).json({
      message:
        "Gagal menandai pesan sebagai sudah dibaca.",
      error: err.message,
    });
  }
};

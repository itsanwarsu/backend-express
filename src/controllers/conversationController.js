const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const prisma = require("../../config/prisma");

/**
 * Ambil data User PostgreSQL berdasarkan ID
 */
const getUsersByIds = async (ids) => {
  const userIds = [
    ...new Set(
      ids
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
    ),
  ];

  if (userIds.length === 0) {
    return [];
  }

  return prisma.user.findMany({
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
  });
};

/**
 * Ambil data Product PostgreSQL berdasarkan ID
 */
const getProductById = async (productId) => {
  if (!productId) return null;

  return prisma.product.findUnique({
    where: {
      id: Number(productId),
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
};

/**
 * Format conversation MongoDB
 * + User PostgreSQL
 * + Product PostgreSQL
 */
const formatConversation = async (conversation) => {
  const data = conversation.toObject
    ? conversation.toObject()
    : conversation;

  // =========================
  // USER
  // =========================

  const users = await getUsersByIds(data.members || []);

  const userMap = new Map(
    users.map((user) => [user.id, user])
  );

  const members = (data.members || []).map((userId) => {
    const user = userMap.get(Number(userId));

    return (
      user || {
        id: Number(userId),
        name: "Pengguna",
        email: "",
      }
    );
  });

  // =========================
  // PRODUCT
  // =========================

  let product = null;

  if (data.productId) {
    product = await getProductById(data.productId);
  }

  return {
    ...data,

    members,

    product,
  };
};

/**
 * CREATE / GET CONVERSATION
 *
 * PostgreSQL:
 * - User
 * - Product
 *
 * MongoDB:
 * - Conversation
 */
exports.createConversation = async (req, res) => {
  try {
    const senderId = Number(req.user.id);
    const receiverId = Number(req.body.receiverId);

    const productId =
      req.body.productId !== undefined &&
      req.body.productId !== null &&
      req.body.productId !== ""
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
    // VALIDASI RECEIVER
    // =========================

    const receiver = await prisma.user.findUnique({
      where: {
        id: receiverId,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!receiver) {
      return res.status(404).json({
        message: "User penjual tidak ditemukan.",
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

    if (productId !== null) {
      const product = await prisma.product.findUnique({
        where: {
          id: productId,
        },
        select: {
          id: true,
          sellerId: true,
          name: true,
        },
      });

      if (!product) {
        return res.status(404).json({
          message: "Produk tidak ditemukan.",
        });
      }

      // Pastikan receiver memang seller produk tersebut
      if (Number(product.sellerId) !== receiverId) {
        return res.status(400).json({
          message: "User yang dipilih bukan penjual produk tersebut.",
        });
      }
    }

    // =========================
    // CARI CONVERSATION
    // =========================

    let conversation = await Conversation.findOne({
      members: {
        $all: [senderId, receiverId],
      },
    });

    // =========================
    // SUDAH ADA
    // =========================

    if (conversation) {
      if (
        productId !== null &&
        conversation.productId !== productId
      ) {
        conversation.productId = productId;
        await conversation.save();
      }

      const formatted = await formatConversation(conversation);

      return res.status(200).json(formatted);
    }

    // =========================
    // BUAT BARU
    // =========================

    conversation = await Conversation.create({
      members: [senderId, receiverId],
      productId,
      lastMessage: "",
      lastSender: null,
      lastMessageAt: new Date(),
    });

    const formatted = await formatConversation(conversation);

    return res.status(201).json(formatted);
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
    // UNREAD COUNT
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
    // FORMAT
    // =========================

    const result = await Promise.all(
      conversations.map(async (conversation) => {
        const formatted = await formatConversation(conversation);

        return {
          ...formatted,

          unreadCount:
            unreadMap[conversation._id.toString()] || 0,
        };
      })
    );

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
    // CEK ACCESS
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

    await Conversation.findByIdAndDelete(conversationId);

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

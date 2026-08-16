const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const prisma = require("../../config/prisma");
const mongoose = require("mongoose");

// ======================================================
// HELPER: PARSE USER ID
// ======================================================
const parseUserId = (id) => {
  const parsed = Number(id);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

// ======================================================
// HELPER: PARSE PRODUCT ID
// ======================================================
const parseProductId = (id) => {
  if (id === undefined || id === null || id === "") {
    return null;
  }

  const parsed = Number(id);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

// ======================================================
// HELPER: ENRICH CONVERSATIONS
//
// MongoDB menyimpan:
// members: [userId]
// product: productId
//
// PostgreSQL menyimpan detail User/Product.
// Jadi kita ambil detailnya melalui Prisma.
// ======================================================
const enrichConversations = async (conversations) => {
  if (!conversations || conversations.length === 0) {
    return [];
  }

  // ------------------------------------------
  // Ambil semua user ID dari conversations
  // ------------------------------------------
  const userIds = [
    ...new Set(
      conversations.flatMap((conversation) =>
        Array.isArray(conversation.members)
          ? conversation.members.map(Number)
          : []
      )
    ),
  ].filter((id) => Number.isInteger(id) && id > 0);

  // ------------------------------------------
  // Ambil semua product ID
  // ------------------------------------------
  const productIds = [
    ...new Set(
      conversations
        .map((conversation) => conversation.product)
        .filter(
          (id) =>
            id !== null &&
            id !== undefined &&
            Number.isInteger(Number(id))
        )
        .map(Number)
    ),
  ];

  // ------------------------------------------
  // Query PostgreSQL
  // ------------------------------------------
  const [users, products] = await Promise.all([
    userIds.length > 0
      ? prisma.user.findMany({
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
      : [],

    productIds.length > 0
      ? prisma.product.findMany({
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
            isActive: true,
            sellerId: true,
          },
        })
      : [],
  ]);

  // ------------------------------------------
  // Buat map agar lookup cepat
  // ------------------------------------------
  const userMap = new Map(
    users.map((user) => [user.id, user])
  );

  const productMap = new Map(
    products.map((product) => [product.id, product])
  );

  // ------------------------------------------
  // Gabungkan data MongoDB + PostgreSQL
  // ------------------------------------------
  return conversations.map((conversation) => {
    const data = conversation.toObject();

    const members = Array.isArray(data.members)
      ? data.members
          .map((userId) => userMap.get(Number(userId)))
          .filter(Boolean)
      : [];

    const product =
      data.product !== null && data.product !== undefined
        ? productMap.get(Number(data.product)) || null
        : null;

    return {
      ...data,

      members,

      product,

      // Supaya frontend tetap mudah menggunakan ID
      memberIds: data.members || [],

      productId:
        data.product !== null && data.product !== undefined
          ? Number(data.product)
          : null,
    };
  });
};

// ======================================================
// CREATE CONVERSATION
// ======================================================
exports.createConversation = async (req, res) => {
  try {
    const senderId = parseUserId(req.user.id);
    const receiverId = parseUserId(req.body.receiverId);
    const productId = parseProductId(req.body.productId);

    // ------------------------------------------
    // Validasi sender
    // ------------------------------------------
    if (!senderId) {
      return res.status(401).json({
        message: "User login tidak valid.",
      });
    }

    // ------------------------------------------
    // Validasi receiver
    // ------------------------------------------
    if (!receiverId) {
      return res.status(400).json({
        message: "receiverId wajib diisi.",
      });
    }

    // ------------------------------------------
    // Tidak boleh chat dengan diri sendiri
    // ------------------------------------------
    if (senderId === receiverId) {
      return res.status(400).json({
        message: "Tidak dapat membuat percakapan dengan diri sendiri.",
      });
    }

    // ------------------------------------------
    // Pastikan receiver ada di PostgreSQL
    // ------------------------------------------
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
        message: "User penerima tidak ditemukan.",
      });
    }

    // ------------------------------------------
    // Jika productId dikirim,
    // pastikan product ada di PostgreSQL
    // ------------------------------------------
    let product = null;

    if (productId) {
      product = await prisma.product.findUnique({
        where: {
          id: productId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          stock: true,
          category: true,
          imageUrl: true,
          isActive: true,
          sellerId: true,
        },
      });

      if (!product) {
        return res.status(404).json({
          message: "Produk tidak ditemukan.",
        });
      }
    }

    // ------------------------------------------
    // Cari conversation yang sudah ada
    // ------------------------------------------
    let conversation = await Conversation.findOne({
      members: {
        $all: [senderId, receiverId],
      },
    });

    // ------------------------------------------
    // Jika sudah ada
    // ------------------------------------------
    if (conversation) {
      let shouldUpdate = false;

      // Update product context jika product baru diberikan
      if (
        productId &&
        Number(conversation.product) !== Number(productId)
      ) {
        conversation.product = productId;
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        await conversation.save();
      }

      const enriched = await enrichConversations([
        conversation,
      ]);

      return res.status(200).json(enriched[0]);
    }

    // ------------------------------------------
    // Buat conversation baru
    // ------------------------------------------
    conversation = await Conversation.create({
      members: [senderId, receiverId],
      product: productId,
      lastMessage: "",
      lastSender: null,
      lastMessageAt: new Date(),
    });

    // ------------------------------------------
    // Ambil kembali + enrich
    // ------------------------------------------
    const enriched = await enrichConversations([
      conversation,
    ]);

    return res.status(201).json(enriched[0]);
  } catch (err) {
    console.error("Create Conversation Error:", err);

    return res.status(500).json({
      message: "Gagal membuat percakapan.",
      error: err.message,
    });
  }
};

// ======================================================
// GET CONVERSATIONS
// ======================================================
exports.getConversations = async (req, res) => {
  try {
    const userId = parseUserId(req.user.id);

    if (!userId) {
      return res.status(401).json({
        message: "User login tidak valid.",
      });
    }

    // ------------------------------------------
    // Ambil conversation dari MongoDB
    // ------------------------------------------
    const conversations = await Conversation.find({
      members: userId,
    }).sort({
      lastMessageAt: -1,
      updatedAt: -1,
    });

    // ------------------------------------------
    // Jika tidak ada conversation
    // ------------------------------------------
    if (conversations.length === 0) {
      return res.status(200).json([]);
    }

    // ------------------------------------------
    // Hitung unread message
    // ------------------------------------------
    const conversationIds = conversations.map(
      (conversation) => conversation._id
    );

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

    // ------------------------------------------
    // Buat map unread count
    // ------------------------------------------
    const unreadMap = {};

    unreadCounts.forEach((item) => {
      unreadMap[item._id.toString()] = item.count;
    });

    // ------------------------------------------
    // Gabungkan MongoDB + PostgreSQL
    // ------------------------------------------
    const enrichedConversations =
      await enrichConversations(conversations);

    // ------------------------------------------
    // Tambahkan unreadCount
    // ------------------------------------------
    const result = enrichedConversations.map(
      (conversation) => ({
        ...conversation,

        unreadCount:
          unreadMap[conversation._id.toString()] || 0,
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

// ======================================================
// DELETE CONVERSATION
// ======================================================
exports.deleteConversation = async (req, res) => {
  try {
    const userId = parseUserId(req.user.id);
    const { conversationId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "User login tidak valid.",
      });
    }

    // ------------------------------------------
    // Validasi ObjectId MongoDB
    // ------------------------------------------
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        message: "conversationId tidak valid.",
      });
    }

    // ------------------------------------------
    // Pastikan conversation milik user
    // ------------------------------------------
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

    // ------------------------------------------
    // Hapus semua message
    // ------------------------------------------
    await Message.deleteMany({
      conversation: conversationId,
    });

    // ------------------------------------------
    // Hapus conversation
    // ------------------------------------------
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

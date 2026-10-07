const prisma = require("../../config/prisma");

const userSelect = { id: true, name: true, email: true };

const productSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  stock: true,
  category: true,
  imageUrl: true,
  sellerId: true,
  isActive: true,
};

const conversationInclude = {
  members: { include: { user: { select: userSelect } } },
  product: { select: productSelect },
};

// Format agar sama dengan respons lama (termasuk alias _id untuk frontend)
const formatConversation = (c) => ({
  _id: c.id,
  id: c.id,
  members: c.members.map((m) => m.user),
  productId: c.productId,
  product: c.product || null,
  lastMessage: c.lastMessage,
  lastSender: c.lastSenderId,
  lastMessageAt: c.lastMessageAt,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

// CREATE / GET CONVERSATION
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

    if (!Number.isInteger(senderId) || senderId <= 0) {
      return res.status(401).json({ message: "User tidak valid." });
    }

    if (!Number.isInteger(receiverId) || receiverId <= 0) {
      return res.status(400).json({ message: "receiverId tidak valid." });
    }

    if (senderId === receiverId) {
      return res.status(400).json({
        message: "Tidak dapat membuat percakapan dengan diri sendiri.",
      });
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });

    if (!receiver) {
      return res.status(404).json({ message: "User penjual tidak ditemukan." });
    }

    if (
      productId !== null &&
      (!Number.isInteger(productId) || productId <= 0)
    ) {
      return res.status(400).json({ message: "productId tidak valid." });
    }

    if (productId !== null) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, sellerId: true },
      });

      if (!product) {
        return res.status(404).json({ message: "Produk tidak ditemukan." });
      }

      if (Number(product.sellerId) !== receiverId) {
        return res.status(400).json({
          message: "User yang dipilih bukan penjual produk tersebut.",
        });
      }
    }

    // Cari percakapan yang anggotanya sender DAN receiver
    let conversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          { members: { some: { userId: senderId } } },
          { members: { some: { userId: receiverId } } },
        ],
      },
      include: conversationInclude,
    });

    if (conversation) {
      if (productId !== null && conversation.productId !== productId) {
        conversation = await prisma.conversation.update({
          where: { id: conversation.id },
          data: { productId },
          include: conversationInclude,
        });
      }

      return res.status(200).json(formatConversation(conversation));
    }

    conversation = await prisma.conversation.create({
      data: {
        productId,
        members: {
          create: [{ userId: senderId }, { userId: receiverId }],
        },
      },
      include: conversationInclude,
    });

    return res.status(201).json(formatConversation(conversation));
  } catch (err) {
    console.error("Create Conversation Error:", err);
    return res.status(500).json({ message: "Gagal membuat percakapan." });
  }
};

// GET SEMUA CONVERSATION USER
exports.getConversations = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ message: "User tidak valid." });
    }

    const conversations = await prisma.conversation.findMany({
      where: { members: { some: { userId } } },
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
      include: conversationInclude,
    });

    const ids = conversations.map((c) => c.id);

    // Hitung pesan belum dibaca per percakapan
    const unreadCounts = ids.length
      ? await prisma.message.groupBy({
          by: ["conversationId"],
          where: {
            conversationId: { in: ids },
            senderId: { not: userId },
            readBy: { none: { userId } },
          },
          _count: { _all: true },
        })
      : [];

    const unreadMap = {};
    unreadCounts.forEach((item) => {
      unreadMap[item.conversationId] = item._count._all;
    });

    const result = conversations.map((c) => ({
      ...formatConversation(c),
      unreadCount: unreadMap[c.id] || 0,
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error("Get Conversations Error:", err);
    return res
      .status(500)
      .json({ message: "Gagal mengambil daftar percakapan." });
  }
};

// DELETE CONVERSATION (pesan ikut terhapus lewat onDelete: Cascade)
exports.deleteConversation = async (req, res) => {
  try {
    const conversationId = Number(req.params.conversationId);
    const userId = Number(req.user.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ message: "User tidak valid." });
    }

    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({ message: "conversationId tidak valid." });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, members: { some: { userId } } },
      select: { id: true },
    });

    if (!conversation) {
      return res.status(404).json({
        message: "Percakapan tidak ditemukan atau kamu tidak memiliki akses.",
      });
    }

    await prisma.conversation.delete({ where: { id: conversationId } });

    return res.status(200).json({
      message: "Percakapan berhasil dihapus.",
      conversationId,
    });
  } catch (err) {
    console.error("Delete Conversation Error:", err);
    return res.status(500).json({ message: "Gagal menghapus percakapan." });
  }
};

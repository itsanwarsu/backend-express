const prisma = require("../../config/prisma");
const { getIO, getOnlineSocketId } = require("../../socket/socket");

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

// Cek apakah user anggota percakapan; kembalikan percakapan + daftar anggota
const findAccessibleConversation = (conversationId, userId) =>
  prisma.conversation.findFirst({
    where: { id: conversationId, members: { some: { userId } } },
    include: { members: { select: { userId: true } } },
  });

// Format pesan agar sama dengan respons lama (alias _id untuk frontend)
const formatMessage = (m) => ({
  _id: m.id,
  id: m.id,
  conversation: m.conversationId,
  conversationId: m.conversationId,
  sender: m.sender,
  text: m.text || "",
  image: m.image,
  productId: m.productId,
  product: m.product || null,
  readBy: (m.readBy || []).map((r) => r.userId),
  createdAt: m.createdAt,
  updatedAt: m.updatedAt,
});

const messageInclude = {
  sender: { select: userSelect },
  product: { select: productSelect },
  readBy: { select: { userId: true } },
};

// KIRIM PESAN
exports.sendMessage = async (req, res) => {
  try {
    const senderId = Number(req.user.id);
    const conversationId = Number(req.body.conversationId);
    const { text, productId } = req.body;

    if (!Number.isInteger(senderId) || senderId <= 0) {
      return res.status(401).json({ message: "User tidak valid." });
    }

    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({ message: "conversationId wajib diisi." });
    }

    const conversation = await findAccessibleConversation(
      conversationId,
      senderId
    );

    if (!conversation) {
      return res.status(404).json({
        message: "Percakapan tidak ditemukan atau kamu tidak memiliki akses.",
      });
    }

    let validProductId = null;

    if (productId !== null && productId !== undefined && productId !== "") {
      validProductId = Number(productId);

      if (!Number.isInteger(validProductId) || validProductId <= 0) {
        return res.status(400).json({ message: "productId tidak valid." });
      }

      const product = await prisma.product.findUnique({
        where: { id: validProductId },
        select: { id: true },
      });

      if (!product) {
        return res.status(404).json({ message: "Produk tidak ditemukan." });
      }
    }

    const messageText = typeof text === "string" ? text.trim() : "";

    if (!messageText && !validProductId) {
      return res
        .status(400)
        .json({ message: "Pesan atau produk harus diisi." });
    }

    // Simpan pesan + update percakapan dalam satu transaksi
    const lastMessage = (messageText || "Mengirimkan produk").slice(0, 500);

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId,
          senderId,
          text: messageText,
          productId: validProductId,
        },
        include: messageInclude,
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessage,
          lastSenderId: senderId,
          lastMessageAt: new Date(),
          ...(validProductId ? { productId: validProductId } : {}),
        },
      }),
    ]);

    const data = formatMessage(message);

    // Socket realtime ke anggota lain
    const io = getIO();

    conversation.members.forEach(({ userId }) => {
      if (userId === senderId) return;

      const socketId = getOnlineSocketId(String(userId));

      if (socketId) {
        io.to(socketId).emit("newMessage", data);
      }
    });

    return res.status(201).json(data);
  } catch (err) {
    console.error("Send Message Error:", err);
    return res.status(500).json({ message: "Gagal mengirim pesan." });
  }
};

// GET SEMUA PESAN
exports.getMessages = async (req, res) => {
  try {
    const conversationId = Number(req.params.conversationId);
    const userId = Number(req.user.id);

    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({ message: "conversationId tidak valid." });
    }

    const conversation = await findAccessibleConversation(
      conversationId,
      userId
    );

    if (!conversation) {
      return res.status(404).json({
        message: "Percakapan tidak ditemukan atau kamu tidak memiliki akses.",
      });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      include: messageInclude,
    });

    return res.status(200).json(messages.map(formatMessage));
  } catch (err) {
    console.error("Get Messages Error:", err);
    return res.status(500).json({ message: "Gagal mengambil pesan." });
  }
};

// MARK AS READ
exports.markAsRead = async (req, res) => {
  try {
    const conversationId = Number(req.params.conversationId);
    const userId = Number(req.user.id);

    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({ message: "conversationId tidak valid." });
    }

    const conversation = await findAccessibleConversation(
      conversationId,
      userId
    );

    if (!conversation) {
      return res.status(404).json({ message: "Percakapan tidak ditemukan." });
    }

    // Pesan dari orang lain yang belum dibaca user ini
    const unread = await prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readBy: { none: { userId } },
      },
      select: { id: true },
    });

    if (unread.length > 0) {
      await prisma.messageRead.createMany({
        data: unread.map((m) => ({ messageId: m.id, userId })),
        skipDuplicates: true,
      });

      const io = getIO();

      conversation.members.forEach(({ userId: memberId }) => {
        if (memberId === userId) return;

        const socketId = getOnlineSocketId(String(memberId));

        if (socketId) {
          io.to(socketId).emit("messagesRead", {
            conversationId,
            readerId: userId,
          });
        }
      });
    }

    return res.status(200).json({
      success: true,
      modifiedCount: unread.length,
    });
  } catch (err) {
    console.error("Mark As Read Error:", err);
    return res.status(500).json({
      message: "Gagal menandai pesan sebagai sudah dibaca.",
    });
  }
};

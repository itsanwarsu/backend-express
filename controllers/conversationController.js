const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

exports.createConversation = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user.id;

    if (!receiverId) {
      return res.status(400).json({
        message: "receiverId wajib diisi.",
      });
    }

    if (senderId === receiverId) {
      return res.status(400).json({
        message: "Tidak dapat membuat percakapan dengan diri sendiri.",
      });
    }

    // 1. Cari percakapan murni berdasarkan anggota (pembeli & penjual)
    let conversation = await Conversation.findOne({
      members: { $all: [senderId, receiverId] },
    }).populate("members", "name email");

    // 2. Jika percakapan sudah ada, langsung kembalikan data percakapan tersebut
    if (conversation) {
      return res.status(200).json(conversation);
    }

    // 3. Jika belum pernah ada, buat dokumen percakapan baru
    conversation = await Conversation.create({
      members: [senderId, receiverId],
    });

    conversation = await Conversation.findById(conversation._id).populate(
      "members",
      "name email"
    );

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
    const userId = req.user.id;

    const conversations = await Conversation.find({
      members: userId,
    })
      .populate("members", "name email")
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    // Hitung unread count per percakapan dalam satu query (lebih efisien
    // daripada query terpisah untuk tiap percakapan)
    const conversationIds = conversations.map((c) => c._id);

    const unreadCounts = await Message.aggregate([
      {
        $match: {
          conversation: { $in: conversationIds },
          sender: { $ne: userId },
          readBy: { $ne: userId },
        },
      },
      {
        $group: {
          _id: "$conversation",
          count: { $sum: 1 },
        },
      },
    ]);

    // Ubah hasil aggregate jadi map { conversationId: count }
    const unreadMap = {};
    unreadCounts.forEach((item) => {
      unreadMap[item._id.toString()] = item.count;
    });

    // Sisipkan unreadCount ke tiap percakapan
    const result = conversations.map((c) => ({
      ...c.toObject(),
      unreadCount: unreadMap[c._id.toString()] || 0,
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

exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // 1. Cek apakah percakapan ada dan user merupakan anggota percakapan
    const conversation = await Conversation.findOne({
      _id: conversationId,
      members: userId,
    });

    if (!conversation) {
      return res.status(404).json({
        message: "Percakapan tidak ditemukan atau kamu tidak memiliki akses.",
      });
    }

    // 2. Hapus semua pesan dalam percakapan tersebut
    await Message.deleteMany({ conversation: conversationId });

    // 3. Hapus percakapan
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


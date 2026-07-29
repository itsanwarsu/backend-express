const Conversation = require("../models/Conversation");

exports.createConversation = async (req, res) => {
  try {
    const { receiverId, productId } = req.body;
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

    // 1. Cari percakapan berdasarkan anggota (pembeli & penjual) SAJA
    let conversation = await Conversation.findOne({
      members: { $all: [senderId, receiverId] },
    })
      .populate("members", "name email")
      .populate("product");

    // 2. Jika percakapan sudah ada
    if (conversation) {
      // (Opsional) Update produk ke produk terbaru yang ditanyakan jika ada productId
      if (productId && String(conversation.product?._id) !== String(productId)) {
        conversation.product = productId;
        await conversation.save();
        await conversation.populate("product");
      }

      return res.status(200).json(conversation);
    }

    // 3. Jika belum pernah ada percakapan sama sekali, buat baru
    conversation = await Conversation.create({
      members: [senderId, receiverId],
      product: productId || null,
    });

    conversation = await Conversation.findById(conversation._id)
      .populate("members", "name email")
      .populate("product");

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
    const conversations = await Conversation.find({
      members: req.user.id,
    })
      .populate("members", "name email")
      .populate("product")
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    return res.status(200).json(conversations);
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


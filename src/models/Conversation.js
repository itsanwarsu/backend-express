const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    // ID User dari PostgreSQL
    members: [
      {
        type: Number,
        required: true,
      },
    ],

    // ID Product dari PostgreSQL
    productId: {
      type: Number,
      default: null,
    },

    lastMessage: {
      type: String,
      default: "",
    },

    // ID User PostgreSQL yang mengirim pesan terakhir
    lastSender: {
      type: Number,
      default: null,
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Mempermudah pencarian percakapan berdasarkan user
conversationSchema.index({ members: 1 });

// Mempermudah pencarian berdasarkan produk
conversationSchema.index({ productId: 1 });

module.exports = mongoose.model("Conversation", conversationSchema);

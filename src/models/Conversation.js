const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    members: [
      {
        type: Number,
        required: true,
      },
    ],

    product: {
      type: Number,
      default: null,
    },

    lastMessage: {
      type: String,
      default: "",
    },

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

module.exports = mongoose.model("Conversation", conversationSchema);

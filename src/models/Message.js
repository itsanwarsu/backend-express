const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // ID Conversation MongoDB
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    // ID User PostgreSQL
    sender: {
      type: Number,
      required: true,
      index: true,
    },

    text: {
      type: String,
      trim: true,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    // ID Product PostgreSQL
    productId: {
      type: Number,
      default: null,
      index: true,
    },

    // ID User PostgreSQL yang sudah membaca pesan
    readBy: [
      {
        type: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

messageSchema.index({
  conversation: 1,
  createdAt: 1,
});

module.exports = mongoose.model("Message", messageSchema);

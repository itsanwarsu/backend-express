const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // 👈 Memastikan 1 user hanya punya 1 dokumen Cart
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: [true, "Product ID wajib diisi"], // 👈 Mencegah item kosong
        },
        quantity: {
          type: Number,
          default: 1,
          min: [1, "Quantity minimal adalah 1"], // 👈 Mencegah angka 0 atau negatif
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Cart", CartSchema);


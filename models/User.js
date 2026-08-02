const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true, // Opsional: memastikan email selalu tersimpan dalam huruf kecil
      trim: true,
    },
    password: {
      type: String,
    },
googleId: {
  type: String,
  unique: true,
  sparse: true,
},
provider: {
  type: String,
  enum: ["local", "google"],
  default: "local",
},
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Hash password sebelum disimpan
UserSchema.pre("save", async function (next) {
  if (!this.password) return next();

  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});
// Method tambahan untuk membandingkan password saat login
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);


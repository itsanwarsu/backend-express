const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Cek email sudah terdaftar
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email sudah terdaftar",
      });
    }

    // Buat user baru
    const user = new User({
      name,
      email,
      password,
      role: "user",
    });

    // Password akan otomatis di-hash oleh middleware pre("save")
    await user.save();

    res.status(201).json({
      message: "Pendaftaran berhasil",
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Cari user berdasarkan email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Email atau password salah",
      });
    }

    // Cek password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Email atau password salah",
      });
    }

    // Buat JWT
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Kirim response
    res.status(200).json({
      message: "Login berhasil",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.profile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User tidak ditemukan",
      });
    }

    res.status(200).json({
      user,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

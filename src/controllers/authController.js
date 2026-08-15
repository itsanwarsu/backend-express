const prisma = require("../../config/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ================= CREATE JWT =================
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Cek apakah email sudah digunakan
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email sudah terdaftar",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Buat user di PostgreSQL
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        provider: "local",
        role: "user",
      },
    });

    res.status(201).json({
      message: "Pendaftaran berhasil",
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Cari user di PostgreSQL
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    // User tidak ada atau akun Google tidak memiliki password
    if (!user || !user.password) {
      return res.status(400).json({
        message: "Email atau password salah",
      });
    }

    // Bandingkan password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Email atau password salah",
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      message: "Login berhasil",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// ================= GOOGLE CALLBACK =================
exports.googleCallback = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Autentikasi Google gagal",
      });
    }

    const token = generateToken(user);

    res.redirect(
      `https://ecommerce-app-sage-alpha.vercel.app/google-success?token=${token}`
    );
  } catch (error) {
    console.error("Google callback error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// ================= PROFILE =================
exports.profile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        googleId: true,
        provider: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User tidak ditemukan",
      });
    }

    res.status(200).json({
      user,
    });
  } catch (error) {
    console.error("Profile error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

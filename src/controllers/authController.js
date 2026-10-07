const prisma = require("../../config/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET belum diset di .env");
}

const FRONTEND_URL = (
  process.env.FRONTEND_URL || "https://sealens.duckdns.org"
).replace(/\/+$/, "");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

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
    const { name, password } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Nama, email, dan password wajib diisi",
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        message: "Format email tidak valid",
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        message: "Password minimal 8 karakter",
      });
    }

    // Cek apakah email sudah digunakan
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email sudah terdaftar",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Buat user di MySQL
    await prisma.user.create({
      data: {
        name: name.trim(),
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
    // P2002 = unique constraint (email didaftarkan bersamaan)
    if (error.code === "P2002") {
      return res.status(400).json({
        message: "Email sudah terdaftar",
      });
    }

    console.error("Register error:", error);

    res.status(500).json({
      message: "Terjadi kesalahan pada server",
    });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!email || !password || typeof password !== "string") {
      return res.status(400).json({
        message: "Email dan password wajib diisi",
      });
    }

    // Cari user di MySQL
    const user = await prisma.user.findUnique({
      where: { email },
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
      message: "Terjadi kesalahan pada server",
    });
  }
};

// ================= GOOGLE CALLBACK =================
exports.googleCallback = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.redirect(`${FRONTEND_URL}/login?error=google_failed`);
    }

    const token = generateToken(user);

    res.redirect(
      `${FRONTEND_URL}/google-success?token=${encodeURIComponent(token)}`
    );
  } catch (error) {
    console.error("Google callback error:", error);

    res.redirect(`${FRONTEND_URL}/login?error=server_error`);
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
      message: "Terjadi kesalahan pada server",
    });
  }
};

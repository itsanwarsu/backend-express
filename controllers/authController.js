const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


// ================= CREATE JWT =================
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
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

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email sudah terdaftar",
      });
    }


    const user = new User({
      name,
      email,
      password,
      role: "user",
    });


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


    const user = await User.findOne({ email });


    if (!user) {
      return res.status(400).json({
        message: "Email atau password salah",
      });
    }


    const isMatch = await bcrypt.compare(
      password,
      user.password
    );


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



// ================= GOOGLE CALLBACK =================
exports.googleCallback = async (req, res) => {
  try {

    // Data user dari Passport Google
    const {
      id,
      displayName,
      emails
    } = req.user;


    const email = emails[0].value;


    // Cari user berdasarkan googleId atau email
    let user = await User.findOne({
      email,
    });


    // Jika user belum ada, buat baru
    if (!user) {

      user = await User.create({
        name: displayName,
        email,
        googleId: id,
        role: "user",
      });

    }


    // Generate JWT
    const token = generateToken(user);


    // Redirect ke frontend
    res.redirect(
      `http://localhost:5173/google-success?token=${token}`
    );


  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
};



// ================= PROFILE =================
exports.profile = async (req, res) => {
  try {

    const user = await User
      .findById(req.user.id)
      .select("-password");


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

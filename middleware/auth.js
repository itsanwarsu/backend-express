const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    // Ambil header Authorization
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      return res.status(401).json({
        message: "Token tidak ditemukan",
      });
    }

    // Format: Bearer <token>
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        message: "Token tidak valid",
      });
    }

    // Verifikasi JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Simpan data user ke request
    req.user = decoded;

    next();

  } catch (error) {
    return res.status(401).json({
      message: "Token tidak valid atau sudah kedaluwarsa",
    });
  }
};

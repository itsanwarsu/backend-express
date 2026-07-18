const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Mengambil token dari header 'Authorization'
    const authHeader = req.header('Authorization');
    
    // Format header biasanya: "Bearer <token>"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Akses ditolak, token tidak ada atau tidak valid" });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verifikasi token
        const terverifikasi = jwt.verify(token, process.env.JWT_SECRET);
        req.user = terverifikasi; // Menyimpan data user dari token ke objek request
        next(); // Lanjut ke fungsi utama route
    } catch (err) {
        res.status(403).json({ message: "Token kedaluwarsa atau tidak sah" });
    }
};


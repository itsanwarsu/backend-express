// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // Pastikan path ke model benar

// 1. ENDPOINT REGISTER
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const userBaru = new User({ username, password });
        await userBaru.save();
        res.status(201).json({ message: "User berhasil didaftarkan!" });
    } catch (err) {
// TAMBAHKAN BARIS INI untuk memunculkan error asli di terminal Termux
        console.error("🚨 ERROR REGISTRASI:", err.message); 
        
        res.status(400).json({ error: err.message });
    }
});

// 2. ENDPOINT LOGIN
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ message: "Username salah/tidak ditemukan" });

        const passwordCocok = await bcrypt.compare(password, user.password);
        if (!passwordCocok) return res.status(400).json({ message: "Password salah" });

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({ message: "Login berhasil!", token });
    } catch (err) {
// TAMBAHKAN BARIS INI untuk memunculkan error asli di terminal Termux
        console.error("🚨 ERROR REGISTRASI:", err.message); 
                res.status(500).json({ error: err.message });
    }
});

// WAJIB digarisbawahi: Ekspor router ini agar bisa dipanggil di server.js
module.exports = router;


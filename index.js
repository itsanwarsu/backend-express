require('dotenv').config(); // 1. Memuat variabel dari file .env
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth'); // Hubungkan routes auth.js
const hubungkanDB = require('./config/db'); // Import fungsi koneksi database
const productRoutes = require("./routes/product");
const cartRoutes = require("./routes/cart");

const app = express(); // 2. Inisialisasi 'app' HARUS di atas sebelum app.use apapun!
const PORT = process.env.PORT || 3000;

// 3. Pasang Middleware CORS dan Parsing JSON
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
}));

app.use(express.json());
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);

// 4. Jalankan middleware bypass ngrok
app.use((req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// 5. Jalankan Database dan Rute API
hubungkanDB();
app.use('/api/auth', authRoutes); 

// Endpoint Dasar
app.get('/', (req, res) => {
    res.send('Server Node.js & MongoDB Anda berjalan lancar.');
});

// 6. Menjalankan Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server aktif di port ${PORT}`);
});


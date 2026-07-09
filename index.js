const express = require('express');
const app = express();
const PORT = 3000;

// Middleware agar server bisa membaca JSON
app.use(express.json());

// Endpoint dasar (Route)
app.get('/', (req, res) => {
    res.send('Halo! Server Node.js Anda berhasil berjalan.');
});

// Menjalankan server
app.listen(PORT, () => {
    console.log(`Server aktif dan berjalan di http://localhost:${PORT}`);
});


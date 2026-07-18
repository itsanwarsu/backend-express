// config/db.js
const mongoose = require('mongoose');

const hubungkanDB = async () => {
  try {
    // Mengambil URI dari file .env
    const conn = await mongoose.connect(process.env.MONGO_URI);
    
    // Menampilkan pesan sukses beserta host database-nya
    console.log(`Database MongoDB Berhasil Terhubung: ${conn.connection.host} 🎉`);
  } catch (err) {
    console.error(`Gagal terhubung ke database: ${err.message}`);
    // Menghentikan aplikasi jika database gagal terhubung (opsional namun disarankan)
    process.exit(1); 
  }
};

// Ekspor fungsi agar bisa dipanggil di server.js
module.exports = hubungkanDB;


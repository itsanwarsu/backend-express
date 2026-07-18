const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

// Middleware Mongoose: Menggunakan Async/Await tanpa parameter next
UserSchema.pre('save', async function() {
    // Jika password tidak diubah, langsung keluar dari fungsi (Selesai)
    if (!this.isModified('password')) return;

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
        throw err; // Lempar error jika proses hashing gagal
    }
});

module.exports = mongoose.model('User', UserSchema);


let io;

// Menyimpan user yang sedang online
const onlineUsers = new Map();

const initializeSocket = (socketIO) => {
  io = socketIO;

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // User login ke socket
    socket.on("join", (userId) => {
      onlineUsers.set(userId, socket.id);

      console.log(`${userId} online`);

      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });

    // Kirim pesan realtime
    socket.on("sendMessage", (data) => {
      const receiverSocketId = onlineUsers.get(data.receiverId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receiveMessage", data);
      }
    });

    socket.on("disconnect", () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }

      io.emit("onlineUsers", Array.from(onlineUsers.keys()));

      console.log("User disconnected:", socket.id);
    });
  });
};

const getIO = () => io;

module.exports = {
  initializeSocket,
  getIO,
};

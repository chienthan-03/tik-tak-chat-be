const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const app = express();
const connectDB = require("./config/db");
const userRoutes = require("./routes/user.routes");
const chatRoutes = require("./routes/chat.routes");
const messageRoutes = require("./routes/message.routes");
const cors = require("cors");

const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const port = process.env.PORT;
// const path = require("path");

app.use(express.json()); //to accept JSON data
app.use(cors());

connectDB();

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

const server = app.listen(port, console.log(`Listen on post ${port}`));

app.use(notFound);
app.use(errorHandler);

const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
    // https://tiktak-gamma.vercel.app
  },
});

// Track online users
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("connected to socket.io");
  socket.on("setup", (userData) => {
    if (userData && userData._id) {
      socket.join(userData._id);
      console.log("setup:", userData._id);
      // Mark user as online
      onlineUsers.set(userData._id, socket.id);
      // Broadcast to all clients that this user is online
      io.emit("user_status_update", {
        userId: userData._id,
        status: "online"
      });
      // Send the current online users list to the newly connected user
      socket.emit("online_users", Array.from(onlineUsers.keys()));
      socket.emit("connected");
    }
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User joined room: ", room);
  });

  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  //call video
  socket.on("initiateCall", (data) => {
    console.log("Initiating call:", data);
    socket.to(data.to).emit("incomingCall", data);
  });

  socket.on("offer", (data) => {
    console.log("Offer received:", {
      to: data.to,
      from: data.from || socket.id,
      hasOffer: !!data.offer
    });
    socket.to(data.to).emit("offer", data);
    console.log("Offer forwarded to:", data.to);
  });

  socket.on("answer", (data) => {
    console.log("Answer received:", {
      to: data.to,
      from: data.from || socket.id,
      hasAnswer: !!data.answer
    });
    socket.to(data.to).emit("answer", data);
    console.log("Answer forwarded to:", data.to);
  });

  socket.on("candidate", (data) => {
    console.log("ICE candidate received:", {
      to: data.to,
      from: data.from || socket.id,
      candidateType: data.candidate?.candidate?.split(' ')[7] || 'unknown'
    });
    socket.to(data.to).emit("candidate", data);
    console.log("ICE candidate forwarded to:", data.to);
  });

  // Xử lý khi kết thúc cuộc gọi
  socket.on("endCall", (data) => {
    console.log("Call ended for:", data.to);
    socket.to(data.to).emit("callEnded", data);
  });

  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;
    if (!chat.users) return console.log("chat.users not defined");
    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;
      socket.in(user._id).emit("message recieved", newMessageRecieved); //gửi tin nhắn mới đến các user có phòng là idUser được tạo từ trước
    });
  });

  socket.on("disconnect", (reason) => {
    console.log("Disconnected due to:", reason);
    
    // Find the user who disconnected and remove from online users
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        // Broadcast to all clients that this user is offline
        io.emit("user_status_update", {
          userId: userId,
          status: "offline"
        });
        break;
      }
    }
  });
});


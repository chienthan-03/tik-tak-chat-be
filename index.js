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

io.on("connection", (socket) => {
  console.log("connected to socket.io");
  socket.on("setup", (userData) => {
    socket.join(userData._id); //kết nối 1 phòng riêng
    console.log(userData._id);
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User joined room: ", room);
  });

  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  //call video
  socket.on("offer", (data) => {
    socket.broadcast.emit("offer", data);
  });

  socket.on("answer", (data) => {
    socket.broadcast.emit("answer", data);
  });

  socket.on("candidate", (data) => {
    socket.broadcast.emit("candidate", data);
  });

  // Xử lý khi kết thúc cuộc gọi
  socket.on("endCall", () => {
    console.log("Call ended");
    io.emit("callEnded");
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
  });
});

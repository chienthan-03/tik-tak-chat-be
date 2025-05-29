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
const onlineUsers = new Map(); // userId -> Set of socketIds
const userSockets = new Map(); // socketId -> userId
// Track last active time for users
const lastActive = new Map(); // userId -> timestamp

io.on("connection", (socket) => {
  console.log("connected to socket.io");
  socket.on("setup", (userData) => {
    if (userData && userData._id) {
      socket.join(userData._id);
      console.log("setup:", userData._id);
      
      // Store the mapping of socket to user
      userSockets.set(socket.id, userData._id);
      
      // Add this socket to the user's set of connections
      if (!onlineUsers.has(userData._id)) {
        onlineUsers.set(userData._id, new Set([socket.id]));
        // Broadcast to all clients that this user is online
        io.emit("user_status_update", {
          userId: userData._id,
          status: "online",
          lastActive: lastActive.get(userData._id) || null,
        });
      } else {
        // Add this socket to existing connections
        onlineUsers.get(userData._id).add(socket.id);
      }
      
      // Send the current online users list to the newly connected user
      socket.emit("online_users", Array.from(onlineUsers.keys()));
      socket.emit("connected");
    }
  });
  
  // Handle explicit maintain online status requests
  socket.on("maintainOnlineStatus", (data) => {
    if (data && data.userId) {
      console.log("Maintaining online status for:", data.userId);
      // Ensure user stays marked as online
      if (!onlineUsers.has(data.userId)) {
        onlineUsers.set(data.userId, new Set());
        // Broadcast status update
        io.emit("user_status_update", {
          userId: data.userId,
          status: "online",
          lastActive: lastActive.get(data.userId) || null,
        });
      }
    }
  });

  // Allow clients to fetch last active time for a user
  socket.on("getLastActive", (userId, callback) => {
    callback(lastActive.get(userId) || null);
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User joined room: ", room);
  });

  socket.on("typing", (room) => {
    console.log("Server received typing event for room:", room);
    socket.to(room).emit("typing");
  });

  socket.on("stop typing", (room) => {
    console.log("Server received stop typing event for room:", room);
    socket.to(room).emit("stop typing");
  });

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
    
    // Get the userId associated with this socket
    const userId = userSockets.get(socket.id);
    if (userId) {
      // Remove this socket from the user's connections
      userSockets.delete(socket.id);
      
      if (onlineUsers.has(userId)) {
        const userConnections = onlineUsers.get(userId);
        userConnections.delete(socket.id);
        
        // Only mark user as offline if they have no more connections
        if (userConnections.size === 0) {
          onlineUsers.delete(userId);
          // Set last active time
          lastActive.set(userId, Date.now());
          // Broadcast offline status and last active
          io.emit("user_status_update", {
            userId: userId,
            status: "offline",
            lastActive: lastActive.get(userId),
          });
        }
      }
    }
  });
});


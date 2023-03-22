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
    origin: "http://localhost:3001",
    // credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("connected to socket.io");

  socket.on("disconnect", (reason) => {
    console.log("Disconnected due to:", reason);
  });
});

const asyncHandler = require("express-async-handler");
const Chat = require("../models/chat.models");
const Message = require("../models/message.model");
const User = require("../models/user.model");

const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId } = req.body;
  if (!content || !chatId) {
    res.status(400).send("Invalid data passed into request");
  }
  var newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
  };
  try {
    var message = await Message.create(newMessage);

    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, {
      latestMessage: message,
    });
    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// Gửi tin nhắn có ảnh
const sendImageMessage = asyncHandler(async (req, res) => {
  const { chatId, caption } = req.body;

  if (!chatId) {
    return res.status(400).json({ message: "Chat ID is required" });
  }

  if (!req.processedFile) {
    return res.status(400).json({ message: "No image file provided" });
  }

  try {
    const newMessage = {
      sender: req.user._id,
      content: caption || "", // Caption có thể rỗng
      chat: chatId,
      messageType: "image",
      imageUrl: req.processedFile.cloudinary_url,
      imageData: {
        filename: req.processedFile.filename,
        originalname: req.processedFile.originalname,
        size: req.processedFile.size,
        mimetype: req.processedFile.mimetype,
        public_id: req.processedFile.public_id, // Cloudinary public_id
      },
    };

    let message = await Message.create(newMessage);

    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });

    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: message,
    });

    res.json(message);
  } catch (error) {
    // Với Cloudinary, ảnh đã được upload nên không cần xóa local files
    // Có thể thêm logic xóa ảnh trên Cloudinary nếu cần thiết
    res.status(400);
    throw new Error(error.message);
  }
});

const allMessages = asyncHandler(async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name pic email")
      .populate("chat");
    res.status(200).json(messages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const deleteMessages = asyncHandler(async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (req.body.userId == message.sender._id && !message.isRemove) {
      message.isRemove = true;
      message.content = "messages was deleted";
      await message.save();
      const newMessages = await Message.findById(req.params.messageId);
      res.status(200).json(newMessages);
    }
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const getPaginatedMessages = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const skip = (page - 1) * pageSize;

    if (pageSize > 1000) {
      return res.status(400).json({ message: "Page size cannot exceed 1000" });
    }

    const totalMessages = await Message.countDocuments({
      chat: req.params.chatId,
    });

    if (skip >= totalMessages) {
      return res.status(200).json({
        messages: [],
        currentPage: page,
        pageSize,
        hasMore: false,
        totalMessages,
      });
    }

    let messages = await Message.find({ chat: req.params.chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate("sender", "name pic email")
      .populate("chat");

    messages = messages.reverse();
    const hasMore = skip + messages.length < totalMessages;

    res.status(200).json({
      messages,
      currentPage: page,
      pageSize,
      hasMore,
      totalMessages,
    });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const searchMessages = asyncHandler(async (req, res) => {
  try {
    const { query } = req.query;
    const chatId = req.params.chatId;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const messages = await Message.find({
      chat: chatId,
      content: { $regex: query, $options: "i" },
      isRemove: false,
    })
      .populate("sender", "name pic email")
      .populate("chat");

    res.status(200).json(messages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = {
  sendMessage,
  sendImageMessage,
  allMessages,
  deleteMessages,
  getPaginatedMessages,
  searchMessages,
};

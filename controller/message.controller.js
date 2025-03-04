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

    const adjustedSkip = Math.max(totalMessages - skip - pageSize, 0);

    const messages = await Message.find({ chat: req.params.chatId })
      .skip(adjustedSkip)
      .limit(pageSize)
      .populate("sender", "name pic email")
      .populate("chat");

    const hasMore = skip + pageSize < totalMessages;

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

module.exports = {
  sendMessage,
  allMessages,
  deleteMessages,
  getPaginatedMessages,
};

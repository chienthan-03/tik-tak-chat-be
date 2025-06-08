const mongoose = require("mongoose");

const messageModel = mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, trim: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
    isRemove: { type: Boolean, default: false },
    messageType: {
      type: String,
      enum: ["text", "image"],
      default: "text",
    },
    imageUrl: { type: String },
    imageData: {
      filename: { type: String },
      originalname: { type: String },
      size: { type: Number },
      mimetype: { type: String },
      public_id: { type: String }, // Cloudinary public_id để có thể xóa ảnh sau này
    },
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("Message", messageModel);

module.exports = Message;

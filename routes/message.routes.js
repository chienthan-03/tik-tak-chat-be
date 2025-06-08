const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  sendMessage,
  sendImageMessage,
  allMessages,
  deleteMessages,
  getPaginatedMessages,
  searchMessages,
} = require("../controller/message.controller");
const {
  upload,
  processImage,
  cleanupOnError,
} = require("../middleware/uploadMiddleware");
const router = express.Router();

router.route("/search/:chatId").get(protect, searchMessages);
router.route("/:chatId").get(protect, allMessages);
router.route("/paginated/:chatId").get(protect, getPaginatedMessages);
router.route("/remove/:messageId").put(protect, deleteMessages);
router.route("/").post(protect, sendMessage);
router
  .route("/image")
  .post(protect, upload, processImage, sendImageMessage, cleanupOnError);

module.exports = router;

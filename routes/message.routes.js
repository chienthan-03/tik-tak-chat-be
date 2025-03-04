const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  sendMessage,
  allMessages,
  deleteMessages,
  getPaginatedMessages,
} = require("../controller/message.controller");
const router = express.Router();

router.route("/:chatId").get(protect, allMessages);
router.route("/paginated/:chatId").get(protect, getPaginatedMessages);
router.route("/remove/:messageId").put(protect, deleteMessages);
router.route("/").post(protect, sendMessage);

module.exports = router;

const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  accessChat,
  fetChchat,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
} = require("../controller/chat.controller");
const router = express.Router();

router.route("/").post(protect, accessChat);
router.route("/").get(protect, fetChchat);
router.route("/group").post(protect, createGroupChat);
router.route("/rename").put(protect, renameGroup);
router.route("/groupAdd").put(protect, addToGroup);
router.route("/groupremove").put(protect, removeFromGroup);

module.exports = router;

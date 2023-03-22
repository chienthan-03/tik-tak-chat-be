const express = require("express");
const {
  registerUser,
  authUser,
  allUsers,
  editpassword,
  editprofile,
} = require("../controller/user.controller");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").post(registerUser).get(protect, allUsers);
router.post("/login", authUser);
router.route("/editPass").put(protect, editpassword);
router.route("/editProfile").put(protect, editprofile);

module.exports = router;

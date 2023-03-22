const asyncHandler = require("express-async-handler");
const generateToken = require("../config/generateToken");
const User = require("../models/user.model");
const bcrypt = require("bcryptjs");

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, pic } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please enter all the Field");
  }
  const userExits = await User.findOne({ email });

  if (userExits) {
    res.status(400);
    throw new Error("User already exists");
  }
  const user = await User.create({ name, email, password, pic });

  if (user) {
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      pic: user.pic,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("Failed to create user");
  }
});

const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      pic: user.pic,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error("Invalid Enter or Password");
  }
});
//  /api/users/?search
const allUsers = asyncHandler(async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          //$or ==> thỏa mãn tìm kiếm keyword = 1 trong 2 điều kiện
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};
  const users = await User.find(keyword).select("-password");
  res.send(users);
});

const editprofile = asyncHandler(async (req, res) => {
  const { pic, name, idUser } = req.body;
  if (!idUser) {
    res.status(400);
    throw new Error("Please enter all the Field");
  }
  const editUser = await User.findByIdAndUpdate(idUser, {
    pic: pic,
    name: name,
  }).select("-password");
  res.status(200).json(editUser);
});

const editpassword = asyncHandler(async (req, res) => {
  const { password, email, newPassword } = req.body;
  if (!password || !email || !newPassword) {
    res.status(400);
    throw new Error("Please enter all the Field");
  }
  const user = await User.findOne({ email });
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);
  if (user && (await user.matchPassword(password))) {
    const editUser = await User.findOneAndUpdate(
      { email: email },
      {
        $set: { password: passwordHash },
      },
      { new: true }
    ).select("-password");
    res.status(200).json(editUser);
  } else {
    res.status(401);
    throw new Error("Invalid Enter or Password");
  }
});

module.exports = {
  registerUser,
  authUser,
  allUsers,
  editpassword,
  editprofile,
};

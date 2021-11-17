const express = require("express");
const router = express.Router();
const User = require("../../model/usersDB");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

router.use(express.json());

const {
  validateSignupRequest,
  isRequestValidated,
  validateSigninRequest,
} = require("../../validators/auth");

const { requireSignin, adminMiddleware } = require("../../middleware");

const generateJwtToken = (_id, role) => {
  return jwt.sign({ _id, role }, process.env.JWT_SECRET_TOKEN_SECRET, {
    expiresIn: "1d",
  });
};

const signup = (req, res) => {
  User.findOne({ email: req.body.email }).exec(async (error, user) => {
    if (user) {
      return res.status(400).json({
        error: "Admin already registered",
      });
    }
    let role = "admin";
    const { username, email, password } = req.body;
    const hash_password = await bcrypt.hash(password, 10);
    const _user = new User({
      username,
      email,
      password: hash_password,
      role,
    });

    _user.save((error, user) => {
      if (error) {
        return res.status(400).json({
          message: error.message,
        });
      }

      if (user) {
        const token = generateJwtToken(user._id, user.role);
        const { _id, username, email, role } = user;
        return res.status(201).json({
          message: "Admin created Successfully!",
          token,
          user,
        });
      }
    });
  });
};

const signin = (req, res) => {
  User.findOne({ email: req.body.email }).exec(async (error, user) => {
    if (error) return res.status(400).json({ error });
    if (user) {
      const isPassword = await bcrypt.compare(req.body.password, user.password);
      if (isPassword && user.role === "admin") {
        const token = generateJwtToken(user._id, user.role);

        const { _id, username, email, role } = user;
        res.cookie("token", token, { expiresIn: "1d" });
        res.status(200).json({
          message: "Logged in as admin successfully",
          token,
          user: { _id, username, email, role },
        });
      } else {
        return res.status(400).json({
          message: "Invalid Password",
        });
      }
    } else {
      return res.status(400).json({ message: "Something went wrong" });
    }
  });
};

const signout = (req, res) => {
  res.clearCookie("token");
  res.status(200).json({
    message: "Signout successfully...!",
  });
};

// @route POST /signup
router.post("/admin/signup", validateSignupRequest, isRequestValidated, signup);

// @route POST /login
router.post("/admin/login", validateSigninRequest, isRequestValidated, signin);

// @route POST /login
router.post(
  "/admin/logout",
  isRequestValidated,
  requireSignin,
  adminMiddleware,
  signout
);

module.exports = router;

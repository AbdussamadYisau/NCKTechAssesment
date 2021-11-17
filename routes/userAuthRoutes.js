const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const UserModel = require("../model/usersDB");
const {
  validateSignupRequest,
  isRequestValidated,
  validateSigninRequest,
} = require("../validators/auth");
const { requireSignin, userMiddleware } = require("../middleware");

const generateJwtToken = (_id, role) => {
  return jwt.sign({ _id, role }, process.env.JWT_SECRET_TOKEN_SECRET, {
    expiresIn: "1d",
  });
};

const register = (req, res) => {
  UserModel.findOne({ email: req.body.email }).exec(async (error, user) => {
    if (user) {
      return res.status(400).json({
        error: "User already registered",
      });
    }
    const { username, email, password } = req.body;
    const hash_password = await bcrypt.hash(password, 10);
    const _user = new UserModel({
      username,
      email,
      password: hash_password,
    });

    _user.save((error, user) => {
      if (error) {
        return res.status(400).json({
          message: "Something went wrong",
        });
      }

      if (user) {
        const token = generateJwtToken(user._id, user.role);
        const { _id, username, email, role } = user;
        return res.status(201).json({
          message: "Signed up successfully",
          token,
          user: { _id, username, email, role },
        });
      }
    });
  });
};

const login = (req, res) => {
  UserModel.findOne({ email: req.body.email }).exec(async (error, user) => {
    if (error) return res.status(400).json({ error });
    if (user) {
      const isPassword = await bcrypt.compare(req.body.password, user.password);
      if (isPassword && user.role === "user") {
        const token = generateJwtToken(user._id, user.role);
        const { _id, username, email, role } = user;
        res.status(200).json({
          message: "Logged in successfully",
          token,
          user: { _id, username, email, role },
        });
      } else {
        return res.status(400).json({
          message: "Something went wrong",
        });
      }
    } else {
      return res.status(400).json({ message: "Something went wrong" });
    }
  });
};

const getAllUsers = (req, res) => {
  UserModel.find()
    .select("-password")
    .exec()
    .then((users) => {
      return res.status(200).json({
        users: users,
        count: users.length,
      });
    })
    .catch((error) => {
      return res.status(500).json({
        message: error.message,
        error,
      });
    });
};

const changePassword = async (req, res) => {
  const { userId, newPassword, confirmNewPassword, oldPassword } = req.body;

  try {
    const user = await UserModel.findById(userId);
    const validPassword = await bcrypt.compare(oldPassword, user.password);
    if (user && validPassword) {
      const comparedNewPassword = newPassword === confirmNewPassword;

      if (comparedNewPassword) {
        const hashPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashPassword;
        await user.save();
        return res.status(201).json({
          status: "success",
          message: "Password changed successfully",
        });
      }

      return res.status(400).json({
        status: "failed",
        message: "new password and confirm value are not same",
      });
    }

    return res.status(400).json({
      status: "failed",
      message: "Invalid password",
    });
  } catch (err) {
    res.status(400).json({
      status: "failed",
      message: err.message,
    });
  }
};

// @route POST /signup
router.post(
  "/users/signup",
  validateSignupRequest,
  isRequestValidated,
  register
);

// @route POST /login
router.post("/users/login", validateSigninRequest, isRequestValidated, login);

// @route GET /customers
router.get("/users/customers", getAllUsers);

// @route POST /changePassword
router.post(
  "/users/changePassword",
  requireSignin,
  userMiddleware,
  changePassword
);

module.exports = router;

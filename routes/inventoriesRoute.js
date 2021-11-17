const express = require("express");
const router = express.Router();
const {
  validatePostInventoriesRequest,
  isRequestValidated,
} = require("../validators/inventories");
const InventoriesModel = require("../model/inventoriesDB");
const {
  requireSignin,
  userMiddleware,
  adminMiddleware,
} = require("../middleware");

const getInventories = (req, res) => {
  InventoriesModel.find()
    .exec()
    .then((inventories) => {
      return res.status(200).json({
        message: "Inventories retrieved successfully",
        data: inventories,
        count: inventories.length,
      });
    })
    .catch((error) => {
      return res.status(500).json({
        message: "There was an error with this request",
        error: error.message,
      });
    });
};

const postInventories = async (req, res) => {
  const { name, price, quantity } = req.body;

  try {
    let inventoriesCheck = await InventoriesModel.findOne({
      name,
    });

    if (inventoriesCheck) {
      return res.status(400).json({
        message: "Inventory with this name already exists",
      });
    } else {
      inventoriesCheck = new InventoriesModel({
        name,
        price,
        quantity,
      });

      await inventoriesCheck.save();

      return res.status(200).json({
        message: "Inventory added successfully",
        data: inventoriesCheck,
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: "There's a problem with the server",
      error: error.message,
    });
  }
};

// @route GET /users/inventories
router.get(
  "/users/inventories",
  requireSignin,
  isRequestValidated,
  getInventories
);

// @route POST /admin/inventories
router.post(
  "/admin/inventories",
  validatePostInventoriesRequest,
  isRequestValidated,
  requireSignin,
  adminMiddleware,
  postInventories
);

module.exports = router;

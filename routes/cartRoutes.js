const Cart = require("../model/cartsDB");
const express = require("express");
const router = express.Router();
const {
  requireSignin,
  userMiddleware,
  adminMiddleware,
} = require("../middleware");
const InventoriesModel = require("../model/inventoriesDB");

function runUpdate(condition, updateData) {
  return new Promise((resolve, reject) => {
    //you update code here

    Cart.findOneAndUpdate(condition, updateData, { upsert: true })
      .then((result) => resolve())
      .catch((err) => reject(err));
  });
}

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

const addItemToCart = (req, res) => {
  Cart.findOne({ user: req.user._id }).exec((error, cart) => {
    if (error) return res.status(400).json({ error });
    if (cart) {
      //if cart already exists then update cart by quantity
      let promiseArray = [];

      const shoppingCart = req.body.cartItems;

      shoppingCart.forEach((cartItem) => {
        const inventory = cartItem.inventory;
        const item = cart.cartItems.find((c) => c.inventory == inventory);
        let condition, update;
        if (item) {
          condition = { user: req.user._id, "cartItems.inventory": inventory };
          update = {
            $set: {
              "cartItems.$": cartItem,
            },
          };
        } else {
          condition = { user: req.user._id };
          update = {
            $push: {
              cartItems: cartItem,
            },
          };
        }
        promiseArray.push(runUpdate(condition, update));
      });
      Promise.all(promiseArray)
        .then((response) => res.status(201).json({ response }))
        .catch((error) => res.status(400).json({ error }));
    } else {
      //if cart not exist then create a new cart
      const cart = new Cart({
        user: req.user._id,
        cartItems: req.body.cartItems,
      });
      cart.save((error, cart) => {
        if (error) return res.status(400).json({ error });
        if (cart) {
          return res.status(201).json({ cart });
        }
      });
    }
  });
};

const getCartItems = (req, res) => {
  Cart.findOne({ user: req.user._id })
    .populate("cartItems.inventory", "_id name price")
    .exec((error, cart) => {
      if (error) return res.status(400).json({ error });
      if (cart) {
        let cartItems = {};
        cart.cartItems.forEach((item, index) => {
          cartItems[item.inventory._id.toString()] = {
            _id: item.inventory._id.toString(),
            name: item.inventory.name,
            price: item.inventory.price,
            qty: item.quantity,
          };
        });
        res.status(200).json({ cartItems });
      }
    });
  //}
};

// new update remove cart items
const removeCartItems = (req, res) => {
  const { inventoryID } = req.body.payload;
  if (inventoryID) {
    Cart.update(
      { user: req.user._id },
      {
        $pull: {
          cartItems: {
            inventory: inventoryID,
          },
        },
      }
    ).exec((error, result) => {
      if (error) return res.status(400).json({ error });
      if (result) {
        res.status(202).json({ result });
      }
    });
  }
};

router.post("/users/add-to-cart", requireSignin, userMiddleware, addItemToCart);

router.get("/cart", requireSignin, userMiddleware, getCartItems);

module.exports = router;

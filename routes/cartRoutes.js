const Cart = require("../model/cartsDB");
const express = require("express");
const router = express.Router();
const { requireSignin, userMiddleware } = require("../middleware");
const InventoriesModel = require("../model/inventoriesDB");

function runUpdate(condition, updateData) {
  return new Promise((resolve, reject) => {
    //you update code here
    Cart.findOneAndUpdate(condition, updateData, { upsert: true })
      .then((result) => resolve())
      .catch((err) => reject(err));
  });
}

const addItemToCart = async (req, res) => {
  Cart.findOne({ user: req.user._id }).exec((error, cart) => {
    if (error) return res.status(400).json({ error });
    if (cart) {
      //if cart already exists then update cart by quantity
      let promiseArray = [];

      const shoppingCart = req.body.cartItems;

      shoppingCart.forEach(async (cartItem) => {
        const quantity = await InventoriesModel.findById(cartItem?.inventory);
        const initialCart = await Cart.findOne({ user: req.user._id });
        let initialQuantity = 0;

        for (let x in initialCart.cartItems) {
          if (initialCart.cartItems[x].inventory == cartItem.inventory) {
            initialQuantity = initialCart.cartItems[x].quantity;
          }
        }
        const updatedInventoryQuantity = quantity.quantity + initialQuantity;
        const newQuantity = updatedInventoryQuantity - cartItem.quantity;
        await InventoriesModel.updateOne(
          {
            quantity: quantity.quantity,
          },
          {
            $set: {
              quantity: newQuantity,
            },
          }
        );
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
        .then((response) => {
          res.status(201).json({
            message: "Added to cart sucessfully",
          });
        })
        .catch((error) => res.status(400).json({ error }));
    } else {
      //if cart not exist then create a new cart
      const shoppingCart = req.body.cartItems;
      const cart = new Cart({
        user: req.user._id,
        cartItems: shoppingCart,
      });
      cart.save((error, cart) => {
        if (error) return res.status(400).json({ error });
        if (cart) {
          return res.status(201).json({
            message: "Added to cart successfully",
            cart,
          });
        }
      });

      shoppingCart.forEach(async (cartItem) => {
        const quantity = await InventoriesModel.findById(cartItem?.inventory);

        const updatedInventoryQuantity = quantity.quantity;
        console.log("Updated Quantity", updatedInventoryQuantity);
        const newQuantity = updatedInventoryQuantity - cartItem.quantity;
        await InventoriesModel.updateOne(
          {
            quantity: quantity.quantity,
          },
          {
            $set: {
              quantity: newQuantity,
            },
          }
        );
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

router.get("/users/cart", requireSignin, userMiddleware, getCartItems);

module.exports = router;

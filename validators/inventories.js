const { check, validationResult } = require("express-validator");

exports.validatePostInventoriesRequest = [
  check("name").notEmpty().withMessage("Name is required"),
  check("price").notEmpty().withMessage("Price is required"),
  check("quantity").notEmpty().withMessage("Quantity is required"),
];

exports.isRequestValidated = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.array().length > 0) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

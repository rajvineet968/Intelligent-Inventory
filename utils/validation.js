const Joi = require("joi");

/* ---------------- PRODUCT VALIDATION ---------------- */
module.exports.productSchema = Joi.object({
    stockcode: Joi.string()
        .trim()
        .min(2)
        .max(50)
        .required()
        .messages({
            "string.empty": "StockCode is required",
            "string.min": "StockCode too short",
            "any.required": "StockCode is required"
        }),

    description: Joi.string()
        .trim()
        .min(3)
        .required()
        .messages({
            "string.empty": "Description is required"
        }),

    unit_price: Joi.number()
        .positive()
        .precision(2)
        .required()
        .messages({
            "number.base": "Price must be a number",
            "number.positive": "Price must be greater than 0"
        }),

    quantity: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            "number.base": "Quantity must be a number",
            "number.min": "Quantity cannot be negative"
        }),

    catid: Joi.number()
        .integer()
        .required()
        .messages({
            "any.required": "Category is required"
        })
});

/* ---------------- CART VALIDATION ---------------- */
module.exports.cartSchema = Joi.object({
    quantity: Joi.number()
        .integer()
        .min(1)
        .required()
        .messages({
            "number.base": "Quantity must be a number",
            "number.min": "Quantity must be at least 1"
        })
});

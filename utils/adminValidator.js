module.exports.validateProduct = (data) => {
    const errors = [];

    const {
        stockcode,
        description,
        unit_price,
        quantity,
        catid
    } = data;

    if (!stockcode || stockcode.trim().length < 3) {
        errors.push("Stock code must be at least 3 characters");
    }

    if (!description || description.trim().length === 0) {
        errors.push("Description is required");
    }

    if (!unit_price || isNaN(unit_price) || Number(unit_price) <= 0) {
        errors.push("Unit price must be greater than 0");
    }

    if (quantity === undefined || isNaN(quantity) || Number(quantity) < 1) {
        errors.push("Quantity cannot be negative neither zero while adding a new product");
    }

    if (!catid) {
        errors.push("Category is required");
    }

    return errors;
};

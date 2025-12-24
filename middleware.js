// const Listing = require("./models/listings.js");//requiring model and schema on which datas
// const Review = require("./models/review.js");//requiring review model and schema

// const {review, listing} = require("./schema.js");//requiring Joi for server side validation (not mongoose validations)
const ExpressError=require("./utils/ExpressError.js");//requiring expresseroor to print expected error and message

/* The `module.exports.isLoggedIn` function is a middleware function in a Node.js application that is
used to check if a user is authenticated before allowing access to certain routes or
functionalities. Here's a breakdown of what it does: */
module.exports.isLoggedIn=(req,res,next)=>{
    if(!req.isAuthenticated()){/*.isAuthenicated() is passport function to make sure if any update is there to be done you must be logged in to do that update.*/
        req.session.redirectUrl=req.originalUrl;
        req.flash("error","You must be logged in to access this page.");
        return res.redirect("/login");
    }
    next();
};

/* The `saveRedirectUrl` function is checking if there is a `redirectUrl` stored in the session object
of the request (`req.session.redirectUrl`). If it exists, the function assigns this value to
`res.locals.saveUrl`. This allows the `redirectUrl` to be saved locally and accessed in further
requests. Finally, the function calls the `next()` middleware function to continue the request
processing pipeline. */

module.exports.saveRedirectUrl=(req,res,next)=>{
    if(req.session.redirectUrl){
        res.locals.saveUrl=req.session.redirectUrl;
    }
    next();
};

/* The `module.exports.isOwner` function is a middleware function in a Node.js application that is used
to check if the current user is the owner of a specific listing. Here's a breakdown of what it does: */

// module.exports.isOwner=async (req,res,next)=>{
//     let {id}=req.params;
//     let listingid=await Listing.findById(id);
//         if(!listingid.owner._id.equals(res.locals.currUser._id)){
//             req.flash("error","You are not owner of this listings!!");
//             return res.redirect(`/listings/${id}`);
//     }
//     next();
// }

/* The `module.exports.isReviewAuthor` function is a middleware function in a Node.js application that
is used to check if the current user is the author of a specific review. Here's a breakdown of what
it does: */

// module.exports.isReviewAuthor=async (req,res,next)=>{
//     let {id,reviewId}=req.params;
//     let review=await Review.findById(reviewId);
//         if(!review.author._id.equals(res.locals.currUser._id)){
//             req.flash("error","You didn't create this review!!");
//             return res.redirect(`/listings/${id}`);
//     }
//     next();
// }

/* The `module.exports.validatelisting` function is a middleware function in a Node.js application that
is used to validate the data in the request body for creating a new listing.Server Side Validation. Here's a breakdown of
what it does: */
// module.exports.validatelisting=(req,res,next)=>{
//     let {error}=listing.validate(req.body);//.validate function is a Joi function
//     if(error){
//         /* The line `let errmsg=error.details.map((el)=>el.message).join(",");` is creating a new
//         variable `errmsg` that stores the error messages from the validation error object. */
//         let errmsg=error.details.map((el)=>el.message).join(",");
//         throw new ExpressError(400,errmsg);
//     }else{
//         next();
//     }
// };

/* The `module.exports.validateReview` function is a middleware function in a Node.js application that
is used to validate the data in the request body for creating a new review.Server side validation. Here's a breakdown of
what it does: */
// module.exports.validateReview=(req,res,next)=>{
//     let {error}=review.validate(req.body);
//     if(error){
//         let errmsg=error.details.map((el)=>el.message).join(",");//NEW
//         throw new ExpressError(400,errmsg);
//     }else{
//         next();
//     }
// };

module.exports.isAdmin = (req, res, next) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
        req.flash("error", "Admin access only.");
        return res.redirect("/");
    }
    next();
};

module.exports.isUser = (req, res, next) => {
    if (req.user.role !== "user") {
        req.flash("error", "Admins cannot add products to cart");
        return res.redirect("/products");
    }
    next();
};


const { productSchema, cartSchema } = require("./utils/validation.js");

/* -------- PRODUCT VALIDATION -------- */
module.exports.validateProduct = (req, res, next) => {
    const { error } = productSchema.validate(req.body, { abortEarly: false });

    if (error) {
        const msg = error.details.map(el => el.message).join(", ");
        throw new ExpressError(400, msg);
    }
    next();
};

/* -------- CART VALIDATION -------- */
module.exports.validateCart = (req, res, next) => {
    const { error } = cartSchema.validate(req.body);

    if (error) {
        throw new ExpressError(400, error.details[0].message);
    }
    next();
};

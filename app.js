if (process.env.NODE_ENV != "production") {
  //when we deploy our project it will in production ...now its in Develpoment
  require("dotenv").config();
}
// Warning for missing SECRET
if (!process.env.SECRET) {
  console.warn("⚠️ WARNING: SESSION SECRET NOT SET");
}

// Login security constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 30 * 1000; // 30 seconds

// Requiring modules
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const ejsMate = require("ejs-mate");

//  Creating express app
const app = express();

// Requiring mysql pool
const pool = require("./db/mysql");

//Custom Error class
const ExpressError = require("./utils/ExpressError");

// Admin input validation
// const { validateProduct } = require("./utils/adminValidator");

//MongoDB connection
mongoose
  .connect("mongodb://localhost:27017/inventory")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Requiring passport and other auth related modules
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/users.js");
const { saveRedirectUrl, isUser } = require("./middleware");

//Session requiring
dbUrl = process.env.DB_URL || "mongodb://localhost:27017/inventory";
const session = require("express-session");
const MongoStore = require("connect-mongo").default; //For connect-mongo must be after requring session
const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
    secret: process.env.SECRET,
  },
  touchAfter: 24 * 3600,
});
/* The code `store.on("error",()=>{ console.log("ERROR IN MONGO SESSION STORE!!") });` is setting up an
event listener on the `store` object for any errors that may occur. */
store.on("error", (err) => {
  console.log("ERROR IN MONGO SESSION STORE!!", err);
});
const sessionOptions = {
  store: store, //thats why we declared store before session
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 3,
    httpOnly: true,
  },
};
app.use(session(sessionOptions));
//requiring connect-flash after app.use(session(sessionOptions));
const flash = require("connect-flash");
app.use(flash());

//All below things are put in same chronolgical oder after session,flash are required

//using passport after app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy({ usernameField: "ID" }, User.authenticate())); // use static authenticate method of model in LocalStrategy
// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
//Using flash
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

// Method Override
const methodOverride = require("method-override");
app.use(methodOverride("_method"));

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

//to prevent caching so that after logout user cant go back to previous page using back button
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// ---------------- CLOUDINARY CONFIG ----------------
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "inventory_products",
    allowed_formats: ["jpeg", "png", "jpg"],
  },
});

const upload = multer({ storage });

// Middleware to set cart count in res.locals for all routes
app.use(async (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === "user") {
    try {
      const userId = req.user._id.toString();

      const [[cart]] = await pool.query(
        "SELECT CartID FROM cart WHERE UserID = ?",
        [userId]
      );

      if (cart) {
        const [[count]] = await pool.query(
          "SELECT SUM(quantity) AS total FROM cart_items WHERE CartID = ?",
          [cart.CartID]
        );

        res.locals.cartCount = count.total || 0;
      } else {
        res.locals.cartCount = 0;
      }
    } catch (err) {
      res.locals.cartCount = 0;
    }
  } else {
    res.locals.cartCount = 0;
  }
  next();
});

//HOME ROUTE
app.get("/", (req, res) => {
  res.render("listings/index.ejs");
});

// ---------------- PRODUCT LISTING ----------------
app.get("/products", async (req, res, next) => {
  try {
    const [products] = await pool.query(`
            SELECT IFNULL(c.Name, 'Uncategorized') AS Category,
                p.ProductID,
                p.StockCode,
                p.Description,
                p.Unit_Price,
                p.Quantity,
                p.image_url,
                c.Name AS Category
            FROM product p
            LEFT JOIN category c ON p.CatID = c.CategoryID
        `);

    res.render("listings/listings.ejs", { products });
  } catch (err) {
    next(err);
  }
});

//for signup and user routes
app.get("/ad_us", (req, res) => {
  res.render("listings/ad_us.ejs");
});

//for admins
const { isLoggedIn, isAdmin } = require("./middleware");

app.get("/admin/dashboard", isLoggedIn, isAdmin, async (req, res) => {
  const [[productCount]] = await pool.query(
    "SELECT COUNT(*) AS total FROM product"
  );
  const [[categoryCount]] = await pool.query(
    "SELECT COUNT(*) AS total FROM category"
  );

  res.render("admins/dashboard.ejs", {
    productCount: productCount.total,
    categoryCount: categoryCount.total,
  });
});

// ---------------- PRODUCT ROUTES (ADMIN ONLY) ----------------

// show product creation form
app.get("/products/new", isLoggedIn, isAdmin, (req, res) => {
  res.render("products/new.ejs");
});

// handle product creation
app.post(
  "/products",
  isLoggedIn,
  isAdmin,
  upload.single("image"),
  // validateProduct,
  async (req, res, next) => {
    try {
      const { stockcode, description, unit_price, quantity, catid } = req.body;

      const imageUrl = req.file ? req.file.path : null;

      // 🔒 Category existence check
      const [[category]] = await pool.query(
        "SELECT CategoryID FROM category WHERE CategoryID = ?",
        [catid]
      );
      if (!category) {
        req.flash("error", "Invalid category selected");
        return res.redirect("/products/new");
      }

      // 🔒 Unique StockCode check
      const [[existing]] = await pool.query(
        "SELECT ProductID FROM product WHERE StockCode = ?",
        [stockcode]
      );
      if (existing) {
        req.flash("error", "Stock Code already exists");
        return res.redirect("/products/new");
      }

      // Insert new product
      await pool.query(
        `INSERT INTO product
        (StockCode, Description, Unit_Price, Quantity, CatID, image_url)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [stockcode, description, unit_price, quantity, catid, imageUrl]
      );

      req.flash("success", "Product added successfully");
      res.redirect("/products");
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        req.flash(
          "error",
          "Stock Code already exists. Please use a unique Stock Code."
        );
        return res.redirect("/products/new");
      }
      next(err);
    }
  }
);

// EDIT PRODUCT FORM
app.get("/products/:id/edit", isLoggedIn, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [[product]] = await pool.query(
      "SELECT * FROM product WHERE ProductID = ?",
      [id]
    );

    if (!product) {
      req.flash("error", "Product not found");
      return res.redirect("/products");
    }
    const [categories] = await pool.query("SELECT * FROM category");

    res.render("products/edit.ejs", { product, categories });
  } catch (err) {
    next(err);
  }
});

// UPDATE PRODUCT
app.put(
  "/products/:id",
  isLoggedIn,
  isAdmin,
  upload.single("image"),
  // validateProduct,
  async (req, res, next) => {
    try {
      // const errors = validateProduct(req.body);

      // if (errors.length > 0) {
      //   req.flash("error", errors.join(", "));
      //   return res.redirect(`/products/${req.params.id}/edit`);
      // }

      const { id } = req.params;
      const { stockcode, description, unit_price, quantity, catid } = req.body;

      const imageUrl = req.file ? req.file.path : null;

      let query = `
        UPDATE product
        SET StockCode = ?, Description = ?, Unit_Price = ?, Quantity = ?, CatID = ?
      `;
      const params = [stockcode, description, unit_price, quantity, catid];

      if (imageUrl) {
        query += ", image_url = ?";
        params.push(imageUrl);
      }

      query += " WHERE ProductID = ?";
      params.push(id);

      await pool.query(query, params);

      req.flash("success", "Product updated successfully");
      res.redirect("/products");
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        req.flash(
          "error",
          "Stock Code already exists. Please choose a different Stock Code."
        );
        return res.redirect(`/products/${req.params.id}/edit`);
      }
      next(err);
    }
  }
);

// DELETE PRODUCT
app.delete("/products/:id", isLoggedIn, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [[used]] = await pool.query(
      "SELECT ProductID FROM cart_items WHERE ProductID = ? LIMIT 1",
      [id]
    );

    if (used) {
      req.flash("error", "Product is in use and cannot be deleted");
      return res.redirect("/products");
    }

    await pool.query("DELETE FROM product WHERE ProductID = ?", [id]);

    req.flash("success", "Product deleted");
    res.redirect("/products");
  } catch (err) {
    next(err);
  }
});

//SIGNUP ROUTES
app.get("/signup", (req, res) => {
  res.render("users/signup.ejs");
});
app.post("/signup", async (req, res, next) => {
  try {
    const { ID, email, password } = req.body;
    const newUser = new User({ ID, email });
    const registeredUser = await User.register(newUser, password);
    req.login(registeredUser, (err) => {
      if (err) return next(err);
      req.flash("success", "Welcome to Intelligent-Inventory System!!");
      res.redirect("/"); // ✅ redirect is REQUIRED
    });
  } catch (err) {
    req.flash("error", err.message);
    res.redirect("/signup");
  }
});

//LOGIN ROUTES
app.get("/login", (req, res) => {
  res.render("users/login.ejs");
});
app.post("/login", saveRedirectUrl, async (req, res, next) => {
  try {
    const { ID, password } = req.body;

    const user = await User.findOne({ ID });

    if (!user) {
      req.flash("error", "Invalid ID or password");
      return res.redirect("/login");
    }

    // 🔒 ACCOUNT LOCK CHECK
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const secondsLeft = Math.ceil((user.lockUntil - Date.now()) / 1000);
      req.flash("error", `Account locked. Try again in ${secondsLeft}s`);
      return res.redirect("/login");
    }

    // ✅ CORRECT AUTHENTICATION
    User.authenticate()(ID, password, async (err, authenticatedUser, info) => {
      if (err) return next(err);

      if (!authenticatedUser) {
        // ❌ WRONG PASSWORD
        user.loginAttempts += 1;

        if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
          user.lockUntil = new Date(Date.now() + LOCK_TIME);
          user.loginAttempts = 0;
        }

        await user.save();
        req.flash("error", "Invalid ID or password");
        return res.redirect("/login");
      }

      // ✅ SUCCESS
      user.loginAttempts = 0;
      user.lockUntil = null;
      await user.save();

      req.login(authenticatedUser, (err) => {
        if (err) return next(err);

        req.flash("success", "Welcome back!");
        const redirectUrl = res.locals.saveUrl || "/products";
        res.redirect(redirectUrl);
      });
    });
  } catch (err) {
    next(err);
  }
});

// ---------------- CART ROUTES (USER ONLY) ----------------

// ---------------- ADD TO CART ----------------
app.post(
  "/cart/add/:productId",
  isLoggedIn,
  isUser,
  // validateProduct,
  async (req, res, next) => {
    try {
      const userId = req.user._id.toString();
      const { productId } = req.params;

      // 1️⃣ Get product stock & price
      const [[product]] = await pool.query(
        "SELECT Quantity, Unit_Price FROM product WHERE ProductID = ?",
        [productId]
      );

      if (!product || product.Quantity <= 0) {
        req.flash("error", "Product out of stock");
        return res.redirect("/products");
      }

      // 2️⃣ Get cart
      let [[cart]] = await pool.query(
        "SELECT CartID FROM cart WHERE UserID = ?",
        [userId]
      );

      if (!cart) {
        const [result] = await pool.query(
          "INSERT INTO cart (UserID) VALUES (?)",
          [userId]
        );
        cart = { CartID: result.insertId };
      }

      // 3️⃣ Check existing cart item
      const [[item]] = await pool.query(
        "SELECT quantity FROM cart_items WHERE CartID = ? AND ProductID = ?",
        [cart.CartID, productId]
      );

      if (item && item.quantity >= product.Quantity) {
        req.flash("error", "Stock limit reached");
        return res.redirect("/products");
      }

      if (item) {
        await pool.query(
          "UPDATE cart_items SET quantity = quantity + 1 WHERE CartID = ? AND ProductID = ?",
          [cart.CartID, productId]
        );
      } else {
        await pool.query(
          `INSERT INTO cart_items (CartID, ProductID, quantity)
          VALUES (?, ?, 1)`,
          [cart.CartID, productId]
        );
      }

      req.flash("success", "Added to cart");
      res.redirect("/products");
    } catch (err) {
      next(err);
    }
  }
);

// ---------------- VIEW CART ----------------
app.get("/cart", isLoggedIn, isUser, async (req, res, next) => {
  try {
    const userId = req.user._id.toString();

    const [[cart]] = await pool.query("SELECT * FROM cart WHERE UserID = ?", [
      userId,
    ]);

    if (!cart) {
      return res.render("cart/index.ejs", { items: [], total: 0 });
    }

    const [items] = await pool.query(
      `
            SELECT 
                ci.CartItemID,
                p.StockCode,
                p.Description,
                p.Unit_Price,
                p.image_url,
                ci.quantity,
                (p.Unit_Price * ci.quantity) AS item_total
            FROM cart_items ci
            JOIN product p ON ci.ProductID = p.ProductID
            WHERE ci.CartID = ?
        `,
      [cart.CartID]
    );

    const total = items.reduce((sum, i) => sum + Number(i.item_total), 0);

    res.render("cart/index.ejs", { items, total });
  } catch (err) {
    next(err);
  }
});

//LOGOUT ROUTE
app.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) return next(err);

    req.flash("success", "Logged out successfully");
    req.session.destroy(() => {
      //destroying session on logout
      res.clearCookie("connect.sid"); // 🔥 VERY IMPORTANT
      res.redirect("/login");
    });
  });
});

app.get("/products/category/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const [products] = await pool.query(
      `
            SELECT 
                p.ProductID,
                p.StockCode,
                p.Description,
                p.Unit_Price,
                p.Quantity,
                p.image_url,
                c.Name AS Category
            FROM product p
            JOIN category c ON p.CatID = c.CategoryID
            WHERE c.CategoryID = ?
        `,
      [id]
    );

    res.render("listings/listings.ejs", { products });
  } catch (err) {
    next(err);
  }
});

app.all(/.*/, (req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

app.use((err, req, res, next) => {
  const { status = 500, message = "Something went wrong" } = err;
  res.status(status).render("error/error.ejs", { message });
});

// ---------------- SERVER LISTENING ----------------
app.listen(3000, () => {
  console.log("Server running on port 3000");
});

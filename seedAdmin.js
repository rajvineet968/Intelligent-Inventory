// seedAdmin.js
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const mongoose = require("mongoose");
const User = require("./models/users");

async function seedAdmin() {
    try {
        await mongoose.connect(process.env.DB_URL || "mongodb://localhost:27017/inventory");
        console.log("MongoDB connected");

        const existingAdmin = await User.findOne({ ID: "admin" });
        if (existingAdmin) {
            console.log("Admin already exists");
            process.exit(0);
        }

        if (!process.env.ADMIN_PASSWORD) {
            throw new Error("ADMIN_PASSWORD not set in .env");
        }

        const admin = new User({
            ID: "admin",
            email: "admin@inventory.com",
            role: "admin"
        });

        await User.register(admin, process.env.ADMIN_PASSWORD);
        console.log("Admin created successfully");

        process.exit(0);
    } catch (err) {
        console.error("Error creating admin:", err.message);
        process.exit(1);
    }
}

seedAdmin();

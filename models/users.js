const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose").default;

const userSchema = new mongoose.Schema(
  {
    ID: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    }, // 🔐 LOGIN SECURITY
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.plugin(passportLocalMongoose, {
  usernameField: "ID",
});

module.exports = mongoose.model("User", userSchema);

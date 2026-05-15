const User = require("../../model/userSchema");
const bcrypt = require("bcrypt");
const emailValidation = require("../../helpers/emailValidation");


async function registerController(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (!emailValidation(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    };

    const hashPassword = await bcrypt.hash(password, 10);
    
    if (!hashPassword) {
      return res.status(500).json({
        success: false,
        message: "Password hashing failed",
      });
    }

    const user = new User({
      name,
      email,
      password: hashPassword,
    });
    
    await user.save();

    res.status(201).json({
      success: true,
      message: "User Registered Successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "User Registration Failed Please Try Again",
      error: error.message,
    });
  }
}

module.exports = registerController;

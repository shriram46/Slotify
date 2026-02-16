const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  validateRegister,
  validateLogin
} = require("../validators/authValidator");

const router = express.Router();

/**
 * POST /api/register
 */
router.post("/register", async (req, res) => {
  try{

  let { name, email, password } = req.body;

     const error = validateRegister({ name, email, password });

    if (error) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: error }
      });
    }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({
      error: {
        code: "USER_EXISTS",
        message: "User already exists"
      }
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword
  });

  return res.status(201).json({
    message: "User registered successfully",
    userId: user._id
  });
  
  } catch (err) {
  console.error(err); 

  return res.status(500).json({
    error: { code: "SERVER_ERROR", message: "Registration failed" }
  });
}

});

/**
 * POST /api/login
 */
router.post("/login", async (req, res) => {
  try{

      let { email, password } = req.body;

     // Normalize input
    email = email.toLowerCase().trim();
    password = password.trim();

    const error = validateLogin({email, password });

    if (error) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: error }
      });
    }


  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password"
      }
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password"
      }
    });
  }

  const token = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  return res.json({
    token,
    role: user.role
  });
} catch (err) {
  console.error(err);

  return res.status(500).json({
    error: {
      code: "SERVER_ERROR",
      message: "Login failed"
    }
  });
}

});

module.exports = router;

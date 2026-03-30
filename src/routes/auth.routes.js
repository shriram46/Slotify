const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  validateRegister,
  validateLogin
} = require("../validators/authValidator");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * POST /api/register
 */
router.post("/register", async (req, res) => {
  try{

  let { name, email, password } = req.body;

  logger.info("User registration attempt", {
    email,
    requestId: req.requestId
  });

     const error = validateRegister({ name, email, password });

    if (error) {
      
      logger.warn("Registration validation failed", {
        email,
        error,
        requestId: req.requestId
     });

      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: error }
      });
    }

  const existingUser = await User.findOne({ email });
  if (existingUser) {

    logger.warn("Registration failed - user already exists", {
      email,
      requestId: req.requestId
    });

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

  logger.info("User registered successfully", {
   userId: user._id,
   requestId: req.requestId
  });

  return res.status(201).json({
    message: "User registered successfully",
    userId: user._id
  });
  
  } catch (err) {

  logger.error("Registration failed", {
   message: err.message,
   stack: err.stack,
   requestId: req.requestId
  }); 

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

    logger.info("User login attempt", {
     email,
     requestId: req.requestId
    });

    const error = validateLogin({email, password });

    if (error) {

      logger.warn("Login validation failed", {
       email,
       error,
       requestId: req.requestId
      });

      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: error }
      });
    }


  const user = await User.findOne({ email });
  if (!user) {
    
    logger.warn("Login failed - user not found", {
     email,
     requestId: req.requestId
    });

    return res.status(401).json({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password"
      }
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {

    logger.warn("Login failed - invalid password", {
     email,
     requestId: req.requestId
    });

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

  logger.info("User login successful", {
   userId: user._id,
   requestId: req.requestId
  });

  return res.json({
    token,
    role: user.role
  });
} catch (err) {
  
  logger.error("Login failed", {
   message: err.message,
   stack: err.stack,
   requestId: req.requestId
  });

  return res.status(500).json({
    error: {
      code: "SERVER_ERROR",
      message: "Login failed"
    }
  });
}

});

module.exports = router;

import express from "express";

import {
  register,
  verifyEmail,
  login,
  refreshAccessToken,
  logout,
} from "../controllers/authController.js";

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Register
router.route("/register").post(register);

// Email Verification
router.route("/verify-email").get(verifyEmail);

// Login
router.route("/login").post(login);

// Get logged-in user
router.route("/me").get(protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Protected route accessed successfully",
    userId: req.auth.userId,
  });
});

// Refresh access token
router.route("/refresh").post(refreshAccessToken);

// Logout
router.route("/logout").post(logout);

export default router;

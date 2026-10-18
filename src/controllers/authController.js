import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import generateVerificationToken from "../utils/verificationToken.js";
import resend from "../config/email.js";
import { createHash } from "node:crypto";
import bcrypt from "bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
} from "../utils/generateTokens.js";
import jwt from "jsonwebtoken";

const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });

// register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !name.trim() ||
    !email.trim() ||
    !password
  ) {
    throw new AppError("Name, email and password are required", 400);
  }

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedName.length < 2 || normalizedName.length > 50) {
    throw new AppError("Name must be between 2 and 50 characters", 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new AppError("Enter a valid email address", 400);
  }

  if (password.length < 8) {
    throw new AppError("Password must contain at least 8 characters", 400);
  }

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new AppError("Email is already registered", 409);
  }

  if (!process.env.RESEND_API_KEY) {
    throw new AppError("Email service is not configured", 500);
  }

  const { token, hashedToken } = generateVerificationToken();

  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    password,
    isEmailVerified: false,
    emailVerificationTokenHash: hashedToken,
    emailVerificationTokenExpires: new Date(Date.now() + 15 * 60 * 1000),
  });

  const verificationUrl =
    `http://localhost:${process.env.PORT || 5000}` +
    `/api/auth/verify-email?token=${token}`;

  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: [normalizedEmail],
      subject: "Verify your TaskFlow email",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Welcome to TaskFlow, ${escapeHtml(normalizedName)}!</h2>
          <p>Click the button below to verify your email address.</p>
          <p>
            <a href="${verificationUrl}"
               style="display:inline-block;padding:12px 20px;
                      background:#2563eb;color:#fff;
                      text-decoration:none;border-radius:6px;">
              Verify Email
            </a>
          </p>
          <p>This link expires in 15 minutes.</p>
          <p>If you did not create this account, you can ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      throw new Error("Resend could not send the email");
    }
  } catch {
    // Email send fail aana, incomplete account-ai remove pannuvom.
    await User.deleteOne({ _id: user._id });
    throw new AppError(
      "Could not send verification email. Please try again.",
      502,
    );
  }

  res.status(201).json({
    success: true,
    message:
      "Registration successful. Check your email to verify your account.",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
    },
  });
});

// verify email
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (typeof token !== "string" || !token) {
    throw new AppError("Verification token is required", 400);
  }

  const hashedToken = createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    emailVerificationTokenHash: hashedToken,
    emailVerificationTokenExpires: { $gt: new Date() },
  }).select("+emailVerificationTokenHash +emailVerificationTokenExpires");

  if (!user) {
    throw new AppError("Invalid or expired verification link", 400);
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationTokenExpires = undefined;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Email verified successfully. Your TaskFlow account is ready.",
  });
});

// login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    throw new AppError("Email and password are required", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Password field schema-la select:false irukkuradhala
  // explicit-ah select pannrom.
  const user = await User.findOne({
    email: normalizedEmail,
  }).select("+password");

  // Account irukka illaya nu reveal pannaama generic error.
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.isEmailVerified) {
    throw new AppError("Please verify your email before logging in", 403);
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  setRefreshTokenCookie(res, refreshToken);

  res.status(200).json({
    success: true,
    message: "Login successful",
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    },
  });
});

// refresh access
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.taskflowRefreshToken;

  if (!refreshToken) {
    throw new AppError("Refresh token is required. Please log in again.", 401);
  }

  let decoded;

  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "refresh" || !decoded.sub) {
    throw new AppError("Invalid refresh token", 401);
  }

  const user = await User.findById(decoded.sub);

  if (!user || !user.isEmailVerified) {
    throw new AppError("User not found or email is not verified", 401);
  }

  const accessToken = generateAccessToken(user._id);

  res.status(200).json({
    success: true,
    accessToken,
  });
});

// logout
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("taskflowRefreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

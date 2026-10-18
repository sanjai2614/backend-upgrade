import jwt from "jsonwebtoken";

export const generateAccessToken = (userId) => {
  return jwt.sign(
    { sub: userId.toString(), type: "access" },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );
};

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { sub: userId.toString(), type: "refresh" },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" },
  );
};

export const setRefreshTokenCookie = (res, token) => {
  res.cookie("taskflowRefreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  });
};

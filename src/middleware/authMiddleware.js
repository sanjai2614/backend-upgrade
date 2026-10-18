import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Please log in to access this resource", 401));
  }

  const accessToken = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

    if (decoded.type !== "access" || !decoded.sub) {
      return next(new AppError("Invalid access token", 401));
    }

    req.auth = {
      userId: decoded.sub,
    };

    next();
  } catch {
    next(new AppError("Invalid or expired access token", 401));
  }
};

export default protect;

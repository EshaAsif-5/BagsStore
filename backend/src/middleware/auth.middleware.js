import jwt from "jsonwebtoken";
import { userRepository } from "../repositories/user.repository.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

// ─────────────────────────────────────────────
// VERIFY TOKEN MIDDLEWARE
// Supports both HTTP-only cookie and Authorization: Bearer header.
// Cookie takes precedence (used by browser clients).
// Header is fallback (used by mobile / API clients).
// ─────────────────────────────────────────────
export const verifyToken = asyncHandler(async (req, _res, next) => {
  // 1. Extract token from cookie or Authorization header
  const token =
    req.cookies?.accessToken ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null);

  if (!token) {
    throw new ApiError(
      401,
      "Authentication required. Please log in to continue."
    );
  }

  // 2. Verify token signature and expiry
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new ApiError(
        401,
        "Your session has expired. Please log in again."
      );
    }
    throw new ApiError(401, "Invalid token. Please log in again.");
  }

  // 3. Confirm user still exists and is active
  const user = await userRepository.findById(decoded.id, true);

  if (!user) {
    throw new ApiError(401, "The user associated with this token no longer exists.");
  }

  if (!user.isActive) {
    throw new ApiError(
      403,
      "This account has been deactivated. Please contact support."
    );
  }

  // 4. Confirm password hasn't changed since this token was issued
  //    (invalidates tokens after a password reset)
  if (user.isPasswordChangedAfter(decoded.iat)) {
    throw new ApiError(
      401,
      "Password was recently changed. Please log in again."
    );
  }

  // 5. Attach user to request — available in all downstream handlers
  req.user = user;
  next();
});

// ─────────────────────────────────────────────
// OPTIONAL AUTH MIDDLEWARE
// Attaches user if token is present and valid, but does NOT throw
// if no token is provided. Used for endpoints that behave differently
// for authenticated vs guest users (e.g. product detail, cart merge).
// ─────────────────────────────────────────────
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token =
    req.cookies?.accessToken ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null);

  if (!token) return next(); // No token — proceed as guest

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userRepository.findById(decoded.id, true);

    if (user && user.isActive && !user.isPasswordChangedAfter(decoded.iat)) {
      req.user = user;
    }
  } catch {
    // Token is invalid or expired — silently ignore, treat as guest
  }

  next();
});
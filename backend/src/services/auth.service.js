import jwt from "jsonwebtoken";
import crypto from "crypto";
import { userRepository } from "../repositories/user.repository.js";
import ApiError from "../utils/ApiError.js";

// ─────────────────────────────────────────────
// TOKEN HELPERS
// ─────────────────────────────────────────────

/**
 * Sign a short-lived access token (15 minutes).
 */
const signAccessToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
  );
};

/**
 * Sign a long-lived refresh token (7 days).
 */
const signRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );
};

/**
 * Hash a refresh token before storing in DB.
 * We store the hash, not the raw token, so a DB leak
 * doesn't expose valid tokens.
 */
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Cookie options shared for both access and refresh tokens.
 */
const cookieOptions = {
  httpOnly: true,                                // JS cannot read the cookie
  secure: process.env.NODE_ENV === "production", // HTTPS only in production
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
};

export const ACCESS_COOKIE_OPTIONS = {
  ...cookieOptions,
  maxAge: 15 * 60 * 1000, // 15 minutes in ms
};

export const REFRESH_COOKIE_OPTIONS = {
  ...cookieOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: "/api/v1/auth/refresh-token", // Restrict refresh cookie to refresh endpoint only
};

/**
 * Generate both tokens, hash and store refresh token, return pair.
 */
const issueTokenPair = async (userId, role) => {
  const accessToken = signAccessToken(userId, role);
  const refreshToken = signRefreshToken(userId);

  // Store hashed refresh token in DB
  await userRepository.setRefreshToken(userId, hashToken(refreshToken));

  return { accessToken, refreshToken };
};

// ─────────────────────────────────────────────
// AUTH SERVICE
// ─────────────────────────────────────────────

/**
 * Register a new customer account.
 * Throws if email already exists.
 */
const register = async ({ name, email, phone, password }) => {
  const alreadyExists = await userRepository.emailExists(email);
  if (alreadyExists) {
    throw new ApiError(409, "An account with this email already exists.");
  }

  // passwordHash field name is intentional — the User model's pre-save
  // hook detects modification of this field and runs bcrypt on it.
  const user = await userRepository.createUser({
    name,
    email,
    phone,
    passwordHash: password, // Raw password — hashed by User.model pre-save
  });

  const { accessToken, refreshToken } = await issueTokenPair(user._id, user.role);

  return { user, accessToken, refreshToken };
};

/**
 * Login with email + password.
 * Returns token pair on success.
 */
const login = async ({ email, password }) => {
  // Fetch user with passwordHash included (select: false by default)
  const user = await userRepository.findByEmail(email, true);

  if (!user) {
    // Use a generic message to prevent user enumeration
    throw new ApiError(401, "Invalid email or password.");
  }

  if (!user.isActive) {
    throw new ApiError(403, "This account has been deactivated. Please contact support.");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const { accessToken, refreshToken } = await issueTokenPair(user._id, user.role);

  return { user, accessToken, refreshToken };
};

/**
 * Logout: clear the stored refresh token from DB.
 * Access token expiry is handled client-side (short-lived by design).
 */
const logout = async (userId) => {
  await userRepository.setRefreshToken(userId, null);
};

/**
 * Rotate refresh token — verify old token, issue new pair.
 * Implements refresh token rotation: each refresh invalidates the old token.
 */
const refreshTokens = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token not provided.");
  }

  // 1. Verify the token is structurally valid and not expired
  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new ApiError(401, "Refresh token has expired. Please log in again.");
    }
    throw new ApiError(401, "Invalid refresh token.");
  }

  // 2. Find user by hashed token — confirms this token was actually issued by us
  const hashedToken = hashToken(incomingRefreshToken);
  const user = await userRepository.findByRefreshToken(hashedToken);

  if (!user) {
    // Token is valid JWT but not in DB — possible token reuse attack
    // Invalidate all tokens for this user as a security measure
    await userRepository.setRefreshToken(decoded.id, null);
    throw new ApiError(
      401,
      "Refresh token has already been used or revoked. Please log in again."
    );
  }

  if (!user.isActive) {
    await userRepository.setRefreshToken(user._id, null);
    throw new ApiError(403, "Account has been deactivated.");
  }

  // 3. Issue new token pair (old refresh token is overwritten in DB)
  const { accessToken, refreshToken: newRefreshToken } = await issueTokenPair(
    user._id,
    user.role
  );

  return { user, accessToken, refreshToken: newRefreshToken };
};

/**
 * Get the currently authenticated user's profile.
 */
const getMe = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found.");
  }
  return user;
};

/**
 * Update profile fields (name, phone).
 */
const updateProfile = async (userId, updates) => {
  const user = await userRepository.updateProfile(userId, updates);
  if (!user) {
    throw new ApiError(404, "User not found.");
  }
  return user;
};

/**
 * Change password — verify current password first.
 */
const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await userRepository.findById(userId, true);
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  const isCurrentPasswordValid = await user.isPasswordCorrect(currentPassword);
  if (!isCurrentPasswordValid) {
    throw new ApiError(401, "Current password is incorrect.");
  }

  if (currentPassword === newPassword) {
    throw new ApiError(400, "New password must be different from the current password.");
  }

  // Pass raw password — User.model pre-save hook will hash it
  await userRepository.updatePassword(userId, newPassword);

  // Invalidate all existing sessions by clearing refresh token
  await userRepository.setRefreshToken(userId, null);
};

/**
 * Add a new address to the user's profile.
 */
const addAddress = async (userId, addressData) => {
  const user = await userRepository.addAddress(userId, addressData);
  if (!user) {
    throw new ApiError(404, "User not found.");
  }
  return user;
};

/**
 * Update an existing address.
 */
const updateAddress = async (userId, addressId, updates) => {
  const user = await userRepository.updateAddress(userId, addressId, updates);
  if (!user) {
    throw new ApiError(404, "User or address not found.");
  }
  return user;
};

/**
 * Delete an address from the user's profile.
 */
const deleteAddress = async (userId, addressId) => {
  const user = await userRepository.deleteAddress(userId, addressId);
  if (!user) {
    throw new ApiError(404, "User or address not found.");
  }
  return user;
};

export const authService = {
  register,
  login,
  logout,
  refreshTokens,
  getMe,
  updateProfile,
  changePassword,
  addAddress,
  updateAddress,
  deleteAddress,
  // Exported for use in middleware
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
};
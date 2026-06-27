import {
  authService,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
} from "../services/auth.service.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

// ─────────────────────────────────────────────
// COOKIE HELPERS
// ─────────────────────────────────────────────

/**
 * Set both auth cookies on the response object.
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, ACCESS_COOKIE_OPTIONS);
  res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
};

/**
 * Clear both auth cookies on the response object.
 */
const clearAuthCookies = (res) => {
  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  };
  res.clearCookie("accessToken", clearOptions);
  res.clearCookie("refreshToken", { ...clearOptions, path: "/api/v1/auth/refresh-token" });
};

// ─────────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 * Register a new customer account.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  const { user, accessToken, refreshToken } = await authService.register({
    name,
    email,
    phone,
    password,
  });

  setAuthCookies(res, accessToken, refreshToken);

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
      "Account created successfully. Welcome to ZEE.BY ZUNAISHA!"
    )
  );
});

/**
 * POST /api/v1/auth/login
 * Login with email + password. Issues token pair via HTTP-only cookies.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { user, accessToken, refreshToken } = await authService.login({
    email,
    password,
  });

  setAuthCookies(res, accessToken, refreshToken);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          wishlist: user.wishlist,
          addresses: user.addresses,
        },
      },
      "Logged in successfully."
    )
  );
});

/**
 * POST /api/v1/auth/logout
 * Clear tokens from DB and cookies.
 * Protected — must be logged in to logout.
 */
const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user._id);

  clearAuthCookies(res);

  return res.status(200).json(
    new ApiResponse(200, null, "Logged out successfully.")
  );
});

/**
 * POST /api/v1/auth/refresh-token
 * Rotate refresh token — issues a new access + refresh token pair.
 * Public endpoint — uses the refresh token cookie.
 */
const refreshToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  const { user, accessToken, refreshToken: newRefreshToken } =
    await authService.refreshTokens(incomingRefreshToken);

  setAuthCookies(res, accessToken, newRefreshToken);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      "Tokens refreshed successfully."
    )
  );
});

/**
 * GET /api/v1/auth/me
 * Get current authenticated user's profile.
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user._id);

  return res.status(200).json(
    new ApiResponse(200, { user }, "Profile fetched successfully.")
  );
});

/**
 * PUT /api/v1/auth/me
 * Update name and/or phone number.
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;

  const user = await authService.updateProfile(req.user._id, { name, phone });

  return res.status(200).json(
    new ApiResponse(200, { user }, "Profile updated successfully.")
  );
});

/**
 * PUT /api/v1/auth/me/password
 * Change password — requires current password verification.
 * Invalidates all existing sessions on success.
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  await authService.changePassword(req.user._id, {
    currentPassword,
    newPassword,
  });

  // Clear cookies — user must log in again with new password
  clearAuthCookies(res);

  return res.status(200).json(
    new ApiResponse(
      200,
      null,
      "Password changed successfully. Please log in with your new password."
    )
  );
});

/**
 * POST /api/v1/auth/me/addresses
 * Add a new delivery address.
 */
const addAddress = asyncHandler(async (req, res) => {
  const user = await authService.addAddress(req.user._id, req.body);

  return res.status(201).json(
    new ApiResponse(201, { addresses: user.addresses }, "Address added successfully.")
  );
});

/**
 * PUT /api/v1/auth/me/addresses/:addressId
 * Update an existing delivery address.
 */
const updateAddress = asyncHandler(async (req, res) => {
  const user = await authService.updateAddress(
    req.user._id,
    req.params.addressId,
    req.body
  );

  return res.status(200).json(
    new ApiResponse(200, { addresses: user.addresses }, "Address updated successfully.")
  );
});

/**
 * DELETE /api/v1/auth/me/addresses/:addressId
 * Remove a delivery address.
 */
const deleteAddress = asyncHandler(async (req, res) => {
  const user = await authService.deleteAddress(
    req.user._id,
    req.params.addressId
  );

  return res.status(200).json(
    new ApiResponse(200, { addresses: user.addresses }, "Address removed successfully.")
  );
});

export const authController = {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  updateProfile,
  changePassword,
  addAddress,
  updateAddress,
  deleteAddress,
};
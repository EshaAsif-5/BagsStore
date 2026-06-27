import api from "./api.js";

// ─────────────────────────────────────────────
// AUTH SERVICE
// Pure API call functions — no state management.
// State is handled by authStore.js.
// These are also used directly by TanStack Query
// hooks in custom hook files.
// ─────────────────────────────────────────────

/**
 * Register a new customer account.
 * @param {{ name, email, phone, password }} payload
 */
const register = async ({ name, email, phone, password }) => {
  const { data } = await api.post("/auth/register", {
    name,
    email,
    phone,
    password,
  });
  return data.data;
};

/**
 * Login with email and password.
 * Server sets HTTP-only accessToken + refreshToken cookies.
 * @param {{ email, password }} payload
 */
const login = async ({ email, password }) => {
  const { data } = await api.post("/auth/login", { email, password });
  return data.data;
};

/**
 * Logout — clears HTTP-only cookies on the server.
 */
const logout = async () => {
  const { data } = await api.post("/auth/logout");
  return data;
};

/**
 * Get the currently authenticated user's profile.
 * Used by initAuth() in the auth store and the profile page.
 */
const getMe = async () => {
  const { data } = await api.get("/auth/me");
  return data.data.user;
};

/**
 * Update the authenticated user's name and/or phone.
 * @param {{ name?, phone? }} updates
 */
const updateProfile = async (updates) => {
  const { data } = await api.put("/auth/me", updates);
  return data.data.user;
};

/**
 * Change password — requires current password verification.
 * Invalidates all existing sessions on success.
 * @param {{ currentPassword, newPassword, confirmPassword }} payload
 */
const changePassword = async ({ currentPassword, newPassword, confirmPassword }) => {
  const { data } = await api.put("/auth/me/password", {
    currentPassword,
    newPassword,
    confirmPassword,
  });
  return data;
};

/**
 * Add a new delivery address to the user's profile.
 * @param {{ label?, fullName, phone, street, city, province, postalCode?, isDefault? }} address
 */
const addAddress = async (address) => {
  const { data } = await api.post("/auth/me/addresses", address);
  return data.data.addresses;
};

/**
 * Update an existing address by its sub-document ID.
 * @param {string} addressId
 * @param {Object} updates
 */
const updateAddress = async (addressId, updates) => {
  const { data } = await api.put(`/auth/me/addresses/${addressId}`, updates);
  return data.data.addresses;
};

/**
 * Delete an address from the user's profile.
 * @param {string} addressId
 */
const deleteAddress = async (addressId) => {
  const { data } = await api.delete(`/auth/me/addresses/${addressId}`);
  return data.data.addresses;
};

const authService = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  addAddress,
  updateAddress,
  deleteAddress,
};

export default authService;
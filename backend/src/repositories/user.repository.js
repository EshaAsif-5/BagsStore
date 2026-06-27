import User from "../models/User.model.js";

// ─────────────────────────────────────────────
// USER REPOSITORY
// Pure database access layer — no business logic.
// All query composition lives here.
// ─────────────────────────────────────────────

/**
 * Find a user by ID.
 * By default excludes sensitive fields (passwordHash, refreshToken).
 */
const findById = (id, includeSensitive = false) => {
  const query = User.findById(id);
  if (includeSensitive) {
    query.select("+passwordHash +refreshToken +passwordChangedAt +isActive");
  }
  return query.lean(false); // Return Mongoose document (not plain object)
};

/**
 * Find a user by email.
 * includeSensitive = true when we need to verify password on login.
 */
const findByEmail = (email, includeSensitive = false) => {
  const query = User.findOne({ email: email.toLowerCase().trim() });
  if (includeSensitive) {
    query.select("+passwordHash +refreshToken +passwordChangedAt +isActive");
  }
  return query;
};

/**
 * Find a user by their stored refresh token.
 * Used during token rotation to validate and issue a new pair.
 */
const findByRefreshToken = (token) => {
  return User.findOne({ refreshToken: token }).select(
    "+refreshToken +passwordChangedAt"
  );
};

/**
 * Check if an email is already registered.
 * Returns a boolean — lean and fast.
 */
const emailExists = async (email) => {
  const exists = await User.exists({ email: email.toLowerCase().trim() });
  return Boolean(exists);
};

/**
 * Create and persist a new user document.
 */
const createUser = async ({ name, email, phone, passwordHash }) => {
  const user = new User({ name, email, phone, passwordHash });
  await user.save();
  return user;
};

/**
 * Store a hashed refresh token on the user document.
 * Pass null to clear the token on logout.
 */
const setRefreshToken = (userId, token) => {
  return User.findByIdAndUpdate(
    userId,
    { refreshToken: token },
    { new: true, select: "+refreshToken" }
  );
};

/**
 * Update user profile fields (name, phone).
 * Returns the updated document without sensitive fields.
 */
const updateProfile = (userId, updates) => {
  const allowedFields = ["name", "phone"];
  const sanitized = Object.fromEntries(
    Object.entries(updates).filter(([key]) => allowedFields.includes(key))
  );
  return User.findByIdAndUpdate(userId, sanitized, {
    new: true,
    runValidators: true,
  });
};

/**
 * Update the user's password hash and record when it was changed.
 */
const updatePassword = async (userId, newPasswordHash) => {
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) return null;
  user.passwordHash = newPasswordHash; // pre-save hook handles bcrypt
  user.passwordChangedAt = new Date();
  await user.save();
  return user;
};

/**
 * Add an address to the user's addresses array.
 * Validates against the 5-address limit via Mongoose schema.
 */
const addAddress = async (userId, address) => {
  const user = await User.findById(userId);
  if (!user) return null;
  user.addresses.push(address);
  await user.save();
  return user;
};

/**
 * Update a specific address sub-document by its _id.
 */
const updateAddress = async (userId, addressId, updates) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const address = user.addresses.id(addressId);
  if (!address) return null;

  Object.assign(address, updates);
  await user.save();
  return user;
};

/**
 * Remove a specific address sub-document by its _id.
 */
const deleteAddress = async (userId, addressId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  user.addresses = user.addresses.filter(
    (a) => a._id.toString() !== addressId.toString()
  );
  await user.save();
  return user;
};

/**
 * Add a product to the user's wishlist.
 * Uses $addToSet to prevent duplicates at the DB level.
 */
const addToWishlist = (userId, productId) => {
  return User.findByIdAndUpdate(
    userId,
    { $addToSet: { wishlist: productId } },
    { new: true }
  ).populate("wishlist", "name slug images averageRating variants isActive");
};

/**
 * Remove a product from the user's wishlist.
 */
const removeFromWishlist = (userId, productId) => {
  return User.findByIdAndUpdate(
    userId,
    { $pull: { wishlist: productId } },
    { new: true }
  ).populate("wishlist", "name slug images averageRating variants isActive");
};

/**
 * Get the user's wishlist with populated product details.
 */
const getWishlist = (userId) => {
  return User.findById(userId)
    .select("wishlist")
    .populate("wishlist", "name slug images averageRating variants isActive category");
};

/**
 * Soft-delete a user account by setting isActive to false.
 */
const deactivateUser = (userId) => {
  return User.findByIdAndUpdate(
    userId,
    { isActive: false, refreshToken: null },
    { new: true }
  );
};

export const userRepository = {
  findById,
  findByEmail,
  findByRefreshToken,
  emailExists,
  createUser,
  setRefreshToken,
  updateProfile,
  updatePassword,
  addAddress,
  updateAddress,
  deleteAddress,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  deactivateUser,
};
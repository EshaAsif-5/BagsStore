import { body, param } from "express-validator";

// ─────────────────────────────────────────────
// SHARED FIELD VALIDATORS
// ─────────────────────────────────────────────

const nameField = (field = "name") =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ min: 2, max: 80 })
    .withMessage("Name must be between 2 and 80 characters.");

const emailField = (field = "email") =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail();

const phoneField = (field = "phone", required = false) => {
  const chain = body(field).trim();
  if (!required) {
    chain.optional({ nullable: true, checkFalsy: true });
  } else {
    chain.notEmpty().withMessage("Phone number is required.");
  }
  return chain
    .matches(/^(\+92|0)[0-9]{10}$/)
    .withMessage(
      "Please provide a valid Pakistani phone number (e.g. 03001234567 or +923001234567)."
    );
};

const passwordField = (field = "password") =>
  body(field)
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 8, max: 64 })
    .withMessage("Password must be between 8 and 64 characters.")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number."
    );

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────
export const validateRegister = [
  nameField("name"),
  emailField("email"),
  phoneField("phone", false),
  passwordField("password"),
];

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
export const validateLogin = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required."),
];

// ─────────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────────
export const validateUpdateProfile = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Name must be between 2 and 80 characters."),

  phoneField("phone", false),
];

// ─────────────────────────────────────────────
// CHANGE PASSWORD
// ─────────────────────────────────────────────
export const validateChangePassword = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required."),

  passwordField("newPassword"),

  body("confirmPassword")
    .notEmpty()
    .withMessage("Please confirm your new password.")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Passwords do not match.");
      }
      return true;
    }),
];

// ─────────────────────────────────────────────
// ADD / UPDATE ADDRESS
// ─────────────────────────────────────────────
const VALID_PROVINCES = [
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Gilgit-Baltistan",
  "Azad Kashmir",
  "Islamabad Capital Territory",
];

export const validateAddress = [
  body("label")
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage("Address label cannot exceed 30 characters."),

  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required.")
    .isLength({ max: 80 })
    .withMessage("Full name cannot exceed 80 characters."),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required.")
    .matches(/^(\+92|0)[0-9]{10}$/)
    .withMessage("Please provide a valid Pakistani phone number."),

  body("street")
    .trim()
    .notEmpty()
    .withMessage("Street address is required.")
    .isLength({ max: 200 })
    .withMessage("Street address cannot exceed 200 characters."),

  body("city")
    .trim()
    .notEmpty()
    .withMessage("City is required.")
    .isLength({ max: 60 })
    .withMessage("City name cannot exceed 60 characters."),

  body("province")
    .trim()
    .notEmpty()
    .withMessage("Province is required.")
    .isIn(VALID_PROVINCES)
    .withMessage(
      `Province must be one of: ${VALID_PROVINCES.join(", ")}.`
    ),

  body("postalCode")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^[0-9]{5}$/)
    .withMessage("Postal code must be exactly 5 digits."),

  body("isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault must be a boolean value."),
];

// ─────────────────────────────────────────────
// PARAMS: MongoDB ObjectId
// ─────────────────────────────────────────────
export const validateObjectIdParam = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}. Must be a valid ID.`),
];
import { validationResult } from "express-validator";
import ApiError from "../utils/ApiError.js";

// ─────────────────────────────────────────────
// VALIDATE MIDDLEWARE
// Must be placed AFTER express-validator rule arrays in routes.
// Collects all validation errors and throws a single ApiError.
//
// Usage in routes:
//   router.post("/register", validateRegister, validate, controller)
// ─────────────────────────────────────────────
export const validate = (req, _res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg);

    // Throw the first error as the main message,
    // include all errors in the errors array for detailed client display.
    throw new ApiError(
      400,
      errorMessages[0],
      errorMessages
    );
  }

  next();
};
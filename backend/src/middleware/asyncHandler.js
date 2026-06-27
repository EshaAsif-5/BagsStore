// middleware/asyncHandler.js
// Wraps async route handler/controller functions so that any errors
// (rejected promises, thrown exceptions) are automatically passed to
// Express's error-handling middleware via next(error).
//
// Without this, every controller would need a try/catch block that
// calls next(error) manually — this wrapper removes that repetition.
//
// Usage in a controller:
//   const getProducts = asyncHandler(async (req, res) => {
//     const products = await Product.find();
//     res.json({ success: true, data: products });
//   });

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
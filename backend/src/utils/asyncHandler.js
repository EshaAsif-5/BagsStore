/**
 * Wraps async route handlers to automatically catch errors
 * and forward them to the global error handler via next().
 *
 * @param {Function} requestHandler - Async express route handler
 * @returns {Function} Express middleware function
 */
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch(next);
  };
};

export default asyncHandler;
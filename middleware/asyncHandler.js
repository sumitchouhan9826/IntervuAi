/**
 * Async handler middleware wrapper
 * Catches any unhandled Promise rejections in route handlers and forwards them to the Express error-handling middleware.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;

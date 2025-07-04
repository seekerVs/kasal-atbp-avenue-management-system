// This is a simple utility function that takes an asynchronous route handler
// and wraps it in a way that catches any errors and passes them to
// Express's global error handler (which we will create in index.js).
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
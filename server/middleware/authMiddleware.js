const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler'); // You are already using this pattern
const User = require('../models/Users'); // We need the User model to find the user from the token

/**
 * Protects routes by verifying the JWT token from the Authorization header.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check if the Authorization header exists and starts with "Bearer"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // 1. Get the token from the header (e.g., "Bearer <token>" -> "<token>")
      token = req.headers.authorization.split(' ')[1];

      // 2. Verify the token using your JWT_SECRET
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Find the user by the ID stored in the token and attach it to the request object.
      // We exclude the password from the object we attach to the request for security.
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
          res.status(401);
          throw new Error('Not authorized, user not found');
      }

      // 4. Proceed to the next middleware or the actual route handler
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      res.status(401); // 401 Unauthorized
      throw new Error('Not authorized, token failed');
    }
  }

  // If there's no token at all
  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

module.exports = { protect };
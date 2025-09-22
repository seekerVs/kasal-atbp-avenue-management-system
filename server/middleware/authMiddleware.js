const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/Users');

/**
 * Protects routes by verifying the JWT token from the Authorization header.
 * Attaches the authenticated user object to the request.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // We attach the full user object (excluding password) to req.user.
      // This is crucial for our new isSuperAdmin middleware to work.
      req.user = await User.findById(decoded.id).select('-passwordHash');
      
      if (!req.user) {
          res.status(401);
          throw new Error('Not authorized, user not found');
      }

      // add a check to ensure the user's account is active.
      if (req.user.status !== 'active') {
          res.status(403); // 403 Forbidden
          throw new Error('Not authorized, account is inactive or suspended.');
      }

      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});


/**
 * Authorizes routes for Super Admin users only.
 * This middleware MUST run AFTER the 'protect' middleware.
 */
const isSuperAdmin = (req, res, next) => {
    // We can check req.user because the 'protect' middleware already attached it.
    if (req.user && req.user.role === 'Super Admin') {
        // If the user exists and their role is 'Super Admin', proceed.
        next();
    } else {
        // If not, send a '403 Forbidden' error.
        res.status(403);
        throw new Error('Not authorized. This action requires Super Admin privileges.');
    }
};

module.exports = { protect, isSuperAdmin };
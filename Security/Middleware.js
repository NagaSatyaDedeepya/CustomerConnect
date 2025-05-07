// middleware/auth.js
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authenticateUser = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');  // Get token from the Authorization header
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);  // Decode token using JWT_SECRET
    req.userId = decoded.userId;  // Store the user ID in the request
    next();  // Call the next middleware or route handler
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

module.exports = authenticateUser;

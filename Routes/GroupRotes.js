// routes/groupRoutes.js
const express = require('express');
const authenticateUser = require('../middleware/auth'); // Middleware to verify JWT token
const { createGroup } = require('../controllers/groupController');

const router = express.Router();

// Create a new group
router.post('/create', authenticateUser, createGroup);

module.exports = router;

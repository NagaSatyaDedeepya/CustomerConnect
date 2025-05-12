// routes/groupRoutes.js
const express = require('express');
const authenticateUser = require('../Security/Middleware'); // Middleware to verify JWT token
const { createGroup ,getCustomersByGroupId} = require('../Controller/GroupController');

const router = express.Router();

// Create a new group
router.post('/create', authenticateUser, createGroup);
router.get('/get/:groupId', authenticateUser, getCustomersByGroupId);

module.exports = router;

const express = require('express');
const router = express.Router();
const { createGmailProvider } = require('../Controller/EmailProviderControler');
const verifyAuth = require('../Security/Middleware');

router.post('/create', verifyAuth, createGmailProvider);


module.exports = router;

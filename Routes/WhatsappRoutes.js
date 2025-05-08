const express = require('express');
const router = express.Router();
const { createWhatsAppProvider } = require('../Controller/WhatsappProviderController');


const verifyAuth = require('../Security/Middleware'); 

router.post('/create', verifyAuth, createWhatsAppProvider);


module.exports = router;

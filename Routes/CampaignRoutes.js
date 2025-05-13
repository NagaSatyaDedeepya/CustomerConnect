const express = require('express');
const router = express.Router();
const campaignController = require('../Controller/CampaignController');
const authMiddleware = require('../Security/Middleware'); // to get req.user
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Create campaign (with optional file upload)
router.post('/campaigns', authMiddleware, upload.single('file'), campaignController.createCampaign);

// Get campaign status
router.get('/campaigns/:campaignId/status', authMiddleware, campaignController.getCampaignStatus);

// Send campaign manually now
router.post('/campaigns/:campaignId/send', authMiddleware, campaignController.sendCampaignNow);

module.exports = router;

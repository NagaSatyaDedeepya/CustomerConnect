const express = require('express');
const router = express.Router();
const campaignController = require('../Controller/CampaignController');
const authMiddleware = require('../Security/Middleware'); // to get req.user


router.post('/campaigns', authMiddleware,campaignController.createCampaign);
router.get('/campaigns/:campaignId/status',authMiddleware, campaignController.getCampaignStatus);
router.post('/campaigns/:campaignId/send', campaignController.sendCampaignNow);

module.exports = router;

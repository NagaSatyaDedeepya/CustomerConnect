const Campaign = require('../Model/Campagin');
const Customer = require('../Model/Customer');
const Group = require('../Model/Groups');
const Message = require('../Model/Message');
const sendEmail = require('../Utils/SendEmail');
const { processCampaign } = require('../Utils/Scheduler');

// Create a new campaign
exports.createCampaign = async (req, res) => {
  try {
    const {
      campaignName, campaignType, audienceType,
      groupId, importedCustomers, scheduledAt, content, attachmentUrl
    } = req.body;

    const userId = req.userId;  // assuming user is authenticated

    // Validate attachment URL if provided
    if (attachmentUrl) {
      try {
        await validateAttachmentUrl(attachmentUrl);
      } catch (error) {
        return res.status(400).json({ 
          error: `Invalid attachment URL: ${error.message}` 
        });
      }
    }

    // Create campaign
    const campaign = new Campaign({
      userId,
      campaignName,
      campaignType,
      audienceType,
      groupId: audienceType === 'group' ? groupId : null,
      importedCustomers: audienceType === 'import' ? importedCustomers : [],
      scheduledAt: scheduledAt || null,
      status: scheduledAt ? 'scheduled' : 'pending', // Start with pending if immediate, scheduled if timed
    });
    await campaign.save();

    // Create message
    const message = new Message({
      campaignId: campaign._id,
      content,
      attachmentUrl
    });
    await message.save();

    // Process campaign immediately if not scheduled
    if (!scheduledAt) {
      // Queue the email sending process
      processCampaign(campaign._id)
        .catch(err => console.error(`Campaign processing error: ${err.message}`));
      
      // Return response immediately while processing happens in background
      return res.status(201).json({
        campaign,
        message,
        status: 'processing',
        message: 'Campaign created and emails are being sent'
      });
    } else {
      // Campaign will be picked up by the scheduler
      res.status(201).json({ 
        campaign, 
        message,
        status: 'scheduled',
        scheduledAt
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
};

// Remove the local processCampaign and scheduleEmailCampaign functions as they're now in the scheduler module

// Utility to validate an attachment URL
const validateAttachmentUrl = async (url) => {
  const axios = require('axios');
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('URL must start with http:// or https://');
  }
  
  try {
    // Just do a HEAD request to check if the URL is accessible
    const response = await axios.head(url);
    if (response.status !== 200) {
      throw new Error(`URL returned status code ${response.status}`);
    }
    
    // Check content type to ensure it's an image or supported attachment
    const contentType = response.headers['content-type'];
    if (contentType && !contentType.startsWith('image/') && 
        !contentType.includes('application/pdf') && 
        !contentType.includes('application/msword') &&
        !contentType.includes('application/vnd.openxmlformats')) {
      console.warn(`Warning: URL content type ${contentType} may not be a valid attachment`);
    }
    
    return true;
  } catch (error) {
    console.error(`URL validation failed for ${url}: ${error.message}`);
    throw new Error(`URL validation failed: ${error.message}`);
  }
};

// Send campaign now (manual trigger)
exports.sendCampaignNow = async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    if (['processing', 'completed'].includes(campaign.status)) {
      return res.status(400).json({ 
        error: `Campaign is already ${campaign.status}` 
      });
    }
    
    // Update status to processing
    await Campaign.findByIdAndUpdate(campaignId, { status: 'processing' });
    
    // Queue the processing and return immediately
    processCampaign(campaignId)
      .catch(err => console.error(`Manual campaign processing error: ${err.message}`));
    
    res.json({ 
      message: 'Campaign sending started',
      status: 'processing'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
};

// Get campaign status and results
exports.getCampaignStatus = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json({
      campaignId: campaign._id,
      status: campaign.status,
      results: campaign.results || {},
      error: campaign.error || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get campaign status' });
  }
};
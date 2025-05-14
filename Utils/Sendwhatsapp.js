// Utils/SendWhatsapp.js
const axios = require('axios');
const WhatsAppProvider = require('../Model/WhatsappCredentials');

/**
 * Send WhatsApp message using AiSensy API
 * @param {string} userId - The user ID who created the campaign
 * @param {string} phoneNumber - Customer's phone number
 * @param {string} fullName - Customer's full name for personalization
 * @param {string} campaignName - Name of the campaign
 * @param {string} templateName - Name of the WhatsApp template
 * @param {string} attachmentUrl - Optional media URL
 * @returns {Promise} - Response from AiSensy API
 */
const sendWhatsApp = async (userId, phoneNumber, fullName, campaignName, templateName, attachmentUrl) => {
  try {
    // Get user's WhatsApp API credentials
    const provider = await WhatsAppProvider.findOne({ createdBy: userId });
    if (!provider) {
      throw new Error('WhatsApp provider configuration not found');
    }

    const apiKey = provider.apiKey;
    const url = 'https://backend.aisensy.com/campaign/message';
    
    // Format phone number (ensure it has country code - using 91 for India as default)
    const formattedPhone = phoneNumber.startsWith('91') ? phoneNumber : `91${phoneNumber}`;
    
    // Setup request payload
    const data = {
      apiKey: apiKey,
      campaignName: campaignName,
      destination: formattedPhone,
      userName: "Incrivelsoft Private Limited", // This could be made dynamic based on user settings
      templateName: templateName,  // Using the template name from the campaign
      templateParams: [fullName || 'user'],  // Using customer's name as parameter
      source: 'campaign',
      paramsFallbackValue: {
        FirstName: fullName || 'user'
      }
    };
    
    // Add media if attachment URL is provided
    if (attachmentUrl) {
      data.media = {
        url: attachmentUrl,
        filename: 'attachment'
      };
    }

    // Send WhatsApp message
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status !== 200) {
      throw new Error(`Failed with status: ${response.status} - ${response.statusText}`);
    }

    return response.data;
    
  } catch (error) {
    console.error(`WhatsApp sending error for ${phoneNumber}:`, error.message);
    throw error;
  }
};

module.exports = sendWhatsApp;
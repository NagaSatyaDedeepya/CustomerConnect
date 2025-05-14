// Fixed sendWhatsApp implementation with detailed logging
const axios = require('axios');
const WhatsAppProvider = require('../Model/WhatsappCredentials');

/**
 * Send WhatsApp message using AiSensy API with enhanced logging
 * @param {string} userId - The user ID who created the campaign
 * @param {string} phoneNumber - Customer's phone number
 * @param {string} fullName - Customer's full name for personalization
 * @param {string} campaignName - Name of the campaign
 * @param {string} templateName - Name of the WhatsApp template
 * @param {string} attachmentUrl - Optional media URL
 * @returns {Promise} - Response from AiSensy API
 */
const sendWhatsApp = async (userId, phoneNumber, fullName, campaignName, templateName, attachmentUrl) => {
  console.log(`📱 Attempting to send WhatsApp to ${fullName} (${phoneNumber})`);
  
  try {
    // Input validation
    if (!userId) throw new Error('Missing userId');
    if (!phoneNumber) throw new Error('Missing phoneNumber');
    if (!templateName) throw new Error('Missing templateName');
    
    console.log(`🔍 Looking up WhatsApp provider for user ${userId}`);
    
    // Get user's WhatsApp API credentials
    const provider = await WhatsAppProvider.findOne({ createdBy: userId });
    if (!provider) {
      console.error(`❌ No WhatsApp provider found for user ${userId}`);
      throw new Error('WhatsApp provider configuration not found');
    }
    
    if (!provider.apiKey) {
      console.error(`❌ WhatsApp provider found but no API key is configured`);
      throw new Error('WhatsApp API key not configured');
    }

    console.log(`✅ Found WhatsApp provider with API key: ${provider.apiKey.substring(0, 4)}...`);
    
    const apiKey = provider.apiKey;
    const url = 'https://backend.aisensy.com/campaign/message';
    
    // Format phone number (ensure it has country code - using 91 for India as default)
    let formattedPhone = phoneNumber.trim();
    if (!/^\d+$/.test(formattedPhone)) {
      throw new Error(`Invalid phone number format: ${phoneNumber} - must contain only digits`);
    }
    
    // Add country code if missing
    if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
      formattedPhone = `91${formattedPhone}`;
    }
    
    console.log(`📞 Formatted phone number: ${formattedPhone}`);
    
    // Setup request payload
    const data = {
      apiKey: apiKey,
      campaignName: campaignName,
      destination: formattedPhone,
      userName: "Incrivelsoft Private Limited", // Could be made dynamic
      templateName: templateName,
      templateParams: [fullName || 'user'],
      source: 'campaign',
      paramsFallbackValue: {
        FirstName: fullName || 'user'
      }
    };
    
    // Add media if attachment URL is provided
    if (attachmentUrl) {
      console.log(`🖼️ Adding media attachment: ${attachmentUrl}`);
      data.media = {
        url: attachmentUrl,
        filename: 'attachment'
      };
    }

    console.log(`🚀 Sending WhatsApp request for ${formattedPhone}:`, JSON.stringify(data, null, 2));
    
    // Send WhatsApp message
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`📊 AiSensy API response status: ${response.status}`);
    
    if (response.status !== 200) {
      console.error(`❌ Failed with status: ${response.status} - ${response.statusText}`);
      throw new Error(`Failed with status: ${response.status} - ${response.statusText}`);
    }

    console.log(`✅ Successfully sent WhatsApp to ${fullName} (${formattedPhone})`);
    return response.data;
    
  } catch (error) {
    // Enhanced error logging
    if (error.response) {
      // The request was made and the server responded with a status code outside of 2xx
      console.error(`❌ AiSensy API error for ${phoneNumber}:`, {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error(`❌ No response from AiSensy API for ${phoneNumber}:`, error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error(`❌ Error in WhatsApp request setup for ${phoneNumber}:`, error.message);
    }
    
    throw error;
  }
};

module.exports = sendWhatsApp;
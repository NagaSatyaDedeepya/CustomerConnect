const axios = require('axios');
const WhatsAppProvider = require('../Model/WhatsappCredentials');

const sendWhatsApp = async (userId, phoneNumber, fullName, campaignName, templateName, attachmentUrl) => {
  console.log(`📱 Attempting to send WhatsApp to ${fullName} (${phoneNumber})`);
  
  try {
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
    const userName = provider.userName || "Incrivelsoft Private Limited";
    const url = 'https://backend.aisensy.com/campaign/t1/api/v2';

    // Ensure phone has +91 prefix
    const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `91${phoneNumber}`;

    const data = {
      apiKey :apiKey,
      campaignName: campaignName,
      destination: formattedPhone,
      userName: userName,
      templateName: templateName,
      templateParams: [fullName || 'user'],
      source: 'selected-customer-campaign'
    };

    if (attachmentUrl) {
      console.log(`🖼️ Adding media attachment: ${attachmentUrl}`);
      data.media = {
        url: attachmentUrl,
        filename: 'image'
      };
    }

    // Debug log
    console.log('Sending WhatsApp with payload:', JSON.stringify(data, null, 2));

    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
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
    console.error(`WhatsApp sending error for ${phoneNumber}:`, error.response?.data || error.message);
    throw error;
  }
};

module.exports = sendWhatsApp;

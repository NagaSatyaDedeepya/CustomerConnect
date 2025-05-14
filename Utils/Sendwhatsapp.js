const axios = require('axios');
const WhatsAppProvider = require('../Model/WhatsappCredentials');

const sendWhatsApp = async (userId, phoneNumber, fullName, campaignName, templateName, attachmentUrl) => {
  try {
    const provider = await WhatsAppProvider.findOne({ createdBy: userId });
    if (!provider) {
      throw new Error('WhatsApp provider configuration not found');
    }

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

    if (response.status !== 200) {
      throw new Error(`Failed with status: ${response.status} - ${response.statusText}`);
    }

    return response.data;

  } catch (error) {
    console.error(`WhatsApp sending error for ${phoneNumber}:`, error.response?.data || error.message);
    throw error;
  }
};

module.exports = sendWhatsApp;

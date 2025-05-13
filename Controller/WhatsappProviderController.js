const WhatsAppProvider = require('../Model/WhatsappCredentials');
const axios = require('axios');
const Group = require('../Model/Groups');
const Customer = require('../Model/Customer');
const xlsx = require('xlsx');
const path = require('path');
const createWhatsAppProvider = async (req, res) => {
  try {
    const { provider, apiKey, whatsappNumber, apiSecretKey } = req.body;

    if (!provider || !apiKey || !whatsappNumber || !apiSecretKey) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const newProvider = new WhatsAppProvider({
      provider,
      apiKey,
      whatsappNumber,
      apiSecretKey,
      createdBy: req.userId 
    });

    const saved = await newProvider.save();
    res.status(201).json({ message: 'WhatsApp provider created', provider: saved });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create WhatsApp provider' });
  }
};
const sendWhatsAppToCustomers = async (req, res) => {
  try {
    const {
      customerIds, // Array of MongoDB ObjectIds
      campaignName,
      templateName,
      imageUrl,
      fallbackFirstName = 'user',
      languageCode = 'en'
    } = req.body;

    // Validate input
    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0 || !campaignName || !imageUrl) {
      return res.status(400).json({ error: 'customerIds, campaignName, and imageUrl are required' });
    }

    // 1. Get user's WhatsApp API credentials
    const provider = await WhatsAppProvider.findOne({ createdBy: req.userId });
    if (!provider) {
      return res.status(404).json({ error: 'WhatsApp provider not found for user' });
    }

    const apiKey = provider.apiKey;
    const url = 'https://backend.aisensy.com/campaign/t1/api/v2';

    // 2. Fetch selected customers
    const customers = await Customer.find({ _id: { $in: customerIds }, userId: req.userId });
    if (!customers || customers.length === 0) {
      return res.status(404).json({ error: 'No matching customers found for provided IDs' });
    }

    // 3. Send message to each customer
    for (const customer of customers) {
      const data = {
        apiKey: apiKey,
        campaignName,
        destination: `91${customer.phoneNumber}`,
        userName: "Incrivelsoft Private Limited",
        templateParams: [customer.fullName || fallbackFirstName],
        source: 'selected-customer-campaign',
        media: {
          url: imageUrl,
          filename: 'image'
        },
        buttons: [],
        carouselCards: [],
        location: {},
        attributes: {},
        paramsFallbackValue: {
          FirstName: customer.fullName || fallbackFirstName
        }
      };

      console.log('Sending to:', data.destination, 'with name:', customer.fullName);

      try {
        await axios.post(url, data, {
          headers: {
            'Content-Type': 'application/json'
            // ❌ Do not include 'Authorization' or 'apiKey' in headers
          }
        });

        console.log(`✅ Sent to ${customer.fullName} (${customer.phoneNumber})`);
      } catch (err) {
        console.error(`❌ Failed for ${customer.fullName} (${customer.phoneNumber}):`, err.response?.data || err.message);
      }
    }

    res.status(200).json({ message: 'Messages sent to selected customers' });

  } catch (err) {
    console.error('❌ Error in sendWhatsAppToCustomers:', err);
    res.status(500).json({ error: 'Failed to send messages to selected customers' });
  }
};

const sendWhatsAppToGroup = async (req, res) => {
  try {
    const {
      groupId,
      templateName,
      campaignName,
      imageUrl,
      fallbackFirstName = 'user',
      customMessage, // 👈 New message from Postman
      languageCode = 'en'
    } = req.body;

    if (!groupId || !templateName || !campaignName || !imageUrl || !customMessage) {
      return res.status(400).json({
        error: 'groupId, templateName, campaignName, imageUrl, and customMessage are required'
      });
    }

    const provider = await WhatsAppProvider.findOne({ createdBy: req.userId });
    if (!provider) {
      return res.status(404).json({ error: 'WhatsApp provider not found for user' });
    }

    const group = await Group.findOne({ _id: groupId, userId: req.userId }).populate('customers');
    if (!group || !group.customers || group.customers.length === 0) {
      return res.status(404).json({ error: 'Group not found or no customers in the group' });
    }

    const apiKey = provider.apiKey;
    const url = 'https://backend.aisensy.com/campaign/t1/api/v2';

    for (const customer of group.customers) {
      const fullName = customer.fullName || fallbackFirstName;

      const data = {
        apiKey,
        campaignName,
        destination: `91${customer.phoneNumber}`,
        userName: "Incrivelsoft Private Limited",
        templateParams: [fullName, customMessage], // 👈 Name + offer/message
        source: "new-landing-page form",
        media: {
          url: imageUrl,
          filename: "sample_media"
        },
        buttons: [],
        carouselCards: [],
        location: {},
        attributes: {},
        paramsFallbackValue: {
          FirstName: fallbackFirstName
        }
      };

      console.log(`Sending to: ${data.destination}`);
      console.log(`Template Params: ${data.templateParams}`);

      try {
        await axios.post(url, data, {
          headers: { 'Content-Type': 'application/json' }
        });

        console.log(`✅ Sent to ${fullName} (${customer.phoneNumber})`);
      } catch (err) {
        console.error(`❌ Failed for ${fullName} (${customer.phoneNumber}):`, err.response?.data || err.message);
      }
    }

    res.status(200).json({ message: 'Messages sent to all customers in the group' });

  } catch (err) {
    console.error('❌ Error in sendWhatsAppToGroup:', err);
    res.status(500).json({ error: 'Failed to send messages to group' });
  }
};

const sendWhatsAppToCustomersFromExcel = async (req, res) => {
  try {
    const { templateName, campaignName, imageUrl, languageCode = 'en', fallbackFirstName = 'user' } = req.body;

    // Validate input
    if (!templateName || !campaignName || !imageUrl) {
      return res.status(400).json({ error: 'templateName, campaignName, and imageUrl are required' });
    }

    // Validate uploaded file
    if (!req.file) {
      return res.status(400).json({ error: 'Excel file is required' });
    }

    // Read the Excel file
    const filePath = path.join(__dirname, '..', 'uploads', 'excels', req.file.filename);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!sheetData || sheetData.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty or invalid' });
    }

    // Get WhatsApp API credentials
    const provider = await WhatsAppProvider.findOne({ createdBy: req.userId });
    if (!provider) {
      return res.status(404).json({ error: 'WhatsApp provider not found for user' });
    }

    const apiKey = provider.apiKey;
    const url = 'https://backend.aisensy.com/campaign/t1/api/v2';

    // Loop through each row in the Excel sheet
    for (const row of sheetData) {
      const fullName = row.fullName || row.name || row.Name;
      const phoneNumber = row.phoneNumber || row.Phone || row.phone;

      if (!fullName || !phoneNumber) {
        console.warn('Skipping row with missing name or phone:', row);
        continue;
      }

      // Prepare the data to send to AiSensy
      const data = {
        apiKey: apiKey,
        campaignName,
        destination: `91${phoneNumber}`,
        userName: "Incrivelsoft Private Limited", // You can change this if needed
        templateParams: [fullName || fallbackFirstName],
        source: 'excel-customer-campaign',
        media: {
          url: imageUrl,
          filename: 'image'
        },
        buttons: [],
        carouselCards: [],
        location: {},
        attributes: {},
        paramsFallbackValue: {
          FirstName: fullName || fallbackFirstName
        }
      };

      console.log(`Sending to ${fullName} (${phoneNumber})`);

      try {
        await axios.post(url, data, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log(`✅ Sent to ${fullName} (${phoneNumber})`);
      } catch (err) {
        console.error(`❌ Failed for ${fullName}:`, err.response?.data || err.message);
      }
    }

    res.status(200).json({ message: 'WhatsApp messages sent to customers from Excel (check server logs)' });

  } catch (err) {
    console.error('❌ Error sending messages from Excel:', err);
    res.status(500).json({ error: 'Internal server error while sending messages' });
  }
};


module.exports = {
  createWhatsAppProvider, sendWhatsAppToCustomers,sendWhatsAppToGroup, sendWhatsAppToCustomersFromExcel
 
};

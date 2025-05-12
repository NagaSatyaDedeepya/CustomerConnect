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
    const { templateName, campaignName, languageCode = 'en' } = req.body;

    // Validate input
    if (!templateName || !campaignName) {
      return res.status(400).json({ error: 'templateName and campaignName are required' });
    }

    // Step 1: Get WhatsApp credentials for the user
    const provider = await WhatsAppProvider.findOne({ createdBy: req.userId });
    if (!provider) {
      return res.status(404).json({ error: 'WhatsApp provider not found for user' });
    }

    const apiKey = provider.apiKey;
    const url = 'https://backend.aisensy.com/campaign/message';

    // Step 2: Get customers of this user
    const customers = await Customer.find({ createdBy: req.userId });
    if (customers.length === 0) {
      return res.status(404).json({ error: 'No customers found for this user' });
    }

    // Step 3: Send messages one by one
    for (const customer of customers) {
      const data = {
        campaignName,
        destination: `91${customer.phoneNumber}`, // Include country code
        user: {
          name: customer.fullName
        },
        template: {
          name: templateName,
          languageCode,
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: customer.fullName }
                // Add more parameters here if your template needs them
              ]
            }
          ]
        }
      };

      try {
        await axios.post(url, data, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': apiKey
          }
        });
        console.log(`✅ Message sent to ${customer.fullName} (${customer.phoneNumber})`);
      } catch (err) {
        console.error(`❌ Failed to send to ${customer.fullName}:`, err.response?.data || err.message);
      }
    }

    res.status(200).json({ message: 'Messages sent to all customers (check server logs for failures)' });

  } catch (err) {
    console.error('❌ Error in sendWhatsAppToCustomers:', err);
    res.status(500).json({ error: 'Failed to send WhatsApp messages' });
  }
};

const sendWhatsAppToGroup = async (req, res) => {
  try {
    const { groupId, templateName, campaignName, languageCode = 'en' } = req.body;

    // Validate input
    if (!groupId || !templateName || !campaignName) {
      return res.status(400).json({ error: 'groupId, templateName, and campaignName are required' });
    }

    // 1. Get user's WhatsApp API credentials
    const provider = await WhatsAppProvider.findOne({ createdBy: req.userId });
    if (!provider) {
      return res.status(404).json({ error: 'WhatsApp provider not found for user' });
    }

    // 2. Get group with populated customers
    const group = await Group.findOne({ _id: groupId, userId: req.userId }).populate('customers');
    if (!group || !group.customers || group.customers.length === 0) {
      return res.status(404).json({ error: 'Group not found or no customers in the group' });
    }

    const apiKey = provider.apiKey;
    const url = 'https://backend.aisensy.com/campaign/message';

    // 3. Send WhatsApp message to each customer
    for (const customer of group.customers) {
      const data = {
        campaignName,
        destination: `91${customer.phoneNumber}`, // Format with country code
        user: {
          name: customer.fullName
        },
        template: {
          name: templateName,
          languageCode,
          // Optional dynamic parameters (must match your AiSensy template structure)
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: customer.fullName },
                // Add more parameters here if your template expects more
              ]
            }
          ]
        }
      };

      try {
        await axios.post(url, data, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': apiKey
          }
        });
        console.log(`✅ Message sent to ${customer.fullName}`);
      } catch (err) {
        console.error(`❌ Error sending to ${customer.fullName}:`, err.response?.data || err.message);
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
    const { templateName, campaignName, languageCode = 'en' } = req.body;

    if (!templateName || !campaignName) {
      return res.status(400).json({ error: 'templateName and campaignName are required' });
    }

    // Validate uploaded file
    if (!req.file) {
      return res.status(400).json({ error: 'Excel file is required' });
    }

    // Read Excel file
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
    const url = 'https://backend.aisensy.com/campaign/message';

    // Loop through each row of Excel
    for (const row of sheetData) {
      const fullName = row.fullName || row.name || row.Name;
      const phoneNumber = row.phoneNumber || row.Phone || row.phone;

      if (!fullName || !phoneNumber) {
        console.warn('Skipping row with missing name or phone:', row);
        continue;
      }

      const data = {
        campaignName,
        destination: `91${phoneNumber}`,
        user: {
          name: fullName
        },
        template: {
          name: templateName,
          languageCode,
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: fullName }
              ]
            }
          ]
        }
      };

      try {
        await axios.post(url, data, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: apiKey
          }
        });
        console.log(`✅ Sent to ${fullName} (${phoneNumber})`);
      } catch (err) {
        console.error(`❌ Failed for ${fullName}:`, err.response?.data || err.message);
      }
    }

    res.status(200).json({ message: 'WhatsApp messages sent from Excel (check server logs)' });

  } catch (err) {
    console.error('❌ Error sending messages from Excel:', err);
    res.status(500).json({ error: 'Internal server error while sending messages' });
  }
};



module.exports = {
  createWhatsAppProvider, sendWhatsAppToCustomers,sendWhatsAppToGroup, sendWhatsAppToCustomersFromExcel
 
};

const WhatsAppProvider = require('../Model/WhatsappCredentials');

// Create provider
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



module.exports = {
  createWhatsAppProvider,
 
};

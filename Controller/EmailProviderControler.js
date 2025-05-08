const GmailProvider = require('../Model/EmailProvider');

const createGmailProvider = async (req, res) => {
  try {
    const { gmailProvider, emailAddress, password, smtpHost, smtpPort } = req.body;

    if (!gmailProvider || !emailAddress || !password || !smtpHost || !smtpPort) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    
    const newGmailProvider = new GmailProvider({
      gmailProvider,
      emailAddress,
      password,
      smtpHost,
      smtpPort,
      createdBy: req.userId 
    });

    
    const saved = await newGmailProvider.save();
    res.status(201).json({ message: 'Gmail provider created', provider: saved });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create Gmail provider' });
  }
};



module.exports = {
  createGmailProvider,
 
};

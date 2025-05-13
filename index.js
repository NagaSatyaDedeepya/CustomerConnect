const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const userRoutes = require('./Routes/UserRoutes');
const customerRoutes = require('./Routes/CustomerRoutes');
const groupRoutes=require('./Routes/GroupRoutes')
const whatsappprovider=require('./Routes/WhatsappRoutes');
const emailProvider=require('./Routes/EmailProviderRoutes')
const campaign=require('./Routes/CampaignRoutes')

dotenv.config();
const app = express();


app.use(express.json());


const uploadDir = path.join(__dirname, 'uploads/logos');
fs.mkdirSync(uploadDir, { recursive: true });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes); 
app.use('/api/groups',groupRoutes);
app.use('/api/whatsapp',whatsappprovider)
app.use('/api/email',emailProvider)
app.use('/api/campaign',campaign)

// Global error handler (catches multer and other errors)
app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err);
  res.status(500).json({ error: 'Internal server error' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

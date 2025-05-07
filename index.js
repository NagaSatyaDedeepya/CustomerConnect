const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load .env variables
dotenv.config();

const app = express();
app.use(express.json());

// Auto-create uploads/logos folder
const uploadDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads/logos');
fs.mkdirSync(uploadDir, { recursive: true });

// Serve static files from uploads
app.use('/uploads', express.static('uploads'));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Load user routes
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const userRoutes = require('./Routes/UserRoutes');
const customerRoutes = require('./Routes/CustomerRoutes');

dotenv.config();
const app = express();

// Middleware to parse JSON for application/json requests
app.use(express.json());

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads/logos');
fs.mkdirSync(uploadDir, { recursive: true });

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routes (routes should handle their own multer/form parsers if needed)
app.use('/api/users', userRoutes); // Handles registration, login, file uploads
app.use('/api/customers', customerRoutes); // Handles customer add/update

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

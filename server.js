const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const app = express();

// Enhanced CORS configuration
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:8080',
        'https://remarkable-sunburst-88f5ff.netlify.app/', // Replace with your actual Netlify URL
        'https://*.netlify.app' // All Netlify subdomains
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/tasks', require('./routes/tasks'));

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Kedia CRM Backend is running',
        timestamp: new Date().toISOString()
    });
});

// Create default users function
async function createDefaultUsers() {
    try {
        // Check if admin user already exists
        const adminExists = await User.findOne({ email: 'admin@kedia.com' });
        if (!adminExists) {
            const adminPassword = await bcrypt.hash('admin123', 12);
            const adminUser = new User({
                name: 'Admin User',
                email: 'admin@kedia.com',
                password: adminPassword,
                type: 'admin',
                phone: '9876543210'
            });
            await adminUser.save();
            console.log('✅ Default admin user created');
        }

        // Check if staff user already exists
        const staffExists = await User.findOne({ email: 'staff@kedia.com' });
        if (!staffExists) {
            const staffPassword = await bcrypt.hash('staff123', 12);
            const staffUser = new User({
                name: 'Staff User',
                email: 'staff@kedia.com',
                password: staffPassword,
                type: 'staff',
                phone: '9876543211',
                department: 'Operations'
            });
            await staffUser.save();
            console.log('✅ Default staff user created');
        }

        console.log('✅ Default users setup completed');
    } catch (error) {
        console.error('❌ Error creating default users:', error);
    }
}

// MongoDB connection with default users creation
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB connected successfully');
        
        // Create default users after successful connection
        await createDefaultUsers();
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        // Retry after 5 seconds
        setTimeout(connectDB, 5000);
    }
};

connectDB();

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: https://your-backend.onrender.com/health`);
});
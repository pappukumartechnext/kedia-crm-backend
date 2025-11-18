const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// Enhanced CORS configuration
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8080',
    'https://remarkable-sunburst-88f5ff.netlify.app/',
    'https://*.netlify.app'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/tasks', require('./routes/tasks'));

// Enhanced health check route
app.get('/health', async (req, res) => {
    try {
        const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
        
        res.status(200).json({ 
            status: 'OK', 
            message: 'Kedia CRM Backend is running',
            database: dbStatus,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'Error', 
            message: 'Health check failed',
            error: error.message 
        });
    }
});

// Test database connection route
app.get('/api/test-db', async (req, res) => {
    try {
        // Test database connection by counting users
        const User = require('./models/User');
        const userCount = await User.countDocuments();
        
        res.json({
            success: true,
            message: 'Database connection successful',
            userCount: userCount,
            database: mongoose.connection.name,
            connectionState: mongoose.connection.readyState
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Database connection failed',
            error: error.message
        });
    }
});

// Create default users function
async function createDefaultUsers() {
    try {
        const User = require('./models/User');
        
        // Check if admin user already exists
        const adminExists = await User.findOne({ email: 'admin@kedia.com' });
        if (!adminExists) {
            const adminPassword = await bcrypt.hash('admin123', 12);
            const adminUser = new User({
                name: 'Admin User',
                email: 'admin@kedia.com',
                password: adminPassword,
                type: 'admin',
                phone: '9876543210',
                department: 'Administration'
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

// Enhanced MongoDB connection with retry logic
const connectDB = async (retries = 5, delay = 5000) => {
    try {
        console.log('🔄 Attempting MongoDB connection...');
        
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📊 Database: ${conn.connection.name}`);
        
        // Create default users after successful connection
        await createDefaultUsers();
        
    } catch (error) {
        console.error(`❌ MongoDB connection error (Attempt ${6 - retries}/5):`, error.message);
        
        if (retries > 0) {
            console.log(`🔄 Retrying connection in ${delay/1000} seconds...`);
            setTimeout(() => connectDB(retries - 1, delay), delay);
        } else {
            console.error('💥 Failed to connect to MongoDB after multiple attempts');
            process.exit(1);
        }
    }
};

// MongoDB connection events
mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
});

// Connect to database
connectDB();

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: http://0.0.0.0:${PORT}/health`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
});
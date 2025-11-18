const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const app = express();

// Enhanced CORS Configuration
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8080',
        'https://remarkable-sunburst-88f5ff.netlify.app',
        'https://*.netlify.app'
    ],
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
            environment: process.env.NODE_ENV || 'development',
            cors: {
                enabled: true,
                allowedOrigins: [
                    'http://localhost:3000',
                    'http://localhost:8080',
                    'https://remarkable-sunburst-88f5ff.netlify.app',
                    'https://*.netlify.app'
                ]
            }
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'Error', 
            message: 'Health check failed',
            error: error.message 
        });
    }
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
    res.json({
        message: 'CORS is working correctly!',
        timestamp: new Date().toISOString(),
        requestOrigin: req.headers.origin || 'No origin header',
        corsEnabled: true
    });
});

// Test database connection route
app.get('/api/test-db', async (req, res) => {
    try {
        // Test database connection by counting users
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

// DEBUG: List all users endpoint
app.get('/api/debug-users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json({
            success: true,
            totalUsers: users.length,
            users: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message
        });
    }
});

// DEBUG: Check specific user
app.get('/api/debug-user/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        if (!user) {
            return res.json({
                success: false,
                message: `User with email ${req.params.email} not found`
            });
        }

        // Test password verification
        const testPassword = 'admin123';
        const isPasswordValid = await bcrypt.compare(testPassword, user.password);

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                type: user.type,
                dateAdded: user.dateAdded,
                isActive: user.isActive
            },
            passwordTest: {
                testPassword: testPassword,
                isPasswordValid: isPasswordValid,
                hashedPassword: user.password.substring(0, 20) + '...'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to check user',
            error: error.message
        });
    }
});

// COMPLETE RESET ENDPOINT - This will fix login issues
app.post('/api/reset-users-complete', async (req, res) => {
    try {
        console.log('🔄 COMPLETE USER RESET INITIATED...');
        
        // Delete all existing users
        const deleteResult = await User.deleteMany({});
        console.log(`🗑️  Deleted ${deleteResult.deletedCount} users`);
        
        // Create fresh admin user
        const adminPassword = await bcrypt.hash('admin123', 12);
        const adminUser = new User({
            name: 'Admin User',
            email: 'admin@kedia.com',
            password: adminPassword,
            type: 'admin',
            phone: '9876543210',
            department: 'Administration',
            dateAdded: new Date(),
            isActive: true
        });
        await adminUser.save();
        console.log('✅ Admin user created:', adminUser.email);

        // Create fresh staff user
        const staffPassword = await bcrypt.hash('staff123', 12);
        const staffUser = new User({
            name: 'Staff User',
            email: 'staff@kedia.com',
            password: staffPassword,
            type: 'staff',
            phone: '9876543211',
            department: 'Operations',
            dateAdded: new Date(),
            isActive: true
        });
        await staffUser.save();
        console.log('✅ Staff user created:', staffUser.email);

        // Verify creation
        const userCount = await User.countDocuments();
        const users = await User.find().select('name email type dateAdded isActive');

        res.json({
            success: true,
            message: '✅ USERS RESET SUCCESSFULLY! You can now login with:',
            resetDetails: {
                deletedUsers: deleteResult.deletedCount,
                createdUsers: userCount,
                newUsers: users
            },
            loginCredentials: {
                admin: { email: 'admin@kedia.com', password: 'admin123' },
                staff: { email: 'staff@kedia.com', password: 'staff123' }
            },
            nextSteps: [
                '1. Try logging in with admin@kedia.com / admin123',
                '2. If successful, you can remove the reset endpoints',
                '3. Test both admin and staff accounts'
            ]
        });

    } catch (error) {
        console.error('❌ Reset failed:', error);
        res.status(500).json({ 
            success: false,
            message: 'Reset failed', 
            error: error.message,
            stack: process.env.NODE_ENV === 'production' ? null : error.stack
        });
    }
});

// Create default users function (for normal startup)
async function createDefaultUsers() {
    try {
        console.log('🔍 Checking for default users...');
        
        // Check if admin user exists
        const adminExists = await User.findOne({ email: 'admin@kedia.com' });
        if (!adminExists) {
            console.log('👤 Creating admin user...');
            const adminPassword = await bcrypt.hash('admin123', 12);
            const adminUser = new User({
                name: 'Admin User',
                email: 'admin@kedia.com',
                password: adminPassword,
                type: 'admin',
                phone: '9876543210',
                department: 'Administration',
                dateAdded: new Date(),
                isActive: true
            });
            await adminUser.save();
            console.log('✅ Default admin user created');
        } else {
            console.log('✅ Admin user already exists');
        }

        // Check if staff user exists
        const staffExists = await User.findOne({ email: 'staff@kedia.com' });
        if (!staffExists) {
            console.log('👤 Creating staff user...');
            const staffPassword = await bcrypt.hash('staff123', 12);
            const staffUser = new User({
                name: 'Staff User',
                email: 'staff@kedia.com',
                password: staffPassword,
                type: 'staff',
                phone: '9876543211',
                department: 'Operations',
                dateAdded: new Date(),
                isActive: true
            });
            await staffUser.save();
            console.log('✅ Default staff user created');
        } else {
            console.log('✅ Staff user already exists');
        }

        // Log current user status
        const userCount = await User.countDocuments();
        console.log(`📊 Total users in database: ${userCount}`);
        
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
    console.log(`📍 CORS Test: http://0.0.0.0:${PORT}/api/cors-test`);
    console.log(`📍 Debug Users: http://0.0.0.0:${PORT}/api/debug-users`);
    console.log(`📍 User Reset: http://0.0.0.0:${PORT}/api/reset-users-complete (USE THIS TO FIX LOGIN)`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
    console.log('\n🔑 Default Login Credentials:');
    console.log('   Admin: admin@kedia.com / admin123');
    console.log('   Staff: staff@kedia.com / staff123');
    console.log('\n🚨 TROUBLESHOOTING:');
    console.log('   If login fails, visit the reset endpoint above');
});

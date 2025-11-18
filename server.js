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

// DEBUG: Test password hashing directly
app.get('/api/test-password', async (req, res) => {
    try {
        const testPassword = 'admin123';
        const hash = await bcrypt.hash(testPassword, 12);
        const verify = await bcrypt.compare(testPassword, hash);
        
        res.json({
            testPassword: testPassword,
            generatedHash: hash,
            verificationResult: verify,
            hashLength: hash.length,
            hashPrefix: hash.substring(0, 20) + '...'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// FIX: Complete user reset with verified password hashing
app.post('/api/fix-passwords', async (req, res) => {
    try {
        console.log('🔄 FIXING PASSWORD ISSUES...');
        
        // Test bcrypt first
        const testHash = await bcrypt.hash('admin123', 12);
        const testVerify = await bcrypt.compare('admin123', testHash);
        console.log('🔐 Bcrypt test:', { testVerify, hash: testHash.substring(0, 20) + '...' });

        // Delete all existing users
        const deleteResult = await User.deleteMany({});
        console.log(`🗑️  Deleted ${deleteResult.deletedCount} users`);

        // Create admin user with VERIFIED password
        const adminPassword = 'admin123';
        const adminHashedPassword = await bcrypt.hash(adminPassword, 12);
        const adminVerify = await bcrypt.compare(adminPassword, adminHashedPassword);
        
        console.log('🔐 Admin password verification:', adminVerify);
        
        const adminUser = new User({
            name: 'Admin User',
            email: 'admin@kedia.com',
            password: adminHashedPassword,
            type: 'admin',
            phone: '9876543210',
            department: 'Administration',
            dateAdded: new Date(),
            isActive: true
        });
        await adminUser.save();
        console.log('✅ Admin user created with verified password');

        // Create staff user with VERIFIED password
        const staffPassword = 'staff123';
        const staffHashedPassword = await bcrypt.hash(staffPassword, 12);
        const staffVerify = await bcrypt.compare(staffPassword, staffHashedPassword);
        
        console.log('🔐 Staff password verification:', staffVerify);
        
        const staffUser = new User({
            name: 'Staff User',
            email: 'staff@kedia.com',
            password: staffHashedPassword,
            type: 'staff',
            phone: '9876543211',
            department: 'Operations',
            dateAdded: new Date(),
            isActive: true
        });
        await staffUser.save();
        console.log('✅ Staff user created with verified password');

        // Verify the created users can login
        const verifyAdmin = await User.findOne({ email: 'admin@kedia.com' });
        const adminLoginTest = await bcrypt.compare('admin123', verifyAdmin.password);
        
        const verifyStaff = await User.findOne({ email: 'staff@kedia.com' });
        const staffLoginTest = await bcrypt.compare('staff123', verifyStaff.password);

        res.json({
            success: true,
            message: '✅ PASSWORDS FIXED SUCCESSFULLY!',
            passwordTests: {
                bcryptWorking: testVerify,
                adminPasswordValid: adminLoginTest,
                staffPasswordValid: staffLoginTest
            },
            loginCredentials: {
                admin: { email: 'admin@kedia.com', password: 'admin123' },
                staff: { email: 'staff@kedia.com', password: 'staff123' }
            },
            nextSteps: [
                '1. Try logging in immediately with the credentials above',
                '2. Check the /api/debug-user endpoints to verify',
                '3. Login should now work!'
            ]
        });

    } catch (error) {
        console.error('❌ Password fix failed:', error);
        res.status(500).json({ 
            success: false,
            message: 'Password fix failed', 
            error: error.message
        });
    }
});

// DEBUG: Enhanced user check with multiple password tests
app.get('/api/debug-user-enhanced/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        if (!user) {
            return res.json({
                success: false,
                message: `User with email ${req.params.email} not found`
            });
        }

        // Test multiple possible passwords
        const testPasswords = ['admin123', 'admin', 'password', '123456', 'staff123'];
        const passwordTests = {};

        for (const pwd of testPasswords) {
            passwordTests[pwd] = await bcrypt.compare(pwd, user.password);
        }

        // Test if we can create a matching hash
        const newHash = await bcrypt.hash('admin123', 12);
        const newHashMatch = await bcrypt.compare('admin123', newHash);

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
            passwordAnalysis: {
                currentHash: user.password,
                hashLength: user.password.length,
                hashPrefix: user.password.substring(0, 25) + '...',
                passwordTests: passwordTests,
                correctPassword: Object.keys(passwordTests).find(pwd => passwordTests[pwd]) || 'UNKNOWN'
            },
            bcryptTest: {
                newHashGenerated: newHash.substring(0, 25) + '...',
                newHashVerification: newHashMatch,
                bcryptWorking: newHashMatch
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

// Create default users function
async function createDefaultUsers() {
    try {
        console.log('🔍 Checking for default users...');
        
        const adminExists = await User.findOne({ email: 'admin@kedia.com' });
        if (!adminExists) {
            console.log('👤 Creating admin user...');
            const adminPassword = await bcrypt.hash('admin123', 12);
            const verify = await bcrypt.compare('admin123', adminPassword);
            console.log('🔐 Admin password verified during creation:', verify);
            
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
        }

        const staffExists = await User.findOne({ email: 'staff@kedia.com' });
        if (!staffExists) {
            console.log('👤 Creating staff user...');
            const staffPassword = await bcrypt.hash('staff123', 12);
            const verify = await bcrypt.compare('staff123', staffPassword);
            console.log('🔐 Staff password verified during creation:', verify);
            
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
        }

        const userCount = await User.countDocuments();
        console.log(`📊 Total users in database: ${userCount}`);
        
    } catch (error) {
        console.error('❌ Error creating default users:', error);
    }
}

// Enhanced MongoDB connection
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
        
        await createDefaultUsers();
        
    } catch (error) {
        console.error(`❌ MongoDB connection error:`, error.message);
        
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
    console.log(`📍 Test Password: http://0.0.0.0:${PORT}/api/test-password`);
    console.log(`📍 Fix Passwords: http://0.0.0.0:${PORT}/api/fix-passwords (USE THIS!)`);
    console.log(`📍 Debug User: http://0.0.0.0:${PORT}/api/debug-user-enhanced/admin@kedia.com`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
    console.log('\n🔑 Default Login Credentials:');
    console.log('   Admin: admin@kedia.com / admin123');
    console.log('   Staff: staff@kedia.com / staff123');
    console.log('\n🚨 IMMEDIATE FIX:');
    console.log('   Visit /api/fix-passwords to reset users with working passwords');
});

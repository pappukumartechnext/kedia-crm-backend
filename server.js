const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
require('dotenv').config();

const app = express();

// CORS Configuration
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

app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/tasks', require('./routes/tasks'));

// ✅ FIX: Add missing login endpoint at root level
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('🔐 Root login attempt:', email);

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            console.log('❌ User not found:', email);
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check active status
        if (user.isActive === false) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // Verify password
        console.log('🔐 Comparing passwords for:', email);
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('🔐 Password match result:', isMatch);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate token
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                type: user.type,
                name: user.name
            },
            process.env.JWT_SECRET || 'fallback_secret_key',
            { expiresIn: '7d' }
        );

        // Successful login
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                type: user.type,
                phone: user.phone,
                department: user.department
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: error.message
        });
    }
});

// ✅ FIX: Also keep the direct-login endpoint for testing
app.post('/api/direct-login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('🔐 Direct login attempt:', email);

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        if (user.isActive === false) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log('🔐 Password valid:', isPasswordValid);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const token = jwt.sign(
            { 
                userId: user._id,
                email: user.email,
                type: user.type,
                name: user.name
            },
            process.env.JWT_SECRET || 'fallback_secret_key',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                type: user.type,
                phone: user.phone,
                department: user.department
            }
        });

    } catch (error) {
        console.error('❌ Direct login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
});

// COMPLETE RESET
app.post('/api/hard-reset', async (req, res) => {
    try {
        console.log('🔄 HARD RESET INITIATED...');
        
        await User.deleteMany({});
        console.log('🗑️  All users deleted');

        const adminUser = new User({
            name: 'Admin User',
            email: 'admin@kedia.com',
            password: await bcrypt.hash('admin123', 10),
            type: 'admin',
            phone: '9876543210',
            department: 'Administration',
            dateAdded: new Date(),
            isActive: true
        });
        await adminUser.save();
        console.log('✅ Admin user created');

        const staffUser = new User({
            name: 'Staff User',
            email: 'staff@kedia.com',
            password: await bcrypt.hash('staff123', 10),
            type: 'staff',
            phone: '9876543211',
            department: 'Operations',
            dateAdded: new Date(),
            isActive: true
        });
        await staffUser.save();
        console.log('✅ Staff user created');

        res.json({
            success: true,
            message: 'HARD RESET COMPLETE!',
            credentials: {
                admin: { email: 'admin@kedia.com', password: 'admin123' },
                staff: { email: 'staff@kedia.com', password: 'staff123' }
            }
        });

    } catch (error) {
        console.error('❌ Hard reset failed:', error);
        res.status(500).json({
            success: false,
            message: 'Hard reset failed',
            error: error.message
        });
    }
});

// Health check
app.get('/health', async (req, res) => {
    try {
        const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
        res.status(200).json({ 
            status: 'OK', 
            database: dbStatus,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'Error', 
            error: error.message 
        });
    }
});

// List all available endpoints
app.get('/api/endpoints', (req, res) => {
    res.json({
        availableEndpoints: [
            'POST /api/login - Main login endpoint',
            'POST /api/direct-login - Alternative login',
            'POST /api/auth/login - Auth route login',
            'POST /api/hard-reset - Reset all users',
            'GET /api/health - Server health',
            'GET /api/debug-all - Debug info'
        ],
        testCredentials: {
            admin: 'admin@kedia.com / admin123',
            staff: 'staff@kedia.com / staff123'
        }
    });
});

// Debug all users
app.get('/api/debug-all', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        const totalUsers = await User.countDocuments();
        
        res.json({
            success: true,
            totalUsers,
            users,
            serverTime: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create default users
async function createDefaultUsers() {
    try {
        const adminExists = await User.findOne({ email: 'admin@kedia.com' });
        if (!adminExists) {
            const adminUser = new User({
                name: 'Admin User',
                email: 'admin@kedia.com',
                password: await bcrypt.hash('admin123', 10),
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
            const staffUser = new User({
                name: 'Staff User',
                email: 'staff@kedia.com',
                password: await bcrypt.hash('staff123', 10),
                type: 'staff',
                phone: '9876543211',
                department: 'Operations',
                dateAdded: new Date(),
                isActive: true
            });
            await staffUser.save();
            console.log('✅ Default staff user created');
        }
    } catch (error) {
        console.error('❌ Error creating default users:', error);
    }
}

// MongoDB connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB Connected');
        await createDefaultUsers();
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

connectDB();

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health: https://kedia-crm-backend.onrender.com/health`);
    console.log(`📍 Endpoints: https://kedia-crm-backend.onrender.com/api/endpoints`);
    console.log(`📍 Hard Reset: https://kedia-crm-backend.onrender.com/api/hard-reset`);
    console.log(`📍 Main Login: https://kedia-crm-backend.onrender.com/api/login`);
    console.log(`\n🔑 Test Credentials:`);
    console.log('   Admin: admin@kedia.com / admin123');
    console.log('   Staff: staff@kedia.com / staff123');
});

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// SIMPLIFIED LOGIN - Remove any complex logic
router.post('/login', async (req, res) => {
    try {
        console.log('🔐 Auth login attempt:', req.body.email);
        
        const { email, password } = req.body;

        // Basic validation
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

// Register route
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, type, phone, department } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Create new user
        const user = new User({
            name,
            email,
            password: await bcrypt.hash(password, 10),
            type: type || 'staff',
            phone,
            department,
            dateAdded: new Date(),
            isActive: true
        });

        await user.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id, email: user.email, type: user.type, name: user.name },
            process.env.JWT_SECRET || 'fallback_secret_key',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
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
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
});

module.exports = router;

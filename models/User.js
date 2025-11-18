const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    department: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        enum: ['admin', 'staff'],
        default: 'staff'
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    dateAdded: {
        type: Date,
        default: function() {
            return new Date(); // Use function to get current date
        }
    }
}, {
    timestamps: true
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        this.password = await bcrypt.hash(this.password, 12);
        next();
    } catch (error) {
        next(error);
    }
});

// Password comparison method - FIXED VERSION
userSchema.methods.correctPassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        console.error('Password comparison error:', error);
        return false;
    }
};

// Create indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ status: 1 });
userSchema.index({ type: 1 });

module.exports = mongoose.model('User', userSchema);

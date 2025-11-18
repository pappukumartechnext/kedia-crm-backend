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
        default: Date.now
    }
}, {
    timestamps: true
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Password comparison method
userSchema.methods.correctPassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Create indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ status: 1 });
userSchema.index({ type: 1 });

module.exports = mongoose.model('User', userSchema);

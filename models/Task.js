<<<<<<< HEAD
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  task: {
    type: String,
    required: true
  },
  dateAllocation: {
    type: Date,
    required: true
  },
  givenBy: {
    type: String,
    required: true
  },
  givenTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetDate: Date,
  stepsTaken: String,
  lastUpdated: Date,
  nextUpdate: Date,
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed'],
    default: 'Pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

=======
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  task: {
    type: String,
    required: true
  },
  dateAllocation: {
    type: Date,
    required: true
  },
  givenBy: {
    type: String,
    required: true
  },
  givenTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetDate: Date,
  stepsTaken: String,
  lastUpdated: Date,
  nextUpdate: Date,
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed'],
    default: 'Pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

>>>>>>> 846c1211543b726bac61a5334e07086ffc79e154
module.exports = mongoose.model('Task', taskSchema);
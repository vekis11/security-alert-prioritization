const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'analyst', 'engineer', 'viewer'],
    default: 'viewer'
  },
  profile: {
    firstName: String,
    lastName: String,
    department: String,
    phone: String,
    avatar: String
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      slack: { type: Boolean, default: false },
      critical_alerts: { type: Boolean, default: true },
      high_priority: { type: Boolean, default: true }
    },
    dashboard: {
      default_view: { type: String, default: 'overview' },
      refresh_interval: { type: Number, default: 30 },
      items_per_page: { type: Number, default: 25 }
    }
  },
  slack: {
    user_id: String,
    team_id: String,
    access_token: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update the updated_at field before saving
UserSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get user's full name
UserSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName || ''} ${this.profile.lastName || ''}`.trim();
});

// Ensure virtual fields are serialized
UserSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('User', UserSchema);

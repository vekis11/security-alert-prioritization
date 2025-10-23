const mongoose = require('mongoose');

const IntegrationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true,
    enum: ['tenable', 'crowdstrike', 'veracode', 'splunk', 'slack']
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive', 'error', 'testing'],
    default: 'inactive'
  },
  configuration: {
    // Tenable.io configuration
    tenable: {
      access_key: String,
      secret_key: String,
      base_url: { type: String, default: 'https://cloud.tenable.com' }
    },
    // CrowdStrike configuration
    crowdstrike: {
      client_id: String,
      client_secret: String,
      base_url: { type: String, default: 'https://api.crowdstrike.com' }
    },
    // Veracode configuration
    veracode: {
      api_id: String,
      api_key: String,
      base_url: { type: String, default: 'https://analysiscenter.veracode.com' }
    },
    // Splunk configuration
    splunk: {
      host: String,
      port: { type: Number, default: 8089 },
      username: String,
      password: String,
      token: String,
      index: String
    },
    // Slack configuration
    slack: {
      bot_token: String,
      signing_secret: String,
      webhook_url: String,
      channel: String
    }
  },
  settings: {
    sync_interval: { type: Number, default: 300 }, // 5 minutes
    enabled_features: [String],
    filters: {
      severity: [String],
      categories: [String],
      assets: [String]
    },
    notifications: {
      enabled: { type: Boolean, default: true },
      channels: [String],
      thresholds: {
        critical: { type: Number, default: 1 },
        high: { type: Number, default: 5 },
        medium: { type: Number, default: 10 }
      }
    }
  },
  last_sync: Date,
  sync_status: {
    success: { type: Boolean, default: false },
    message: String,
    records_processed: { type: Number, default: 0 },
    errors: [String]
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Update the updated_at field before saving
IntegrationSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Index for better query performance
IntegrationSchema.index({ type: 1, status: 1 });
IntegrationSchema.index({ created_by: 1 });

module.exports = mongoose.model('Integration', IntegrationSchema);

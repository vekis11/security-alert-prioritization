const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  source: {
    type: String,
    required: true,
    enum: ['tenable', 'crowdstrike', 'veracode', 'splunk', 'manual']
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    required: true,
    enum: ['critical', 'high', 'medium', 'low', 'info']
  },
  priority: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  status: {
    type: String,
    required: true,
    enum: ['open', 'investigating', 'in_progress', 'resolved', 'false_positive'],
    default: 'open'
  },
  category: {
    type: String,
    required: true,
    enum: ['vulnerability', 'threat', 'compliance', 'incident', 'anomaly']
  },
  asset: {
    name: String,
    ip: String,
    hostname: String,
    os: String,
    tags: [String]
  },
  vulnerability: {
    cve: String,
    cvss_score: Number,
    cvss_vector: String,
    published_date: Date,
    description: String,
    references: [String]
  },
  threat: {
    ioc_type: String,
    ioc_value: String,
    threat_actor: String,
    attack_vector: String,
    confidence: Number
  },
  detection: {
    rule_name: String,
    rule_id: String,
    detection_time: Date,
    first_seen: Date,
    last_seen: Date,
    count: Number
  },
  remediation: {
    steps: [String],
    estimated_time: String,
    difficulty: String,
    resources: [String]
  },
  ai_analysis: {
    risk_score: Number,
    business_impact: String,
    urgency_reason: String,
    recommended_actions: [String],
    similar_incidents: [String],
    confidence: Number
  },
  assignee: {
    user_id: String,
    name: String,
    email: String
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  resolved_at: Date,
  tags: [String],
  comments: [{
    user_id: String,
    user_name: String,
    content: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
});

// Indexes for better query performance
AlertSchema.index({ source: 1, severity: 1 });
AlertSchema.index({ priority: -1, created_at: -1 });
AlertSchema.index({ status: 1, assignee: 1 });
AlertSchema.index({ 'asset.ip': 1 });
AlertSchema.index({ 'vulnerability.cve': 1 });
AlertSchema.index({ created_at: -1 });

// Update the updated_at field before saving
AlertSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('Alert', AlertSchema);

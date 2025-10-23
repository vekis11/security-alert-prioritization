const express = require('express');
const Alert = require('../models/Alert');
const AIService = require('../services/AIService');
const winston = require('winston');

const router = express.Router();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Get all alerts with filtering and pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      severity,
      status,
      source,
      category,
      priority,
      assignee,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (category) filter.category = category;
    if (priority) filter.priority = { $gte: parseInt(priority) };
    if (assignee) filter['assignee.user_id'] = assignee;

    // Add search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'asset.name': { $regex: search, $options: 'i' } },
        { 'vulnerability.cve': { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get alerts with pagination
    const alerts = await Alert.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await Alert.countDocuments(filter);

    // Get summary statistics
    const stats = await Alert.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } },
          open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      alerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      stats: stats[0] || {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        open: 0,
        inProgress: 0,
        resolved: 0
      }
    });
  } catch (error) {
    logger.error('Failed to get alerts:', error.message);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// Get alert by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const alert = await Alert.findOne({ id: req.params.id });
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ alert });
  } catch (error) {
    logger.error('Failed to get alert:', error.message);
    res.status(500).json({ error: 'Failed to get alert' });
  }
});

// Update alert
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { status, assignee, comments, tags } = req.body;
    
    const updateData = {};
    if (status) updateData.status = status;
    if (assignee) updateData.assignee = assignee;
    if (tags) updateData.tags = tags;
    
    if (comments && comments.length > 0) {
      updateData.$push = { comments: { $each: comments } };
    }

    const alert = await Alert.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    logger.info(`Alert updated: ${alert.id} by ${req.user.username}`);
    res.json({ alert });
  } catch (error) {
    logger.error('Failed to update alert:', error.message);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// Assign alert
router.put('/:id/assign', authenticateToken, async (req, res) => {
  try {
    const { assignee } = req.body;
    
    if (!assignee || !assignee.user_id) {
      return res.status(400).json({ error: 'Assignee information is required' });
    }

    const alert = await Alert.findOneAndUpdate(
      { id: req.params.id },
      { 
        assignee,
        status: 'in_progress'
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    logger.info(`Alert assigned: ${alert.id} to ${assignee.name}`);
    res.json({ alert });
  } catch (error) {
    logger.error('Failed to assign alert:', error.message);
    res.status(500).json({ error: 'Failed to assign alert' });
  }
});

// Resolve alert
router.put('/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const { resolution_notes } = req.body;
    
    const alert = await Alert.findOneAndUpdate(
      { id: req.params.id },
      { 
        status: 'resolved',
        resolved_at: new Date(),
        $push: { 
          comments: {
            user_id: req.user.userId,
            user_name: req.user.username,
            content: resolution_notes || 'Alert resolved',
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    logger.info(`Alert resolved: ${alert.id} by ${req.user.username}`);
    res.json({ alert });
  } catch (error) {
    logger.error('Failed to resolve alert:', error.message);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// Mark as false positive
router.put('/:id/false-positive', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const alert = await Alert.findOneAndUpdate(
      { id: req.params.id },
      { 
        status: 'false_positive',
        $push: { 
          comments: {
            user_id: req.user.userId,
            user_name: req.user.username,
            content: `Marked as false positive: ${reason || 'No reason provided'}`,
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    logger.info(`Alert marked as false positive: ${alert.id} by ${req.user.username}`);
    res.json({ alert });
  } catch (error) {
    logger.error('Failed to mark alert as false positive:', error.message);
    res.status(500).json({ error: 'Failed to mark alert as false positive' });
  }
});

// Get AI analysis for alert
router.get('/:id/analysis', authenticateToken, async (req, res) => {
  try {
    const alert = await Alert.findOne({ id: req.params.id });
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // If AI analysis already exists, return it
    if (alert.ai_analysis) {
      return res.json({ analysis: alert.ai_analysis });
    }

    // Generate new AI analysis
    const aiService = new AIService();
    const analysis = await aiService.analyzeAlert(alert);

    // Update alert with AI analysis
    await Alert.findOneAndUpdate(
      { id: req.params.id },
      { ai_analysis: analysis }
    );

    res.json({ analysis });
  } catch (error) {
    logger.error('Failed to get AI analysis:', error.message);
    res.status(500).json({ error: 'Failed to get AI analysis' });
  }
});

// Get remediation plan for alert
router.get('/:id/remediation', authenticateToken, async (req, res) => {
  try {
    const alert = await Alert.findOne({ id: req.params.id });
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // If remediation plan already exists, return it
    if (alert.remediation && alert.remediation.ai_generated) {
      return res.json({ remediation: alert.remediation });
    }

    // Generate new remediation plan
    const aiService = new AIService();
    const remediation = await aiService.generateRemediationPlan(alert);

    // Update alert with remediation plan
    await Alert.findOneAndUpdate(
      { id: req.params.id },
      { 
        remediation: {
          ...alert.remediation,
          ai_generated: true,
          plan: remediation
        }
      }
    );

    res.json({ remediation });
  } catch (error) {
    logger.error('Failed to get remediation plan:', error.message);
    res.status(500).json({ error: 'Failed to get remediation plan' });
  }
});

// Get threat intelligence for alert
router.get('/:id/threat-intelligence', authenticateToken, async (req, res) => {
  try {
    const alert = await Alert.findOne({ id: req.params.id });
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // If threat intelligence already exists, return it
    if (alert.threat_intelligence) {
      return res.json({ threat_intelligence: alert.threat_intelligence });
    }

    // Generate new threat intelligence
    const aiService = new AIService();
    const threatIntel = await aiService.generateThreatIntelligence(alert);

    // Update alert with threat intelligence
    await Alert.findOneAndUpdate(
      { id: req.params.id },
      { threat_intelligence: threatIntel }
    );

    res.json({ threat_intelligence: threatIntel });
  } catch (error) {
    logger.error('Failed to get threat intelligence:', error.message);
    res.status(500).json({ error: 'Failed to get threat intelligence' });
  }
});

// Bulk update alerts
router.put('/bulk/update', authenticateToken, async (req, res) => {
  try {
    const { alertIds, updates } = req.body;
    
    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({ error: 'Alert IDs are required' });
    }

    const result = await Alert.updateMany(
      { id: { $in: alertIds } },
      { $set: updates }
    );

    logger.info(`Bulk update completed: ${result.modifiedCount} alerts updated by ${req.user.username}`);
    res.json({ 
      message: `${result.modifiedCount} alerts updated successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    logger.error('Failed to bulk update alerts:', error.message);
    res.status(500).json({ error: 'Failed to bulk update alerts' });
  }
});

// Get alert statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    let timeFilter = {};
    if (timeRange === '24h') {
      timeFilter = { created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } };
    } else if (timeRange === '7d') {
      timeFilter = { created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
    } else if (timeRange === '30d') {
      timeFilter = { created_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
    }

    const stats = await Alert.aggregate([
      { $match: timeFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } },
          open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }
        }
      }
    ]);

    // Get top sources
    const topSources = await Alert.aggregate([
      { $match: timeFilter },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Get top categories
    const topCategories = await Alert.aggregate([
      { $match: timeFilter },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      overview: stats[0] || {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        open: 0,
        inProgress: 0,
        resolved: 0
      },
      topSources,
      topCategories
    });
  } catch (error) {
    logger.error('Failed to get alert statistics:', error.message);
    res.status(500).json({ error: 'Failed to get alert statistics' });
  }
});

module.exports = router;

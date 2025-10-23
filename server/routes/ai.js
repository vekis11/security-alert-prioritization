const express = require('express');
const AIService = require('../services/AIService');
const Alert = require('../models/Alert');
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

// Analyze single alert
router.post('/analyze', authenticateToken, async (req, res) => {
  try {
    const { alertId } = req.body;
    
    if (!alertId) {
      return res.status(400).json({ error: 'Alert ID is required' });
    }

    const alert = await Alert.findOne({ id: alertId });
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const aiService = new AIService();
    const analysis = await aiService.analyzeAlert(alert);

    // Update alert with AI analysis
    await Alert.findOneAndUpdate(
      { id: alertId },
      { ai_analysis: analysis }
    );

    logger.info(`AI analysis completed for alert: ${alertId}`);
    res.json({ analysis });
  } catch (error) {
    logger.error('Failed to analyze alert:', error.message);
    res.status(500).json({ error: 'Failed to analyze alert' });
  }
});

// Prioritize multiple alerts
router.post('/prioritize', authenticateToken, async (req, res) => {
  try {
    const { alertIds, maxAlerts = 50 } = req.body;
    
    if (!alertIds || !Array.isArray(alertIds)) {
      return res.status(400).json({ error: 'Alert IDs array is required' });
    }

    // Limit the number of alerts to prevent timeout
    const limitedAlertIds = alertIds.slice(0, maxAlerts);
    
    const alerts = await Alert.find({ 
      id: { $in: limitedAlertIds } 
    }).sort({ created_at: -1 });

    if (alerts.length === 0) {
      return res.status(404).json({ error: 'No alerts found' });
    }

    const aiService = new AIService();
    const prioritization = await aiService.prioritizeAlerts(alerts);

    // Update alerts with new priorities
    for (const item of prioritization) {
      await Alert.findOneAndUpdate(
        { id: item.alert_id },
        { 
          priority: item.priority_score,
          ai_analysis: {
            ...alerts.find(a => a.id === item.alert_id)?.ai_analysis,
            prioritization_explanation: item.explanation
          }
        }
      );
    }

    logger.info(`AI prioritization completed for ${alerts.length} alerts`);
    res.json({ 
      prioritization,
      processed: alerts.length
    });
  } catch (error) {
    logger.error('Failed to prioritize alerts:', error.message);
    res.status(500).json({ error: 'Failed to prioritize alerts' });
  }
});

// Generate remediation plan
router.post('/remediation', authenticateToken, async (req, res) => {
  try {
    const { alertId } = req.body;
    
    if (!alertId) {
      return res.status(400).json({ error: 'Alert ID is required' });
    }

    const alert = await Alert.findOne({ id: alertId });
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const aiService = new AIService();
    const remediation = await aiService.generateRemediationPlan(alert);

    // Update alert with remediation plan
    await Alert.findOneAndUpdate(
      { id: alertId },
      { 
        remediation: {
          ...alert.remediation,
          ai_generated: true,
          plan: remediation
        }
      }
    );

    logger.info(`AI remediation plan generated for alert: ${alertId}`);
    res.json({ remediation });
  } catch (error) {
    logger.error('Failed to generate remediation plan:', error.message);
    res.status(500).json({ error: 'Failed to generate remediation plan' });
  }
});

// Generate threat intelligence
router.post('/threat-intelligence', authenticateToken, async (req, res) => {
  try {
    const { alertId } = req.body;
    
    if (!alertId) {
      return res.status(400).json({ error: 'Alert ID is required' });
    }

    const alert = await Alert.findOne({ id: alertId });
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const aiService = new AIService();
    const threatIntel = await aiService.generateThreatIntelligence(alert);

    // Update alert with threat intelligence
    await Alert.findOneAndUpdate(
      { id: alertId },
      { threat_intelligence: threatIntel }
    );

    logger.info(`AI threat intelligence generated for alert: ${alertId}`);
    res.json({ threat_intelligence: threatIntel });
  } catch (error) {
    logger.error('Failed to generate threat intelligence:', error.message);
    res.status(500).json({ error: 'Failed to generate threat intelligence' });
  }
});

// Bulk AI processing
router.post('/bulk-process', authenticateToken, async (req, res) => {
  try {
    const { 
      alertIds, 
      operations = ['analyze', 'prioritize'], 
      maxAlerts = 20 
    } = req.body;
    
    if (!alertIds || !Array.isArray(alertIds)) {
      return res.status(400).json({ error: 'Alert IDs array is required' });
    }

    // Limit the number of alerts to prevent timeout
    const limitedAlertIds = alertIds.slice(0, maxAlerts);
    
    const alerts = await Alert.find({ 
      id: { $in: limitedAlertIds } 
    });

    if (alerts.length === 0) {
      return res.status(404).json({ error: 'No alerts found' });
    }

    const aiService = new AIService();
    const results = {
      analyzed: 0,
      prioritized: 0,
      remediated: 0,
      threatIntel: 0,
      errors: []
    };

    // Process each operation
    for (const operation of operations) {
      try {
        switch (operation) {
          case 'analyze':
            for (const alert of alerts) {
              const analysis = await aiService.analyzeAlert(alert);
              await Alert.findOneAndUpdate(
                { id: alert.id },
                { ai_analysis: analysis }
              );
              results.analyzed++;
            }
            break;
            
          case 'prioritize':
            const prioritization = await aiService.prioritizeAlerts(alerts);
            for (const item of prioritization) {
              await Alert.findOneAndUpdate(
                { id: item.alert_id },
                { 
                  priority: item.priority_score,
                  ai_analysis: {
                    ...alerts.find(a => a.id === item.alert_id)?.ai_analysis,
                    prioritization_explanation: item.explanation
                  }
                }
              );
            }
            results.prioritized = prioritization.length;
            break;
            
          case 'remediation':
            for (const alert of alerts) {
              const remediation = await aiService.generateRemediationPlan(alert);
              await Alert.findOneAndUpdate(
                { id: alert.id },
                { 
                  remediation: {
                    ...alert.remediation,
                    ai_generated: true,
                    plan: remediation
                  }
                }
              );
              results.remediated++;
            }
            break;
            
          case 'threat-intelligence':
            for (const alert of alerts) {
              if (alert.category === 'threat') {
                const threatIntel = await aiService.generateThreatIntelligence(alert);
                await Alert.findOneAndUpdate(
                  { id: alert.id },
                  { threat_intelligence: threatIntel }
                );
                results.threatIntel++;
              }
            }
            break;
        }
      } catch (error) {
        results.errors.push(`${operation}: ${error.message}`);
        logger.error(`Bulk AI processing failed for ${operation}:`, error.message);
      }
    }

    logger.info(`Bulk AI processing completed: ${JSON.stringify(results)}`);
    res.json({ results });
  } catch (error) {
    logger.error('Failed to bulk process alerts:', error.message);
    res.status(500).json({ error: 'Failed to bulk process alerts' });
  }
});

// Get AI insights and recommendations
router.get('/insights', authenticateToken, async (req, res) => {
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

    // Get high-priority alerts
    const highPriorityAlerts = await Alert.find({
      ...timeFilter,
      priority: { $gte: 8 },
      status: { $in: ['open', 'investigating', 'in_progress'] }
    }).sort({ priority: -1, created_at: -1 }).limit(10);

    // Get critical vulnerabilities
    const criticalVulns = await Alert.find({
      ...timeFilter,
      severity: 'critical',
      category: 'vulnerability',
      status: { $in: ['open', 'investigating'] }
    }).sort({ created_at: -1 }).limit(5);

    // Get threat alerts
    const threatAlerts = await Alert.find({
      ...timeFilter,
      category: 'threat',
      status: { $in: ['open', 'investigating'] }
    }).sort({ created_at: -1 }).limit(5);

    // Get compliance violations
    const complianceViolations = await Alert.find({
      ...timeFilter,
      category: 'compliance',
      status: { $in: ['open', 'investigating'] }
    }).sort({ created_at: -1 }).limit(5);

    // Generate AI insights
    const aiService = new AIService();
    const insights = {
      highPriorityAlerts: highPriorityAlerts.map(alert => ({
        id: alert.id,
        title: alert.title,
        priority: alert.priority,
        severity: alert.severity,
        urgency_reason: alert.ai_analysis?.urgency_reason,
        recommended_actions: alert.ai_analysis?.recommended_actions
      })),
      criticalVulnerabilities: criticalVulns.map(alert => ({
        id: alert.id,
        title: alert.title,
        cve: alert.vulnerability?.cve,
        cvss_score: alert.vulnerability?.cvss_score,
        business_impact: alert.ai_analysis?.business_impact
      })),
      threatAlerts: threatAlerts.map(alert => ({
        id: alert.id,
        title: alert.title,
        threat_actor: alert.threat?.threat_actor,
        attack_vector: alert.threat?.attack_vector,
        confidence: alert.threat?.confidence
      })),
      complianceViolations: complianceViolations.map(alert => ({
        id: alert.id,
        title: alert.title,
        severity: alert.severity,
        business_impact: alert.ai_analysis?.business_impact
      })),
      recommendations: [
        'Review and prioritize critical vulnerabilities immediately',
        'Investigate high-confidence threat detections',
        'Address compliance violations to maintain regulatory compliance',
        'Implement additional monitoring for high-risk assets'
      ]
    };

    res.json({ insights });
  } catch (error) {
    logger.error('Failed to get AI insights:', error.message);
    res.status(500).json({ error: 'Failed to get AI insights' });
  }
});

// Get AI service status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const aiService = new AIService();
    const isConfigured = aiService.isConfigured();
    
    res.json({ 
      configured: isConfigured,
      status: isConfigured ? 'ready' : 'not_configured',
      message: isConfigured ? 'AI service is ready' : 'AI service is not configured'
    });
  } catch (error) {
    logger.error('Failed to get AI service status:', error.message);
    res.status(500).json({ error: 'Failed to get AI service status' });
  }
});

// Test AI service
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const aiService = new AIService();
    
    if (!aiService.isConfigured()) {
      return res.status(400).json({ 
        error: 'AI service is not configured',
        message: 'Please configure OpenAI API key'
      });
    }

    // Test with a sample alert
    const sampleAlert = {
      id: 'test_alert',
      title: 'Test Security Alert',
      description: 'This is a test alert for AI service validation',
      severity: 'medium',
      priority: 5,
      category: 'vulnerability',
      source: 'test',
      asset: { name: 'test-server' },
      vulnerability: { cve: 'CVE-2023-1234', cvss_score: 7.5 }
    };

    const analysis = await aiService.analyzeAlert(sampleAlert);
    
    res.json({ 
      success: true,
      message: 'AI service test successful',
      analysis
    });
  } catch (error) {
    logger.error('AI service test failed:', error.message);
    res.status(500).json({ 
      error: 'AI service test failed',
      message: error.message
    });
  }
});

module.exports = router;

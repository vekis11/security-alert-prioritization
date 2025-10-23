const express = require('express');
const Integration = require('../models/Integration');
const TenableService = require('../services/TenableService');
const CrowdStrikeService = require('../services/CrowdStrikeService');
const VeracodeService = require('../services/VeracodeService');
const SplunkService = require('../services/SplunkService');
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

// Get all integrations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const integrations = await Integration.find({}).sort({ created_at: -1 });
    res.json({ integrations });
  } catch (error) {
    logger.error('Failed to get integrations:', error.message);
    res.status(500).json({ error: 'Failed to get integrations' });
  }
});

// Get integration by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    res.json({ integration });
  } catch (error) {
    logger.error('Failed to get integration:', error.message);
    res.status(500).json({ error: 'Failed to get integration' });
  }
});

// Create new integration
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, type, configuration, settings } = req.body;

    if (!name || !type || !configuration) {
      return res.status(400).json({ error: 'Name, type, and configuration are required' });
    }

    // Check if integration with same name already exists
    const existingIntegration = await Integration.findOne({ name });
    if (existingIntegration) {
      return res.status(400).json({ error: 'Integration with this name already exists' });
    }

    const integration = new Integration({
      name,
      type,
      configuration,
      settings: settings || {},
      created_by: req.user.userId,
      status: 'inactive'
    });

    await integration.save();

    logger.info(`Integration created: ${name} (${type}) by ${req.user.username}`);
    res.status(201).json({ integration });
  } catch (error) {
    logger.error('Failed to create integration:', error.message);
    res.status(500).json({ error: 'Failed to create integration' });
  }
});

// Update integration
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, configuration, settings, status } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (configuration) updateData.configuration = configuration;
    if (settings) updateData.settings = settings;
    if (status) updateData.status = status;

    const integration = await Integration.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    logger.info(`Integration updated: ${integration.name} by ${req.user.username}`);
    res.json({ integration });
  } catch (error) {
    logger.error('Failed to update integration:', error.message);
    res.status(500).json({ error: 'Failed to update integration' });
  }
});

// Test integration connection
router.post('/:id/test', authenticateToken, async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    let service;
    let result;

    switch (integration.type) {
      case 'tenable':
        service = new TenableService(integration.configuration.tenable);
        result = await service.testConnection();
        break;
      case 'crowdstrike':
        service = new CrowdStrikeService(integration.configuration.crowdstrike);
        result = await service.testConnection();
        break;
      case 'veracode':
        service = new VeracodeService(integration.configuration.veracode);
        result = await service.testConnection();
        break;
      case 'splunk':
        service = new SplunkService(integration.configuration.splunk);
        result = await service.testConnection();
        break;
      default:
        return res.status(400).json({ error: 'Unsupported integration type' });
    }

    // Update integration status based on test result
    await Integration.findByIdAndUpdate(req.params.id, {
      status: result.success ? 'active' : 'error',
      sync_status: {
        success: result.success,
        message: result.message,
        records_processed: 0,
        errors: result.success ? [] : [result.message]
      }
    });

    logger.info(`Integration test completed: ${integration.name} - ${result.success ? 'Success' : 'Failed'}`);
    res.json({ result });
  } catch (error) {
    logger.error('Failed to test integration:', error.message);
    res.status(500).json({ error: 'Failed to test integration' });
  }
});

// Activate integration
router.put('/:id/activate', authenticateToken, async (req, res) => {
  try {
    const integration = await Integration.findByIdAndUpdate(
      req.params.id,
      { status: 'active' },
      { new: true }
    );

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    logger.info(`Integration activated: ${integration.name} by ${req.user.username}`);
    res.json({ integration });
  } catch (error) {
    logger.error('Failed to activate integration:', error.message);
    res.status(500).json({ error: 'Failed to activate integration' });
  }
});

// Deactivate integration
router.put('/:id/deactivate', authenticateToken, async (req, res) => {
  try {
    const integration = await Integration.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    logger.info(`Integration deactivated: ${integration.name} by ${req.user.username}`);
    res.json({ integration });
  } catch (error) {
    logger.error('Failed to deactivate integration:', error.message);
    res.status(500).json({ error: 'Failed to deactivate integration' });
  }
});

// Sync integration data
router.post('/:id/sync', authenticateToken, async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    if (integration.status !== 'active') {
      return res.status(400).json({ error: 'Integration must be active to sync data' });
    }

    // Import DataSyncService
    const DataSyncService = require('../services/DataSyncService');
    const dataSyncService = new DataSyncService();

    // Perform sync
    const result = await dataSyncService.syncIntegrationData(integration);

    logger.info(`Integration sync completed: ${integration.name} - ${result.processed} processed, ${result.errors} errors`);
    res.json({ 
      message: 'Sync completed',
      processed: result.processed,
      errors: result.errors
    });
  } catch (error) {
    logger.error('Failed to sync integration:', error.message);
    res.status(500).json({ error: 'Failed to sync integration' });
  }
});

// Get integration sync status
router.get('/:id/sync-status', authenticateToken, async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    res.json({ 
      sync_status: integration.sync_status,
      last_sync: integration.last_sync
    });
  } catch (error) {
    logger.error('Failed to get sync status:', error.message);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

// Delete integration
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const integration = await Integration.findByIdAndDelete(req.params.id);
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    logger.info(`Integration deleted: ${integration.name} by ${req.user.username}`);
    res.json({ message: 'Integration deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete integration:', error.message);
    res.status(500).json({ error: 'Failed to delete integration' });
  }
});

// Get integration statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Get alert statistics for this integration
    const Alert = require('../models/Alert');
    const stats = await Alert.aggregate([
      { $match: { source: integration.type } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } },
          open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }
        }
      }
    ]);

    // Get recent alerts
    const recentAlerts = await Alert.find({ source: integration.type })
      .sort({ created_at: -1 })
      .limit(10)
      .select('id title severity status created_at');

    res.json({
      integration: {
        name: integration.name,
        type: integration.type,
        status: integration.status,
        last_sync: integration.last_sync
      },
      stats: stats[0] || {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        open: 0,
        resolved: 0
      },
      recentAlerts
    });
  } catch (error) {
    logger.error('Failed to get integration statistics:', error.message);
    res.status(500).json({ error: 'Failed to get integration statistics' });
  }
});

// Get available integration types
router.get('/types/available', authenticateToken, async (req, res) => {
  try {
    const types = [
      {
        id: 'tenable',
        name: 'Tenable.io',
        description: 'Vulnerability management and assessment',
        icon: 'shield',
        category: 'Vulnerability Management',
        fields: [
          { name: 'access_key', label: 'Access Key', type: 'text', required: true },
          { name: 'secret_key', label: 'Secret Key', type: 'password', required: true },
          { name: 'base_url', label: 'Base URL', type: 'text', required: false, default: 'https://cloud.tenable.com' }
        ]
      },
      {
        id: 'crowdstrike',
        name: 'CrowdStrike Falcon',
        description: 'Endpoint detection and response',
        icon: 'eye',
        category: 'EDR/XDR',
        fields: [
          { name: 'client_id', label: 'Client ID', type: 'text', required: true },
          { name: 'client_secret', label: 'Client Secret', type: 'password', required: true },
          { name: 'base_url', label: 'Base URL', type: 'text', required: false, default: 'https://api.crowdstrike.com' }
        ]
      },
      {
        id: 'sentinelone',
        name: 'SentinelOne',
        description: 'Autonomous endpoint protection platform',
        icon: 'shield-check',
        category: 'EDR/XDR',
        fields: [
          { name: 'api_token', label: 'API Token', type: 'password', required: true },
          { name: 'base_url', label: 'Base URL', type: 'text', required: true },
          { name: 'site_id', label: 'Site ID', type: 'text', required: false }
        ]
      },
      {
        id: 'qualys',
        name: 'Qualys VMDR',
        description: 'Vulnerability management and threat response',
        icon: 'bug-ant',
        category: 'Vulnerability Management',
        fields: [
          { name: 'username', label: 'Username', type: 'text', required: true },
          { name: 'password', label: 'Password', type: 'password', required: true },
          { name: 'base_url', label: 'Base URL', type: 'text', required: true }
        ]
      },
      {
        id: 'rapid7',
        name: 'Rapid7 InsightVM',
        description: 'Vulnerability management and risk analytics',
        icon: 'chart-bar',
        category: 'Vulnerability Management',
        fields: [
          { name: 'api_key', label: 'API Key', type: 'password', required: true },
          { name: 'base_url', label: 'Base URL', type: 'text', required: true },
          { name: 'username', label: 'Username', type: 'text', required: false }
        ]
      },
      {
        id: 'veracode',
        name: 'Veracode',
        description: 'Application security testing',
        icon: 'code-bracket',
        category: 'Application Security',
        fields: [
          { name: 'api_id', label: 'API ID', type: 'text', required: true },
          { name: 'api_key', label: 'API Key', type: 'password', required: true },
          { name: 'base_url', label: 'Base URL', type: 'text', required: false, default: 'https://analysiscenter.veracode.com' }
        ]
      },
      {
        id: 'checkmarx',
        name: 'Checkmarx SAST',
        description: 'Static application security testing',
        icon: 'code-bracket',
        category: 'Application Security',
        fields: [
          { name: 'username', label: 'Username', type: 'text', required: true },
          { name: 'password', label: 'Password', type: 'password', required: true },
          { name: 'base_url', label: 'Base URL', type: 'text', required: true }
        ]
      },
      {
        id: 'splunk',
        name: 'Splunk SIEM',
        description: 'Security information and event management',
        icon: 'magnifying-glass',
        category: 'SIEM/SOAR',
        fields: [
          { name: 'host', label: 'Host', type: 'text', required: true },
          { name: 'port', label: 'Port', type: 'number', required: false, default: 8089 },
          { name: 'username', label: 'Username', type: 'text', required: false },
          { name: 'password', label: 'Password', type: 'password', required: false },
          { name: 'token', label: 'Token', type: 'password', required: false },
          { name: 'index', label: 'Index', type: 'text', required: false, default: 'main' }
        ]
      },
      {
        id: 'qradar',
        name: 'IBM QRadar',
        description: 'Security information and event management',
        icon: 'shield-exclamation',
        category: 'SIEM/SOAR',
        fields: [
          { name: 'host', label: 'Host', type: 'text', required: true },
          { name: 'port', label: 'Port', type: 'number', required: false, default: 443 },
          { name: 'username', label: 'Username', type: 'text', required: true },
          { name: 'password', label: 'Password', type: 'password', required: true },
          { name: 'token', label: 'API Token', type: 'password', required: false }
        ]
      },
      {
        id: 'splunk_phantom',
        name: 'Splunk Phantom SOAR',
        description: 'Security orchestration, automation and response',
        icon: 'cog-6-tooth',
        category: 'SIEM/SOAR',
        fields: [
          { name: 'host', label: 'Host', type: 'text', required: true },
          { name: 'port', label: 'Port', type: 'number', required: false, default: 443 },
          { name: 'username', label: 'Username', type: 'text', required: true },
          { name: 'password', label: 'Password', type: 'password', required: true },
          { name: 'verify_ssl', label: 'Verify SSL', type: 'checkbox', required: false, default: true }
        ]
      },
      {
        id: 'palo_alto',
        name: 'Palo Alto Cortex XDR',
        description: 'Extended detection and response platform',
        icon: 'shield-check',
        category: 'EDR/XDR',
        fields: [
          { name: 'api_key', label: 'API Key', type: 'password', required: true },
          { name: 'base_url', label: 'Base URL', type: 'text', required: true },
          { name: 'data_collector_id', label: 'Data Collector ID', type: 'text', required: false }
        ]
      },
      {
        id: 'microsoft_defender',
        name: 'Microsoft Defender for Endpoint',
        description: 'Enterprise endpoint security platform',
        icon: 'shield-check',
        category: 'EDR/XDR',
        fields: [
          { name: 'tenant_id', label: 'Tenant ID', type: 'text', required: true },
          { name: 'client_id', label: 'Client ID', type: 'text', required: true },
          { name: 'client_secret', label: 'Client Secret', type: 'password', required: true },
          { name: 'base_url', label: 'Base URL', type: 'text', required: false, default: 'https://api.securitycenter.microsoft.com' }
        ]
      },
      {
        id: 'carbon_black',
        name: 'VMware Carbon Black',
        description: 'Endpoint detection and response',
        icon: 'shield-check',
        category: 'EDR/XDR',
        fields: [
          { name: 'api_key', label: 'API Key', type: 'password', required: true },
          { name: 'base_url', label: 'Base URL', type: 'text', required: true },
          { name: 'org_key', label: 'Organization Key', type: 'text', required: false }
        ]
      },
      {
        id: 'fireeye',
        name: 'FireEye Helix',
        description: 'Security operations platform',
        icon: 'fire',
        category: 'SIEM/SOAR',
        fields: [
          { name: 'username', label: 'Username', type: 'text', required: true },
          { name: 'password', label: 'Password', type: 'password', required: true },
          { name: 'base_url', label: 'Base URL', type: 'text', required: true }
        ]
      },
      {
        id: 'darktrace',
        name: 'Darktrace Enterprise Immune System',
        description: 'AI-powered cyber defense platform',
        icon: 'brain',
        category: 'AI/ML Security',
        fields: [
          { name: 'api_key', label: 'API Key', type: 'password', required: true },
          { name: 'base_url', label: 'Base URL', type: 'text', required: true },
          { name: 'verify_ssl', label: 'Verify SSL', type: 'checkbox', required: false, default: true }
        ]
      },
      {
        id: 'vulcan_cyber',
        name: 'Vulcan Cyber',
        description: 'Vulnerability remediation orchestration',
        icon: 'wrench-screwdriver',
        category: 'Vulnerability Management',
        fields: [
          { name: 'api_key', label: 'API Key', type: 'password', required: true },
          { name: 'base_url', label: 'Base URL', type: 'text', required: true },
          { name: 'tenant_id', label: 'Tenant ID', type: 'text', required: false }
        ]
      },
      {
        id: 'kenna_security',
        name: 'Kenna Security',
        description: 'Risk-based vulnerability management',
        icon: 'chart-pie',
        category: 'Vulnerability Management',
        fields: [
          { name: 'api_key', label: 'API Key', type: 'password', required: true },
          { name: 'base_url', label: 'Base URL', type: 'text', required: true }
        ]
      },
      {
        id: 'jira',
        name: 'Jira Security',
        description: 'Issue tracking and project management',
        icon: 'clipboard-document-list',
        category: 'Ticketing/Workflow',
        fields: [
          { name: 'base_url', label: 'Base URL', type: 'text', required: true },
          { name: 'username', label: 'Username', type: 'text', required: true },
          { name: 'api_token', label: 'API Token', type: 'password', required: true },
          { name: 'project_key', label: 'Project Key', type: 'text', required: false }
        ]
      },
      {
        id: 'servicenow',
        name: 'ServiceNow Security Operations',
        description: 'Security operations management',
        icon: 'cog-6-tooth',
        category: 'Ticketing/Workflow',
        fields: [
          { name: 'instance_url', label: 'Instance URL', type: 'text', required: true },
          { name: 'username', label: 'Username', type: 'text', required: true },
          { name: 'password', label: 'Password', type: 'password', required: true },
          { name: 'table_name', label: 'Table Name', type: 'text', required: false, default: 'incident' }
        ]
      }
    ];

    res.json({ types });
  } catch (error) {
    logger.error('Failed to get integration types:', error.message);
    res.status(500).json({ error: 'Failed to get integration types' });
  }
});

module.exports = router;

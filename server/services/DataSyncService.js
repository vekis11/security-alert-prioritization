const winston = require('winston');
const TenableService = require('./TenableService');
const CrowdStrikeService = require('./CrowdStrikeService');
const VeracodeService = require('./VeracodeService');
const SplunkService = require('./SplunkService');
const AIService = require('./AIService');
const Alert = require('../models/Alert');
const Integration = require('../models/Integration');

class DataSyncService {
  constructor(io) {
    this.io = io;
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console()
      ]
    });
    this.aiService = new AIService();
  }

  async syncAllData() {
    try {
      this.logger.info('Starting comprehensive data sync...');
      
      const integrations = await Integration.find({ status: 'active' });
      let totalProcessed = 0;
      let totalErrors = 0;

      for (const integration of integrations) {
        try {
          const result = await this.syncIntegrationData(integration);
          totalProcessed += result.processed;
          totalErrors += result.errors;
        } catch (error) {
          this.logger.error(`Failed to sync integration ${integration.name}:`, error.message);
          totalErrors++;
        }
      }

      // Emit sync completion event
      this.io.emit('sync-complete', {
        timestamp: new Date().toISOString(),
        totalProcessed,
        totalErrors,
        success: totalErrors === 0
      });

      this.logger.info(`Data sync completed. Processed: ${totalProcessed}, Errors: ${totalErrors}`);
      return { totalProcessed, totalErrors };
    } catch (error) {
      this.logger.error('Data sync failed:', error.message);
      throw error;
    }
  }

  async syncIntegrationData(integration) {
    try {
      this.logger.info(`Syncing data for ${integration.name} (${integration.type})`);
      
      let service;
      let alerts = [];

      // Initialize appropriate service
      switch (integration.type) {
        case 'tenable':
          service = new TenableService(integration.configuration.tenable);
          alerts = await service.getVulnerabilities(integration.settings.filters);
          break;
        case 'crowdstrike':
          service = new CrowdStrikeService(integration.configuration.crowdstrike);
          const detections = await service.getDetections(integration.settings.filters);
          const incidents = await service.getIncidents(integration.settings.filters);
          alerts = [...detections, ...incidents];
          break;
        case 'veracode':
          service = new VeracodeService(integration.configuration.veracode);
          alerts = await service.getAllFlaws(integration.settings.filters);
          break;
        case 'splunk':
          service = new SplunkService(integration.configuration.splunk);
          const securityAlerts = await service.getSecurityAlerts(integration.settings.filters);
          const threatIntel = await service.getThreatIntelligence(integration.settings.filters);
          const complianceViolations = await service.getComplianceViolations(integration.settings.filters);
          alerts = [...securityAlerts, ...threatIntel, ...complianceViolations];
          break;
        default:
          throw new Error(`Unsupported integration type: ${integration.type}`);
      }

      // Process and store alerts
      let processed = 0;
      let errors = 0;

      for (const alertData of alerts) {
        try {
          await this.processAlert(alertData, integration);
          processed++;
        } catch (error) {
          this.logger.error(`Failed to process alert ${alertData.id}:`, error.message);
          errors++;
        }
      }

      // Update integration sync status
      await Integration.findByIdAndUpdate(integration._id, {
        last_sync: new Date(),
        sync_status: {
          success: errors === 0,
          message: errors === 0 ? 'Sync completed successfully' : `Sync completed with ${errors} errors`,
          records_processed: processed,
          errors: errors > 0 ? [`${errors} alerts failed to process`] : []
        }
      });

      // Emit real-time update
      this.io.emit('integration-sync', {
        integration: integration.name,
        type: integration.type,
        processed,
        errors,
        timestamp: new Date().toISOString()
      });

      return { processed, errors };
    } catch (error) {
      this.logger.error(`Integration sync failed for ${integration.name}:`, error.message);
      throw error;
    }
  }

  async processAlert(alertData, integration) {
    try {
      // Check if alert already exists
      const existingAlert = await Alert.findOne({ id: alertData.id });
      
      if (existingAlert) {
        // Update existing alert
        const updatedAlert = await Alert.findByIdAndUpdate(
          existingAlert._id,
          {
            ...alertData,
            updated_at: new Date()
          },
          { new: true }
        );
        
        // Emit update event
        this.io.emit('alert-updated', updatedAlert);
        return updatedAlert;
      } else {
        // Create new alert
        const newAlert = new Alert(alertData);
        await newAlert.save();
        
        // Perform AI analysis for new alerts
        if (this.aiService.isConfigured()) {
          try {
            const aiAnalysis = await this.aiService.analyzeAlert(newAlert);
            await Alert.findByIdAndUpdate(newAlert._id, {
              ai_analysis: aiAnalysis
            });
          } catch (error) {
            this.logger.warn(`AI analysis failed for alert ${newAlert.id}:`, error.message);
          }
        }
        
        // Emit new alert event
        this.io.emit('alert-created', newAlert);
        
        // Check if notification should be sent
        await this.checkNotificationThreshold(newAlert, integration);
        
        return newAlert;
      }
    } catch (error) {
      this.logger.error(`Failed to process alert ${alertData.id}:`, error.message);
      throw error;
    }
  }

  async checkNotificationThreshold(alert, integration) {
    try {
      const thresholds = integration.settings.notifications?.thresholds || {};
      const severity = alert.severity;
      
      let shouldNotify = false;
      
      if (severity === 'critical' && thresholds.critical <= 1) {
        shouldNotify = true;
      } else if (severity === 'high' && thresholds.high <= 5) {
        shouldNotify = true;
      } else if (severity === 'medium' && thresholds.medium <= 10) {
        shouldNotify = true;
      }
      
      if (shouldNotify && integration.settings.notifications?.enabled) {
        // Emit notification event
        this.io.emit('alert-notification', {
          alert,
          integration: integration.name,
          severity,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      this.logger.error('Failed to check notification threshold:', error.message);
    }
  }

  async prioritizeAlerts() {
    try {
      this.logger.info('Starting AI-powered alert prioritization...');
      
      // Get unresolved alerts
      const alerts = await Alert.find({ 
        status: { $in: ['open', 'investigating', 'in_progress'] }
      }).sort({ created_at: -1 }).limit(100);
      
      if (alerts.length === 0) {
        this.logger.info('No alerts to prioritize');
        return;
      }
      
      // Perform AI prioritization
      const prioritization = await this.aiService.prioritizeAlerts(alerts);
      
      // Update alert priorities
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
      
      // Emit prioritization complete event
      this.io.emit('prioritization-complete', {
        timestamp: new Date().toISOString(),
        alertsProcessed: alerts.length,
        prioritization
      });
      
      this.logger.info(`Prioritization completed for ${alerts.length} alerts`);
    } catch (error) {
      this.logger.error('Alert prioritization failed:', error.message);
      throw error;
    }
  }

  async generateRemediationPlans() {
    try {
      this.logger.info('Generating remediation plans for high-priority alerts...');
      
      // Get high-priority unresolved alerts
      const alerts = await Alert.find({
        status: { $in: ['open', 'investigating'] },
        priority: { $gte: 8 }
      }).limit(20);
      
      for (const alert of alerts) {
        try {
          const remediationPlan = await this.aiService.generateRemediationPlan(alert);
          
          await Alert.findByIdAndUpdate(alert._id, {
            remediation: {
              ...alert.remediation,
              ai_generated: true,
              plan: remediationPlan
            }
          });
        } catch (error) {
          this.logger.warn(`Failed to generate remediation plan for alert ${alert.id}:`, error.message);
        }
      }
      
      this.logger.info(`Generated remediation plans for ${alerts.length} alerts`);
    } catch (error) {
      this.logger.error('Remediation plan generation failed:', error.message);
      throw error;
    }
  }

  async generateThreatIntelligence() {
    try {
      this.logger.info('Generating threat intelligence for threat alerts...');
      
      // Get threat-related alerts
      const alerts = await Alert.find({
        category: 'threat',
        status: { $in: ['open', 'investigating'] }
      }).limit(50);
      
      for (const alert of alerts) {
        try {
          const threatIntel = await this.aiService.generateThreatIntelligence(alert);
          
          await Alert.findByIdAndUpdate(alert._id, {
            threat_intelligence: threatIntel
          });
        } catch (error) {
          this.logger.warn(`Failed to generate threat intelligence for alert ${alert.id}:`, error.message);
        }
      }
      
      this.logger.info(`Generated threat intelligence for ${alerts.length} alerts`);
    } catch (error) {
      this.logger.error('Threat intelligence generation failed:', error.message);
      throw error;
    }
  }

  async testIntegration(integration) {
    try {
      let service;
      
      switch (integration.type) {
        case 'tenable':
          service = new TenableService(integration.configuration.tenable);
          break;
        case 'crowdstrike':
          service = new CrowdStrikeService(integration.configuration.crowdstrike);
          break;
        case 'veracode':
          service = new VeracodeService(integration.configuration.veracode);
          break;
        case 'splunk':
          service = new SplunkService(integration.configuration.splunk);
          break;
        default:
          throw new Error(`Unsupported integration type: ${integration.type}`);
      }
      
      const result = await service.testConnection();
      return result;
    } catch (error) {
      this.logger.error(`Integration test failed for ${integration.name}:`, error.message);
      return { success: false, message: error.message };
    }
  }
}

module.exports = DataSyncService;

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const winston = require('winston');

class ConfigService {
  constructor() {
    this.configPath = path.join(process.cwd(), 'config');
    this.secretsPath = path.join(this.configPath, 'secrets.json');
    this.settingsPath = path.join(this.configPath, 'settings.json');
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
    
    this.encryptionKey = process.env.CONFIG_ENCRYPTION_KEY || this.generateEncryptionKey();
    this.ensureConfigDirectory();
  }

  async ensureConfigDirectory() {
    try {
      await fs.mkdir(this.configPath, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create config directory:', error.message);
    }
  }

  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  encrypt(text) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, this.encryptionKey);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData) {
    const algorithm = 'aes-256-gcm';
    const decipher = crypto.createDecipher(algorithm, this.encryptionKey);
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  async loadSecrets() {
    try {
      const data = await fs.readFile(this.secretsPath, 'utf8');
      const secrets = JSON.parse(data);
      
      // Decrypt sensitive values
      const decryptedSecrets = {};
      for (const [key, value] of Object.entries(secrets)) {
        if (typeof value === 'object' && value.encrypted) {
          decryptedSecrets[key] = this.decrypt(value);
        } else {
          decryptedSecrets[key] = value;
        }
      }
      
      return decryptedSecrets;
    } catch (error) {
      this.logger.warn('No secrets file found, using environment variables');
      return {};
    }
  }

  async saveSecrets(secrets) {
    try {
      const encryptedSecrets = {};
      
      // Encrypt sensitive values
      for (const [key, value] of Object.entries(secrets)) {
        if (this.isSensitiveKey(key)) {
          encryptedSecrets[key] = this.encrypt(value);
        } else {
          encryptedSecrets[key] = value;
        }
      }
      
      await fs.writeFile(this.secretsPath, JSON.stringify(encryptedSecrets, null, 2));
      this.logger.info('Secrets saved successfully');
    } catch (error) {
      this.logger.error('Failed to save secrets:', error.message);
      throw error;
    }
  }

  async loadSettings() {
    try {
      const data = await fs.readFile(this.settingsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.warn('No settings file found, using defaults');
      return this.getDefaultSettings();
    }
  }

  async saveSettings(settings) {
    try {
      await fs.writeFile(this.settingsPath, JSON.stringify(settings, null, 2));
      this.logger.info('Settings saved successfully');
    } catch (error) {
      this.logger.error('Failed to save settings:', error.message);
      throw error;
    }
  }

  getDefaultSettings() {
    return {
      general: {
        dashboardTitle: 'Security Alert Prioritization Dashboard',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
        itemsPerPage: 25,
        refreshInterval: 30,
        maxAlertsPerPage: 100
      },
      notifications: {
        email: {
          enabled: true,
          smtp: {
            host: '',
            port: 587,
            secure: false,
            username: '',
            password: ''
          },
          from: 'security@company.com',
          templates: {
            critical: 'Critical security alert: {title}',
            high: 'High priority security alert: {title}',
            medium: 'Security alert: {title}',
            low: 'Security notification: {title}'
          }
        },
        slack: {
          enabled: false,
          botToken: '',
          signingSecret: '',
          defaultChannel: '#security-alerts',
          criticalChannel: '#critical-alerts',
          reportChannel: '#security-reports'
        },
        webhook: {
          enabled: false,
          url: '',
          secret: '',
          headers: {}
        }
      },
      integrations: {
        tenable: {
          enabled: false,
          accessKey: '',
          secretKey: '',
          baseUrl: 'https://cloud.tenable.com',
          syncInterval: 300,
          maxAlerts: 1000
        },
        crowdstrike: {
          enabled: false,
          clientId: '',
          clientSecret: '',
          baseUrl: 'https://api.crowdstrike.com',
          syncInterval: 300,
          maxAlerts: 1000
        },
        veracode: {
          enabled: false,
          apiId: '',
          apiKey: '',
          baseUrl: 'https://analysiscenter.veracode.com',
          syncInterval: 600,
          maxAlerts: 500
        },
        splunk: {
          enabled: false,
          host: '',
          port: 8089,
          username: '',
          password: '',
          token: '',
          index: 'main',
          syncInterval: 300,
          maxAlerts: 2000
        },
        qualys: {
          enabled: false,
          username: '',
          password: '',
          baseUrl: '',
          syncInterval: 600,
          maxAlerts: 1000
        },
        rapid7: {
          enabled: false,
          apiKey: '',
          baseUrl: '',
          username: '',
          syncInterval: 600,
          maxAlerts: 1000
        },
        sentinelone: {
          enabled: false,
          apiToken: '',
          baseUrl: '',
          siteId: '',
          syncInterval: 300,
          maxAlerts: 1000
        },
        checkmarx: {
          enabled: false,
          username: '',
          password: '',
          baseUrl: '',
          syncInterval: 600,
          maxAlerts: 500
        },
        qradar: {
          enabled: false,
          host: '',
          port: 443,
          username: '',
          password: '',
          token: '',
          syncInterval: 300,
          maxAlerts: 2000
        },
        splunk_phantom: {
          enabled: false,
          host: '',
          port: 443,
          username: '',
          password: '',
          verifySsl: true,
          syncInterval: 300,
          maxAlerts: 1000
        },
        palo_alto: {
          enabled: false,
          apiKey: '',
          baseUrl: '',
          dataCollectorId: '',
          syncInterval: 300,
          maxAlerts: 1000
        },
        microsoft_defender: {
          enabled: false,
          tenantId: '',
          clientId: '',
          clientSecret: '',
          baseUrl: 'https://api.securitycenter.microsoft.com',
          syncInterval: 300,
          maxAlerts: 1000
        },
        carbon_black: {
          enabled: false,
          apiKey: '',
          baseUrl: '',
          orgKey: '',
          syncInterval: 300,
          maxAlerts: 1000
        },
        fireeye: {
          enabled: false,
          username: '',
          password: '',
          baseUrl: '',
          syncInterval: 300,
          maxAlerts: 1000
        },
        darktrace: {
          enabled: false,
          apiKey: '',
          baseUrl: '',
          verifySsl: true,
          syncInterval: 300,
          maxAlerts: 1000
        },
        vulcan_cyber: {
          enabled: false,
          apiKey: '',
          baseUrl: '',
          tenantId: '',
          syncInterval: 600,
          maxAlerts: 500
        },
        kenna_security: {
          enabled: false,
          apiKey: '',
          baseUrl: '',
          syncInterval: 600,
          maxAlerts: 500
        },
        jira: {
          enabled: false,
          baseUrl: '',
          username: '',
          apiToken: '',
          projectKey: '',
          syncInterval: 600,
          maxAlerts: 1000
        },
        servicenow: {
          enabled: false,
          instanceUrl: '',
          username: '',
          password: '',
          tableName: 'incident',
          syncInterval: 600,
          maxAlerts: 1000
        }
      },
      ai: {
        openai: {
          enabled: false,
          apiKey: '',
          model: 'gpt-4',
          maxTokens: 2000,
          temperature: 0.2,
          timeout: 30000
        },
        analysis: {
          autoAnalyze: true,
          confidenceThreshold: 0.7,
          maxAnalysisPerHour: 100,
          enableThreatIntelligence: true,
          enableRemediationPlans: true
        }
      },
      security: {
        authentication: {
          jwtSecret: '',
          jwtExpiry: '24h',
          refreshTokenExpiry: '7d',
          passwordMinLength: 8,
          requireStrongPasswords: true,
          maxLoginAttempts: 5,
          lockoutDuration: 15
        },
        encryption: {
          algorithm: 'aes-256-gcm',
          keyRotationDays: 90
        },
        rateLimiting: {
          enabled: true,
          windowMs: 900000, // 15 minutes
          maxRequests: 100,
          skipSuccessfulRequests: false
        }
      },
      database: {
        mongodb: {
          uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/security-dashboard',
          options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
          }
        },
        redis: {
          enabled: false,
          host: 'localhost',
          port: 6379,
          password: '',
          db: 0,
          ttl: 3600
        }
      },
      logging: {
        level: 'info',
        format: 'json',
        transports: ['console', 'file'],
        file: {
          filename: 'logs/security-dashboard.log',
          maxSize: '10MB',
          maxFiles: 5
        }
      },
      monitoring: {
        healthCheck: {
          enabled: true,
          interval: 30000,
          timeout: 5000
        },
        metrics: {
          enabled: true,
          port: 9090,
          path: '/metrics'
        },
        alerts: {
          enabled: true,
          thresholds: {
            cpu: 80,
            memory: 85,
            disk: 90,
            responseTime: 5000
          }
        }
      }
    };
  }

  isSensitiveKey(key) {
    const sensitiveKeys = [
      'password', 'secret', 'token', 'key', 'credential',
      'apiKey', 'clientSecret', 'accessKey', 'secretKey',
      'botToken', 'signingSecret', 'webhookSecret'
    ];
    
    return sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive.toLowerCase())
    );
  }

  async validateIntegrationConfig(integrationType, config) {
    const requiredFields = this.getRequiredFields(integrationType);
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (!config[field] || config[field].trim() === '') {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    return true;
  }

  getRequiredFields(integrationType) {
    const fieldMap = {
      tenable: ['accessKey', 'secretKey'],
      crowdstrike: ['clientId', 'clientSecret'],
      veracode: ['apiId', 'apiKey'],
      splunk: ['host'],
      qualys: ['username', 'password', 'baseUrl'],
      rapid7: ['apiKey', 'baseUrl'],
      sentinelone: ['apiToken', 'baseUrl'],
      checkmarx: ['username', 'password', 'baseUrl'],
      qradar: ['host', 'username', 'password'],
      splunk_phantom: ['host', 'username', 'password'],
      palo_alto: ['apiKey', 'baseUrl'],
      microsoft_defender: ['tenantId', 'clientId', 'clientSecret'],
      carbon_black: ['apiKey', 'baseUrl'],
      fireeye: ['username', 'password', 'baseUrl'],
      darktrace: ['apiKey', 'baseUrl'],
      vulcan_cyber: ['apiKey', 'baseUrl'],
      kenna_security: ['apiKey', 'baseUrl'],
      jira: ['baseUrl', 'username', 'apiToken'],
      servicenow: ['instanceUrl', 'username', 'password']
    };
    
    return fieldMap[integrationType] || [];
  }

  async testIntegrationConnection(integrationType, config) {
    try {
      const IntegrationClass = require(`./${this.getIntegrationServiceName(integrationType)}`);
      const service = new IntegrationClass(config);
      
      if (typeof service.testConnection === 'function') {
        return await service.testConnection();
      } else {
        throw new Error('Integration service does not support connection testing');
      }
    } catch (error) {
      this.logger.error(`Integration test failed for ${integrationType}:`, error.message);
      throw error;
    }
  }

  getIntegrationServiceName(integrationType) {
    const serviceMap = {
      tenable: 'TenableService',
      crowdstrike: 'CrowdStrikeService',
      veracode: 'VeracodeService',
      splunk: 'SplunkService',
      qualys: 'QualysService',
      rapid7: 'Rapid7Service',
      sentinelone: 'SentinelOneService',
      checkmarx: 'CheckmarxService',
      qradar: 'QRadarService',
      splunk_phantom: 'SplunkPhantomService',
      palo_alto: 'PaloAltoService',
      microsoft_defender: 'MicrosoftDefenderService',
      carbon_black: 'CarbonBlackService',
      fireeye: 'FireEyeService',
      darktrace: 'DarktraceService',
      vulcan_cyber: 'VulcanCyberService',
      kenna_security: 'KennaSecurityService',
      jira: 'JiraService',
      servicenow: 'ServiceNowService'
    };
    
    return serviceMap[integrationType] || 'BaseIntegrationService';
  }

  async getConfigSummary() {
    try {
      const settings = await this.loadSettings();
      const secrets = await this.loadSecrets();
      
      return {
        general: settings.general,
        integrations: Object.keys(settings.integrations).map(key => ({
          name: key,
          enabled: settings.integrations[key].enabled,
          configured: this.isIntegrationConfigured(settings.integrations[key], secrets)
        })),
        notifications: {
          email: settings.notifications.email.enabled,
          slack: settings.notifications.slack.enabled,
          webhook: settings.notifications.webhook.enabled
        },
        ai: {
          enabled: settings.ai.openai.enabled,
          configured: !!secrets.openai_api_key
        },
        security: settings.security,
        monitoring: settings.monitoring
      };
    } catch (error) {
      this.logger.error('Failed to get config summary:', error.message);
      throw error;
    }
  }

  isIntegrationConfigured(integration, secrets) {
    const requiredFields = this.getRequiredFields(integration.name);
    return requiredFields.every(field => 
      integration[field] || secrets[`${integration.name}_${field}`]
    );
  }

  async exportConfig() {
    try {
      const settings = await this.loadSettings();
      const secrets = await this.loadSecrets();
      
      // Remove sensitive data for export
      const exportData = {
        settings,
        secrets: Object.keys(secrets).reduce((acc, key) => {
          if (this.isSensitiveKey(key)) {
            acc[key] = '[REDACTED]';
          } else {
            acc[key] = secrets[key];
          }
          return acc;
        }, {})
      };
      
      return exportData;
    } catch (error) {
      this.logger.error('Failed to export config:', error.message);
      throw error;
    }
  }

  async importConfig(configData) {
    try {
      if (configData.settings) {
        await this.saveSettings(configData.settings);
      }
      
      if (configData.secrets) {
        await this.saveSecrets(configData.secrets);
      }
      
      this.logger.info('Configuration imported successfully');
    } catch (error) {
      this.logger.error('Failed to import config:', error.message);
      throw error;
    }
  }

  async resetConfig() {
    try {
      await fs.unlink(this.secretsPath).catch(() => {});
      await fs.unlink(this.settingsPath).catch(() => {});
      
      const defaultSettings = this.getDefaultSettings();
      await this.saveSettings(defaultSettings);
      
      this.logger.info('Configuration reset to defaults');
    } catch (error) {
      this.logger.error('Failed to reset config:', error.message);
      throw error;
    }
  }
}

module.exports = ConfigService;

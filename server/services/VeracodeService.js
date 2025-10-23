const axios = require('axios');
const winston = require('winston');

class VeracodeService {
  constructor(config) {
    this.apiId = config.api_id;
    this.apiKey = config.api_key;
    this.baseUrl = config.base_url || 'https://analysiscenter.veracode.com';
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
  }

  async authenticate() {
    try {
      const credentials = Buffer.from(`${this.apiId}:${this.apiKey}`).toString('base64');
      const response = await axios.get(`${this.baseUrl}/api/authn/v2/users/self`, {
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      });
      
      this.credentials = credentials;
      return true;
    } catch (error) {
      this.logger.error('Veracode authentication failed:', error.message);
      throw new Error('Failed to authenticate with Veracode');
    }
  }

  async getApplications(filters = {}) {
    try {
      if (!this.credentials) {
        await this.authenticate();
      }

      const response = await axios.get(`${this.baseUrl}/api/applications/v2`, {
        headers: {
          'Authorization': `Basic ${this.credentials}`
        },
        params: filters
      });

      return response.data._embedded?.applications || [];
    } catch (error) {
      this.logger.error('Failed to fetch Veracode applications:', error.message);
      throw error;
    }
  }

  async getFlaws(appId, filters = {}) {
    try {
      if (!this.credentials) {
        await this.authenticate();
      }

      const params = {
        size: filters.limit || 100,
        page: filters.offset || 0,
        ...filters
      };

      const response = await axios.get(`${this.baseUrl}/api/applications/${appId}/findings`, {
        headers: {
          'Authorization': `Basic ${this.credentials}`
        },
        params
      });

      return this.transformFlaws(response.data._embedded?.findings || []);
    } catch (error) {
      this.logger.error('Failed to fetch Veracode flaws:', error.message);
      throw error;
    }
  }

  async getAllFlaws(filters = {}) {
    try {
      const applications = await this.getApplications();
      let allFlaws = [];

      for (const app of applications) {
        try {
          const flaws = await this.getFlaws(app.guid, filters);
          allFlaws = allFlaws.concat(flaws.map(flaw => ({
            ...flaw,
            application: {
              name: app.name,
              guid: app.guid,
              business_criticality: app.business_criticality
            }
          })));
        } catch (error) {
          this.logger.warn(`Failed to fetch flaws for application ${app.name}:`, error.message);
        }
      }

      return allFlaws;
    } catch (error) {
      this.logger.error('Failed to fetch all Veracode flaws:', error.message);
      throw error;
    }
  }

  async getScans(appId) {
    try {
      if (!this.credentials) {
        await this.authenticate();
      }

      const response = await axios.get(`${this.baseUrl}/api/applications/${appId}/scans`, {
        headers: {
          'Authorization': `Basic ${this.credentials}`
        }
      });

      return response.data._embedded?.scans || [];
    } catch (error) {
      this.logger.error('Failed to fetch Veracode scans:', error.message);
      throw error;
    }
  }

  transformFlaws(flaws) {
    return flaws.map(flaw => ({
      id: `veracode_${flaw.issue_id}`,
      source: 'veracode',
      title: flaw.title || flaw.description,
      description: flaw.description,
      severity: this.mapSeverity(flaw.severity),
      priority: this.calculatePriority(flaw),
      category: 'vulnerability',
      status: this.mapStatus(flaw.status),
      asset: {
        name: flaw.application?.name || 'Unknown Application',
        tags: flaw.tags || []
      },
      vulnerability: {
        cve: flaw.cwe_id,
        cvss_score: flaw.cvss_score,
        cvss_vector: flaw.cvss_vector,
        published_date: flaw.published_date,
        description: flaw.description,
        references: flaw.references || []
      },
      detection: {
        rule_name: flaw.rule_name,
        rule_id: flaw.rule_id,
        detection_time: flaw.scan_date,
        first_seen: flaw.first_found,
        last_seen: flaw.last_found,
        count: flaw.occurrences || 1
      },
      remediation: {
        steps: flaw.remediation_steps || [],
        estimated_time: this.estimateRemediationTime(flaw),
        difficulty: this.assessDifficulty(flaw),
        resources: flaw.references || []
      },
      created_at: flaw.first_found || flaw.scan_date,
      updated_at: flaw.last_found || flaw.scan_date,
      tags: flaw.tags || []
    }));
  }

  mapSeverity(severity) {
    const severityMap = {
      'Very High': 'critical',
      'High': 'high',
      'Medium': 'medium',
      'Low': 'low',
      'Very Low': 'info'
    };
    return severityMap[severity] || 'medium';
  }

  mapStatus(status) {
    const statusMap = {
      'New': 'open',
      'Open': 'open',
      'Fixed': 'resolved',
      'False Positive': 'false_positive',
      'Mitigated': 'resolved'
    };
    return statusMap[status] || 'open';
  }

  calculatePriority(flaw) {
    let priority = 1;
    
    const severityScore = {
      'critical': 10,
      'high': 8,
      'medium': 5,
      'low': 2,
      'info': 1
    };

    priority = severityScore[this.mapSeverity(flaw.severity)] || 5;

    // Adjust based on CVSS score
    if (flaw.cvss_score) {
      priority += Math.floor(flaw.cvss_score);
    }

    // Adjust based on business criticality
    if (flaw.application?.business_criticality) {
      const criticalityScore = {
        'Very High': 3,
        'High': 2,
        'Medium': 1,
        'Low': 0
      };
      priority += criticalityScore[flaw.application.business_criticality] || 0;
    }

    // Adjust based on exploitability
    if (flaw.exploitability) {
      priority += 1;
    }

    // Adjust based on age
    const daysSinceFirstFound = flaw.first_found ? 
      Math.floor((new Date() - new Date(flaw.first_found)) / (1000 * 60 * 60 * 24)) : 0;
    
    if (daysSinceFirstFound > 30) {
      priority += 1;
    }

    return Math.min(priority, 10);
  }

  estimateRemediationTime(flaw) {
    const severity = this.mapSeverity(flaw.severity);
    const timeMap = {
      'critical': '1-2 hours',
      'high': '4-8 hours',
      'medium': '1-3 days',
      'low': '1-2 weeks',
      'info': '1-4 weeks'
    };
    return timeMap[severity] || 'Unknown';
  }

  assessDifficulty(flaw) {
    if (flaw.cvss_score >= 9) return 'High';
    if (flaw.cvss_score >= 7) return 'Medium';
    return 'Low';
  }

  async testConnection() {
    try {
      await this.authenticate();
      const response = await axios.get(`${this.baseUrl}/api/applications/v2`, {
        headers: {
          'Authorization': `Basic ${this.credentials}`
        },
        params: { size: 1 }
      });
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = VeracodeService;

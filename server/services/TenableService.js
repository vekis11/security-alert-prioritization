const axios = require('axios');
const winston = require('winston');

class TenableService {
  constructor(config) {
    this.accessKey = config.access_key;
    this.secretKey = config.secret_key;
    this.baseUrl = config.base_url || 'https://cloud.tenable.com';
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
      const response = await axios.post(`${this.baseUrl}/tokens`, {
        accessKey: this.accessKey,
        secretKey: this.secretKey
      });
      
      this.token = response.data.token;
      return this.token;
    } catch (error) {
      this.logger.error('Tenable authentication failed:', error.message);
      throw new Error('Failed to authenticate with Tenable.io');
    }
  }

  async getVulnerabilities(filters = {}) {
    try {
      if (!this.token) {
        await this.authenticate();
      }

      const params = {
        limit: filters.limit || 100,
        offset: filters.offset || 0,
        ...filters
      };

      const response = await axios.get(`${this.baseUrl}/workbenches/vulnerabilities`, {
        headers: {
          'X-ApiKeys': `accessKey=${this.accessKey};secretKey=${this.secretKey}`
        },
        params
      });

      return this.transformVulnerabilities(response.data.vulnerabilities || []);
    } catch (error) {
      this.logger.error('Failed to fetch Tenable vulnerabilities:', error.message);
      throw error;
    }
  }

  async getAssets(filters = {}) {
    try {
      if (!this.token) {
        await this.authenticate();
      }

      const params = {
        limit: filters.limit || 100,
        offset: filters.offset || 0,
        ...filters
      };

      const response = await axios.get(`${this.baseUrl}/assets`, {
        headers: {
          'X-ApiKeys': `accessKey=${this.accessKey};secretKey=${this.secretKey}`
        },
        params
      });

      return response.data.assets || [];
    } catch (error) {
      this.logger.error('Failed to fetch Tenable assets:', error.message);
      throw error;
    }
  }

  transformVulnerabilities(vulnerabilities) {
    return vulnerabilities.map(vuln => ({
      id: `tenable_${vuln.plugin_id}`,
      source: 'tenable',
      title: vuln.plugin_name,
      description: vuln.description || vuln.synopsis,
      severity: this.mapSeverity(vuln.severity),
      priority: this.calculatePriority(vuln),
      category: 'vulnerability',
      asset: {
        name: vuln.hostname || vuln.ip_address,
        ip: vuln.ip_address,
        hostname: vuln.hostname,
        os: vuln.operating_system,
        tags: vuln.tags || []
      },
      vulnerability: {
        cve: vuln.cve || vuln.cpe,
        cvss_score: vuln.cvss_base_score,
        cvss_vector: vuln.cvss_vector,
        published_date: vuln.publication_date,
        description: vuln.description,
        references: vuln.see_also || []
      },
      detection: {
        rule_name: vuln.plugin_name,
        rule_id: vuln.plugin_id,
        detection_time: vuln.first_found,
        first_seen: vuln.first_found,
        last_seen: vuln.last_found,
        count: vuln.vuln_count || 1
      },
      remediation: {
        steps: vuln.solution ? [vuln.solution] : [],
        estimated_time: this.estimateRemediationTime(vuln),
        difficulty: this.assessDifficulty(vuln),
        resources: vuln.see_also || []
      },
      created_at: vuln.first_found,
      updated_at: vuln.last_found,
      tags: vuln.tags || []
    }));
  }

  mapSeverity(severity) {
    const severityMap = {
      0: 'info',
      1: 'low',
      2: 'medium',
      3: 'high',
      4: 'critical'
    };
    return severityMap[severity] || 'low';
  }

  calculatePriority(vuln) {
    let priority = 1;
    
    // Base priority on severity
    const severityScore = {
      'critical': 10,
      'high': 8,
      'medium': 5,
      'low': 2,
      'info': 1
    };

    priority = severityScore[this.mapSeverity(vuln.severity)] || 1;

    // Adjust based on CVSS score
    if (vuln.cvss_base_score) {
      priority += Math.floor(vuln.cvss_base_score);
    }

    // Adjust based on exploitability
    if (vuln.exploit_available) {
      priority += 2;
    }

    // Adjust based on age
    const daysSinceFirstFound = vuln.first_found ? 
      Math.floor((new Date() - new Date(vuln.first_found)) / (1000 * 60 * 60 * 24)) : 0;
    
    if (daysSinceFirstFound > 30) {
      priority += 1;
    }

    return Math.min(priority, 10);
  }

  estimateRemediationTime(vuln) {
    const severity = this.mapSeverity(vuln.severity);
    const timeMap = {
      'critical': '1-2 hours',
      'high': '4-8 hours',
      'medium': '1-3 days',
      'low': '1-2 weeks',
      'info': '1-4 weeks'
    };
    return timeMap[severity] || 'Unknown';
  }

  assessDifficulty(vuln) {
    if (vuln.cvss_base_score >= 9) return 'High';
    if (vuln.cvss_base_score >= 7) return 'Medium';
    return 'Low';
  }

  async testConnection() {
    try {
      await this.authenticate();
      const response = await axios.get(`${this.baseUrl}/scanners`, {
        headers: {
          'X-ApiKeys': `accessKey=${this.accessKey};secretKey=${this.secretKey}`
        }
      });
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = TenableService;

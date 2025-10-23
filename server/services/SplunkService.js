const axios = require('axios');
const winston = require('winston');

class SplunkService {
  constructor(config) {
    this.host = config.host;
    this.port = config.port || 8089;
    this.username = config.username;
    this.password = config.password;
    this.token = config.token;
    this.index = config.index || 'main';
    this.baseUrl = `https://${this.host}:${this.port}`;
    this.sessionKey = null;
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
      let authHeader;
      
      if (this.token) {
        authHeader = `Splunk ${this.token}`;
      } else {
        const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
        authHeader = `Basic ${credentials}`;
      }

      const response = await axios.post(`${this.baseUrl}/services/auth/login`, 
        `username=${this.username}&password=${this.password}`,
        {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Extract session key from response
      const sessionKeyMatch = response.data.match(/<sessionKey>([^<]+)<\/sessionKey>/);
      if (sessionKeyMatch) {
        this.sessionKey = sessionKeyMatch[1];
      }

      return this.sessionKey;
    } catch (error) {
      this.logger.error('Splunk authentication failed:', error.message);
      throw new Error('Failed to authenticate with Splunk');
    }
  }

  async ensureAuthenticated() {
    if (!this.sessionKey) {
      await this.authenticate();
    }
  }

  async search(query, options = {}) {
    try {
      await this.ensureAuthenticated();

      const params = {
        search: query,
        output_mode: 'json',
        count: options.limit || 100,
        offset: options.offset || 0,
        ...options
      };

      const response = await axios.get(`${this.baseUrl}/services/search/jobs/oneshot`, {
        headers: {
          'Authorization': `Splunk ${this.sessionKey}`
        },
        params
      });

      return response.data.results || [];
    } catch (error) {
      this.logger.error('Splunk search failed:', error.message);
      throw error;
    }
  }

  async getSecurityAlerts(filters = {}) {
    try {
      const query = this.buildSecurityQuery(filters);
      const results = await this.search(query, filters);
      return this.transformSecurityAlerts(results);
    } catch (error) {
      this.logger.error('Failed to fetch Splunk security alerts:', error.message);
      throw error;
    }
  }

  async getThreatIntelligence(filters = {}) {
    try {
      const query = this.buildThreatQuery(filters);
      const results = await this.search(query, filters);
      return this.transformThreatIntelligence(results);
    } catch (error) {
      this.logger.error('Failed to fetch Splunk threat intelligence:', error.message);
      throw error;
    }
  }

  async getComplianceViolations(filters = {}) {
    try {
      const query = this.buildComplianceQuery(filters);
      const results = await this.search(query, filters);
      return this.transformComplianceViolations(results);
    } catch (error) {
      this.logger.error('Failed to fetch Splunk compliance violations:', error.message);
      throw error;
    }
  }

  buildSecurityQuery(filters) {
    let query = `index=${this.index} sourcetype="*security*" OR sourcetype="*threat*"`;
    
    if (filters.severity) {
      query += ` severity="${filters.severity}"`;
    }
    
    if (filters.source_ip) {
      query += ` src_ip="${filters.source_ip}"`;
    }
    
    if (filters.dest_ip) {
      query += ` dest_ip="${filters.dest_ip}"`;
    }
    
    if (filters.time_range) {
      query += ` earliest=${filters.time_range}`;
    } else {
      query += ` earliest=-24h`;
    }

    return query;
  }

  buildThreatQuery(filters) {
    let query = `index=${this.index} sourcetype="*threat*" OR sourcetype="*ioc*"`;
    
    if (filters.threat_type) {
      query += ` threat_type="${filters.threat_type}"`;
    }
    
    if (filters.confidence) {
      query += ` confidence>${filters.confidence}`;
    }

    if (filters.time_range) {
      query += ` earliest=${filters.time_range}`;
    } else {
      query += ` earliest=-24h`;
    }

    return query;
  }

  buildComplianceQuery(filters) {
    let query = `index=${this.index} sourcetype="*compliance*" OR sourcetype="*audit*"`;
    
    if (filters.compliance_framework) {
      query += ` framework="${filters.compliance_framework}"`;
    }
    
    if (filters.violation_type) {
      query += ` violation_type="${filters.violation_type}"`;
    }

    if (filters.time_range) {
      query += ` earliest=${filters.time_range}`;
    } else {
      query += ` earliest=-7d`;
    }

    return query;
  }

  transformSecurityAlerts(alerts) {
    return alerts.map(alert => ({
      id: `splunk_${alert._cd || alert._time}`,
      source: 'splunk',
      title: alert.alert_name || alert.event_type || 'Security Alert',
      description: alert.description || alert.message || alert.raw,
      severity: this.mapSeverity(alert.severity || alert.priority),
      priority: this.calculatePriority(alert),
      category: this.mapCategory(alert.event_type || alert.sourcetype),
      asset: {
        name: alert.host || alert.src_host,
        ip: alert.src_ip || alert.dest_ip,
        hostname: alert.host,
        os: alert.os,
        tags: alert.tags || []
      },
      threat: {
        ioc_type: alert.ioc_type,
        ioc_value: alert.ioc_value,
        threat_actor: alert.threat_actor,
        attack_vector: alert.attack_vector,
        confidence: alert.confidence
      },
      detection: {
        rule_name: alert.rule_name || alert.alert_name,
        rule_id: alert.rule_id,
        detection_time: alert._time,
        first_seen: alert.first_time,
        last_seen: alert.last_time,
        count: alert.count || 1
      },
      created_at: alert._time,
      updated_at: alert._time,
      tags: alert.tags || []
    }));
  }

  transformThreatIntelligence(threats) {
    return threats.map(threat => ({
      id: `splunk_threat_${threat._cd || threat._time}`,
      source: 'splunk',
      title: threat.threat_name || threat.ioc_value || 'Threat Intelligence',
      description: threat.description || threat.threat_description,
      severity: this.mapSeverity(threat.severity || threat.confidence),
      priority: this.calculateThreatPriority(threat),
      category: 'threat',
      threat: {
        ioc_type: threat.ioc_type,
        ioc_value: threat.ioc_value,
        threat_actor: threat.threat_actor,
        attack_vector: threat.attack_vector,
        confidence: threat.confidence
      },
      detection: {
        rule_name: threat.rule_name,
        detection_time: threat._time,
        first_seen: threat.first_seen,
        last_seen: threat.last_seen,
        count: threat.count || 1
      },
      created_at: threat._time,
      updated_at: threat._time,
      tags: threat.tags || []
    }));
  }

  transformComplianceViolations(violations) {
    return violations.map(violation => ({
      id: `splunk_compliance_${violation._cd || violation._time}`,
      source: 'splunk',
      title: violation.violation_name || violation.control_name || 'Compliance Violation',
      description: violation.description || violation.violation_description,
      severity: this.mapSeverity(violation.severity || violation.risk_level),
      priority: this.calculateCompliancePriority(violation),
      category: 'compliance',
      asset: {
        name: violation.host || violation.asset_name,
        tags: violation.tags || []
      },
      detection: {
        rule_name: violation.control_name,
        detection_time: violation._time,
        first_seen: violation.first_seen,
        last_seen: violation.last_seen,
        count: violation.count || 1
      },
      created_at: violation._time,
      updated_at: violation._time,
      tags: violation.tags || []
    }));
  }

  mapSeverity(severity) {
    if (typeof severity === 'number') {
      if (severity >= 4) return 'critical';
      if (severity >= 3) return 'high';
      if (severity >= 2) return 'medium';
      return 'low';
    }

    const severityMap = {
      'Critical': 'critical',
      'High': 'high',
      'Medium': 'medium',
      'Low': 'low',
      'Info': 'info',
      'Warning': 'medium',
      'Error': 'high'
    };
    return severityMap[severity] || 'medium';
  }

  mapCategory(eventType) {
    const categoryMap = {
      'security': 'threat',
      'threat': 'threat',
      'compliance': 'compliance',
      'audit': 'compliance',
      'vulnerability': 'vulnerability',
      'incident': 'incident'
    };
    return categoryMap[eventType] || 'threat';
  }

  calculatePriority(alert) {
    let priority = 1;
    
    const severityScore = {
      'critical': 10,
      'high': 8,
      'medium': 5,
      'low': 2,
      'info': 1
    };

    priority = severityScore[this.mapSeverity(alert.severity)] || 5;

    // Adjust based on confidence
    if (alert.confidence) {
      priority += Math.floor(alert.confidence / 10);
    }

    // Adjust based on threat indicators
    if (alert.threat_actor) {
      priority += 2;
    }

    if (alert.ioc_type && alert.ioc_value) {
      priority += 1;
    }

    return Math.min(priority, 10);
  }

  calculateThreatPriority(threat) {
    let priority = this.calculatePriority(threat);
    
    // Adjust based on threat intelligence confidence
    if (threat.confidence >= 8) {
      priority += 2;
    } else if (threat.confidence >= 6) {
      priority += 1;
    }

    return Math.min(priority, 10);
  }

  calculateCompliancePriority(violation) {
    let priority = this.calculatePriority(violation);
    
    // Adjust based on compliance framework
    if (violation.framework === 'SOX' || violation.framework === 'PCI') {
      priority += 2;
    } else if (violation.framework === 'HIPAA' || violation.framework === 'GDPR') {
      priority += 1;
    }

    return Math.min(priority, 10);
  }

  async testConnection() {
    try {
      await this.authenticate();
      const response = await axios.get(`${this.baseUrl}/services/search/jobs/oneshot`, {
        headers: {
          'Authorization': `Splunk ${this.sessionKey}`
        },
        params: {
          search: `index=${this.index} | head 1`,
          output_mode: 'json'
        }
      });
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = SplunkService;

const axios = require('axios');
const winston = require('winston');

class CrowdStrikeService {
  constructor(config) {
    this.clientId = config.client_id;
    this.clientSecret = config.client_secret;
    this.baseUrl = config.base_url || 'https://api.crowdstrike.com';
    this.accessToken = null;
    this.tokenExpiry = null;
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
      const response = await axios.post(`${this.baseUrl}/oauth2/token`, 
        `client_id=${this.clientId}&client_secret=${this.clientSecret}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      return this.accessToken;
    } catch (error) {
      this.logger.error('CrowdStrike authentication failed:', error.message);
      throw new Error('Failed to authenticate with CrowdStrike');
    }
  }

  async ensureAuthenticated() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
  }

  async getDetections(filters = {}) {
    try {
      await this.ensureAuthenticated();

      const params = {
        limit: filters.limit || 100,
        offset: filters.offset || 0,
        sort: 'first_behavior|desc',
        ...filters
      };

      const response = await axios.get(`${this.baseUrl}/detects/queries/detects/v1`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        params
      });

      const detectionIds = response.data.resources || [];
      
      if (detectionIds.length === 0) {
        return [];
      }

      // Get detailed detection information
      const detailsResponse = await axios.get(`${this.baseUrl}/detects/entities/summaries/GET/v1`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        params: {
          ids: detectionIds.join(',')
        }
      });

      return this.transformDetections(detailsResponse.data.resources || []);
    } catch (error) {
      this.logger.error('Failed to fetch CrowdStrike detections:', error.message);
      throw error;
    }
  }

  async getIncidents(filters = {}) {
    try {
      await this.ensureAuthenticated();

      const params = {
        limit: filters.limit || 100,
        offset: filters.offset || 0,
        sort: 'start|desc',
        ...filters
      };

      const response = await axios.get(`${this.baseUrl}/incidents/queries/incidents/v1`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        params
      });

      const incidentIds = response.data.resources || [];
      
      if (incidentIds.length === 0) {
        return [];
      }

      // Get detailed incident information
      const detailsResponse = await axios.get(`${this.baseUrl}/incidents/entities/incidents/GET/v1`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        params: {
          ids: incidentIds.join(',')
        }
      });

      return this.transformIncidents(detailsResponse.data.resources || []);
    } catch (error) {
      this.logger.error('Failed to fetch CrowdStrike incidents:', error.message);
      throw error;
    }
  }

  async getHosts(filters = {}) {
    try {
      await this.ensureAuthenticated();

      const params = {
        limit: filters.limit || 100,
        offset: filters.offset || 0,
        ...filters
      };

      const response = await axios.get(`${this.baseUrl}/devices/queries/devices/v1`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        params
      });

      const hostIds = response.data.resources || [];
      
      if (hostIds.length === 0) {
        return [];
      }

      // Get detailed host information
      const detailsResponse = await axios.get(`${this.baseUrl}/devices/entities/devices/v1`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        params: {
          ids: hostIds.join(',')
        }
      });

      return detailsResponse.data.resources || [];
    } catch (error) {
      this.logger.error('Failed to fetch CrowdStrike hosts:', error.message);
      throw error;
    }
  }

  transformDetections(detections) {
    return detections.map(detection => ({
      id: `crowdstrike_${detection.detection_id}`,
      source: 'crowdstrike',
      title: detection.behavior || detection.pattern_id,
      description: detection.description || detection.pattern_description,
      severity: this.mapSeverity(detection.severity),
      priority: this.calculatePriority(detection),
      category: 'threat',
      asset: {
        name: detection.device?.hostname || detection.device?.hostname,
        ip: detection.device?.local_ip,
        hostname: detection.device?.hostname,
        os: detection.device?.os_version,
        tags: detection.device?.tags || []
      },
      threat: {
        ioc_type: detection.ioc_type,
        ioc_value: detection.ioc_value,
        threat_actor: detection.threat_actor,
        attack_vector: detection.attack_vector,
        confidence: detection.confidence
      },
      detection: {
        rule_name: detection.rule_name,
        rule_id: detection.rule_id,
        detection_time: detection.first_behavior,
        first_seen: detection.first_behavior,
        last_seen: detection.last_behavior,
        count: detection.behavior_count || 1
      },
      created_at: detection.first_behavior,
      updated_at: detection.last_behavior,
      tags: detection.tags || []
    }));
  }

  transformIncidents(incidents) {
    return incidents.map(incident => ({
      id: `crowdstrike_incident_${incident.incident_id}`,
      source: 'crowdstrike',
      title: incident.name || incident.title,
      description: incident.description,
      severity: this.mapSeverity(incident.severity),
      priority: this.calculateIncidentPriority(incident),
      category: 'incident',
      status: this.mapStatus(incident.status),
      asset: {
        name: incident.assigned_to,
        tags: incident.tags || []
      },
      threat: {
        threat_actor: incident.threat_actor,
        attack_vector: incident.attack_vector,
        confidence: incident.confidence
      },
      detection: {
        rule_name: incident.rule_name,
        detection_time: incident.start,
        first_seen: incident.start,
        last_seen: incident.end
      },
      created_at: incident.start,
      updated_at: incident.last_modified,
      tags: incident.tags || []
    }));
  }

  mapSeverity(severity) {
    const severityMap = {
      'Critical': 'critical',
      'High': 'high',
      'Medium': 'medium',
      'Low': 'low',
      'Info': 'info'
    };
    return severityMap[severity] || 'medium';
  }

  mapStatus(status) {
    const statusMap = {
      'New': 'open',
      'In Progress': 'in_progress',
      'Closed': 'resolved',
      'False Positive': 'false_positive'
    };
    return statusMap[status] || 'open';
  }

  calculatePriority(detection) {
    let priority = 1;
    
    const severityScore = {
      'critical': 10,
      'high': 8,
      'medium': 5,
      'low': 2,
      'info': 1
    };

    priority = severityScore[this.mapSeverity(detection.severity)] || 5;

    // Adjust based on confidence
    if (detection.confidence) {
      priority += Math.floor(detection.confidence / 10);
    }

    // Adjust based on threat actor
    if (detection.threat_actor) {
      priority += 2;
    }

    // Adjust based on IOCs
    if (detection.ioc_type && detection.ioc_value) {
      priority += 1;
    }

    return Math.min(priority, 10);
  }

  calculateIncidentPriority(incident) {
    let priority = this.calculatePriority(incident);
    
    // Adjust based on incident status
    if (incident.status === 'New') {
      priority += 1;
    }

    return Math.min(priority, 10);
  }

  async testConnection() {
    try {
      await this.authenticate();
      const response = await axios.get(`${this.baseUrl}/devices/queries/devices/v1`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        params: { limit: 1 }
      });
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = CrowdStrikeService;

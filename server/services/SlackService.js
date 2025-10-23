const { WebClient } = require('@slack/web-api');
const winston = require('winston');

class SlackService {
  constructor() {
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
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

  isConfigured() {
    return !!(process.env.SLACK_BOT_TOKEN && process.env.SLACK_SIGNING_SECRET);
  }

  async sendAlertNotification(alert, channel = null) {
    try {
      if (!this.isConfigured()) {
        this.logger.warn('Slack not configured, skipping notification');
        return false;
      }

      const channelId = channel || process.env.SLACK_DEFAULT_CHANNEL || '#security-alerts';
      
      const blocks = this.buildAlertBlocks(alert);
      
      const result = await this.client.chat.postMessage({
        channel: channelId,
        blocks: blocks,
        text: `Security Alert: ${alert.title}`,
        username: 'Security Dashboard',
        icon_emoji: ':shield:'
      });

      this.logger.info(`Slack notification sent for alert ${alert.id}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to send Slack notification:', error.message);
      throw error;
    }
  }

  async sendPrioritizationSummary(summary) {
    try {
      if (!this.isConfigured()) {
        return false;
      }

      const blocks = this.buildSummaryBlocks(summary);
      
      const result = await this.client.chat.postMessage({
        channel: process.env.SLACK_DEFAULT_CHANNEL || '#security-alerts',
        blocks: blocks,
        text: 'Security Alert Prioritization Summary',
        username: 'Security Dashboard',
        icon_emoji: ':chart_with_upwards_trend:'
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to send prioritization summary:', error.message);
      throw error;
    }
  }

  async sendDailyReport(report) {
    try {
      if (!this.isConfigured()) {
        return false;
      }

      const blocks = this.buildDailyReportBlocks(report);
      
      const result = await this.client.chat.postMessage({
        channel: process.env.SLACK_DEFAULT_CHANNEL || '#security-alerts',
        blocks: blocks,
        text: 'Daily Security Report',
        username: 'Security Dashboard',
        icon_emoji: ':bar_chart:'
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to send daily report:', error.message);
      throw error;
    }
  }

  buildAlertBlocks(alert) {
    const severityColor = this.getSeverityColor(alert.severity);
    const priorityEmoji = this.getPriorityEmoji(alert.priority);
    
    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${priorityEmoji} Security Alert: ${alert.title}`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Severity:*\n${alert.severity.toUpperCase()}`
          },
          {
            type: 'mrkdwn',
            text: `*Priority:*\n${alert.priority}/10`
          },
          {
            type: 'mrkdwn',
            text: `*Source:*\n${alert.source}`
          },
          {
            type: 'mrkdwn',
            text: `*Category:*\n${alert.category}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Description:*\n${alert.description}`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Asset:*\n${alert.asset?.name || 'Unknown'}`
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n${alert.status}`
          }
        ]
      },
      ...(alert.vulnerability?.cve ? [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*CVE:* ${alert.vulnerability.cve}${alert.vulnerability.cvss_score ? ` (CVSS: ${alert.vulnerability.cvss_score})` : ''}`
        }
      }] : []),
      ...(alert.ai_analysis?.urgency_reason ? [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*AI Analysis:*\n${alert.ai_analysis.urgency_reason}`
        }
      }] : []),
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Details'
            },
            url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/alerts/${alert.id}`,
            style: 'primary'
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Acknowledge'
            },
            action_id: 'acknowledge_alert',
            value: alert.id
          }
        ]
      }
    ];
  }

  buildSummaryBlocks(summary) {
    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🔍 Security Alert Prioritization Summary'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Total Alerts Analyzed:* ${summary.totalAlerts}\n*High Priority:* ${summary.highPriority}\n*Critical:* ${summary.critical}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Top Priority Alerts:*\n${summary.topAlerts.map((alert, index) => 
            `${index + 1}. *${alert.title}* (Priority: ${alert.priority}/10)`
          ).join('\n')}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Generated at ${new Date().toLocaleString()}`
          }
        ]
      }
    ];
  }

  buildDailyReportBlocks(report) {
    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📊 Daily Security Report'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*New Alerts:*\n${report.newAlerts}`
          },
          {
            type: 'mrkdwn',
            text: `*Resolved:*\n${report.resolved}`
          },
          {
            type: 'mrkdwn',
            text: `*Critical:*\n${report.critical}`
          },
          {
            type: 'mrkdwn',
            text: `*High Priority:*\n${report.highPriority}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Top Sources:*\n${report.topSources.map(source => 
            `• ${source.name}: ${source.count} alerts`
          ).join('\n')}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Most Common Categories:*\n${report.topCategories.map(category => 
            `• ${category.name}: ${category.count} alerts`
          ).join('\n')}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Report for ${new Date().toLocaleDateString()}`
          }
        ]
      }
    ];
  }

  getSeverityColor(severity) {
    const colors = {
      'critical': '#FF0000',
      'high': '#FF6600',
      'medium': '#FFCC00',
      'low': '#00CC00',
      'info': '#0066CC'
    };
    return colors[severity] || '#666666';
  }

  getPriorityEmoji(priority) {
    if (priority >= 9) return '🚨';
    if (priority >= 7) return '⚠️';
    if (priority >= 5) return '⚡';
    if (priority >= 3) return '📋';
    return 'ℹ️';
  }

  async handleInteractiveEvent(payload) {
    try {
      const action = payload.actions[0];
      
      switch (action.action_id) {
        case 'acknowledge_alert':
          return await this.handleAcknowledgeAlert(payload, action.value);
        default:
          this.logger.warn(`Unknown action: ${action.action_id}`);
          return { text: 'Unknown action' };
      }
    } catch (error) {
      this.logger.error('Failed to handle interactive event:', error.message);
      return { text: 'Error processing request' };
    }
  }

  async handleAcknowledgeAlert(payload, alertId) {
    try {
      // Here you would typically update the alert status in your database
      // For now, we'll just send a confirmation message
      
      return {
        text: `Alert ${alertId} has been acknowledged by <@${payload.user.id}>`,
        replace_original: false
      };
    } catch (error) {
      this.logger.error('Failed to acknowledge alert:', error.message);
      return { text: 'Failed to acknowledge alert' };
    }
  }

  async createSlashCommand(command, text, userId) {
    try {
      switch (command) {
        case '/security-status':
          return await this.handleStatusCommand(userId);
        case '/security-alerts':
          return await this.handleAlertsCommand(userId, text);
        case '/security-priority':
          return await this.handlePriorityCommand(userId);
        default:
          return { text: 'Unknown command' };
      }
    } catch (error) {
      this.logger.error('Failed to handle slash command:', error.message);
      return { text: 'Error processing command' };
    }
  }

  async handleStatusCommand(userId) {
    // This would typically fetch real-time status from your database
    return {
      text: 'Security Dashboard Status',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Security Dashboard Status*\n\n• System: Operational\n• Active Alerts: 15\n• Critical: 2\n• High Priority: 5\n• Last Sync: 2 minutes ago'
          }
        }
      ]
    };
  }

  async handleAlertsCommand(userId, text) {
    // This would typically fetch alerts from your database
    return {
      text: 'Recent Security Alerts',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Recent Security Alerts*\n\n• Critical vulnerability detected on web-server-01\n• High priority threat from suspicious IP\n• Medium risk compliance violation'
          }
        }
      ]
    };
  }

  async handlePriorityCommand(userId) {
    // This would typically fetch prioritized alerts from your database
    return {
      text: 'Priority Security Alerts',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Priority Security Alerts*\n\n1. 🚨 Critical: RCE vulnerability in web application\n2. ⚠️ High: Suspicious lateral movement detected\n3. ⚡ Medium: Unauthorized access attempt'
          }
        }
      ]
    };
  }
}

module.exports = SlackService;

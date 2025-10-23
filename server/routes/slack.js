const express = require('express');
const SlackService = require('../services/SlackService');
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

// Slack webhook endpoint for interactive events
router.post('/webhook', async (req, res) => {
  try {
    const slackService = new SlackService();
    
    if (!slackService.isConfigured()) {
      return res.status(400).json({ error: 'Slack service not configured' });
    }

    const { type, payload } = req.body;
    
    if (type === 'url_verification') {
      // Handle Slack URL verification
      return res.json({ challenge: payload.challenge });
    }
    
    if (type === 'event_callback') {
      const event = payload.event;
      
      // Handle different event types
      switch (event.type) {
        case 'app_mention':
          await handleAppMention(event);
          break;
        case 'message':
          if (event.text && event.text.startsWith('/')) {
            await handleSlashCommand(event);
          }
          break;
        default:
          logger.info(`Unhandled Slack event type: ${event.type}`);
      }
    }
    
    if (type === 'interactive') {
      const response = await slackService.handleInteractiveEvent(payload);
      return res.json(response);
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    logger.error('Slack webhook error:', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Send alert notification to Slack
router.post('/notify', async (req, res) => {
  try {
    const { alertId, channel } = req.body;
    
    if (!alertId) {
      return res.status(400).json({ error: 'Alert ID is required' });
    }

    const alert = await Alert.findOne({ id: alertId });
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const slackService = new SlackService();
    const result = await slackService.sendAlertNotification(alert, channel);
    
    logger.info(`Slack notification sent for alert: ${alertId}`);
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Failed to send Slack notification:', error.message);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Send prioritization summary to Slack
router.post('/prioritization-summary', async (req, res) => {
  try {
    const { summary } = req.body;
    
    if (!summary) {
      return res.status(400).json({ error: 'Summary data is required' });
    }

    const slackService = new SlackService();
    const result = await slackService.sendPrioritizationSummary(summary);
    
    logger.info('Slack prioritization summary sent');
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Failed to send prioritization summary:', error.message);
    res.status(500).json({ error: 'Failed to send summary' });
  }
});

// Send daily report to Slack
router.post('/daily-report', async (req, res) => {
  try {
    const { report } = req.body;
    
    if (!report) {
      return res.status(400).json({ error: 'Report data is required' });
    }

    const slackService = new SlackService();
    const result = await slackService.sendDailyReport(report);
    
    logger.info('Slack daily report sent');
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Failed to send daily report:', error.message);
    res.status(500).json({ error: 'Failed to send report' });
  }
});

// Get Slack service status
router.get('/status', async (req, res) => {
  try {
    const slackService = new SlackService();
    const isConfigured = slackService.isConfigured();
    
    res.json({ 
      configured: isConfigured,
      status: isConfigured ? 'ready' : 'not_configured',
      message: isConfigured ? 'Slack service is ready' : 'Slack service is not configured'
    });
  } catch (error) {
    logger.error('Failed to get Slack service status:', error.message);
    res.status(500).json({ error: 'Failed to get Slack service status' });
  }
});

// Test Slack service
router.post('/test', async (req, res) => {
  try {
    const slackService = new SlackService();
    
    if (!slackService.isConfigured()) {
      return res.status(400).json({ 
        error: 'Slack service is not configured',
        message: 'Please configure Slack bot token and signing secret'
      });
    }

    // Create a test alert
    const testAlert = {
      id: 'test_slack_alert',
      title: 'Test Slack Notification',
      description: 'This is a test alert to verify Slack integration',
      severity: 'medium',
      priority: 5,
      category: 'vulnerability',
      source: 'test',
      status: 'open',
      asset: { name: 'test-server' },
      vulnerability: { cve: 'CVE-2023-1234', cvss_score: 7.5 },
      created_at: new Date()
    };

    const result = await slackService.sendAlertNotification(testAlert);
    
    res.json({ 
      success: true,
      message: 'Slack service test successful',
      result
    });
  } catch (error) {
    logger.error('Slack service test failed:', error.message);
    res.status(500).json({ 
      error: 'Slack service test failed',
      message: error.message
    });
  }
});

// Handle app mention in Slack
async function handleAppMention(event) {
  try {
    const slackService = new SlackService();
    
    // Extract command from mention
    const text = event.text.replace(/<@[^>]+>/g, '').trim();
    
    let response;
    if (text.includes('status')) {
      response = await slackService.handleSlashCommand('/security-status', '', event.user);
    } else if (text.includes('alerts')) {
      response = await slackService.handleSlashCommand('/security-alerts', '', event.user);
    } else if (text.includes('priority')) {
      response = await slackService.handleSlashCommand('/security-priority', '', event.user);
    } else {
      response = {
        text: 'Hi! I can help you with security alerts. Try asking about "status", "alerts", or "priority".'
      };
    }
    
    // Send response back to Slack
    const { WebClient } = require('@slack/web-api');
    const client = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    await client.chat.postMessage({
      channel: event.channel,
      text: response.text,
      blocks: response.blocks
    });
  } catch (error) {
    logger.error('Failed to handle app mention:', error.message);
  }
}

// Handle slash command in Slack
async function handleSlashCommand(event) {
  try {
    const slackService = new SlackService();
    
    // Extract command and text
    const parts = event.text.split(' ');
    const command = parts[0];
    const text = parts.slice(1).join(' ');
    
    const response = await slackService.createSlashCommand(command, text, event.user);
    
    // Send response back to Slack
    const { WebClient } = require('@slack/web-api');
    const client = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    await client.chat.postMessage({
      channel: event.channel,
      text: response.text,
      blocks: response.blocks
    });
  } catch (error) {
    logger.error('Failed to handle slash command:', error.message);
  }
}

// Get Slack channels
router.get('/channels', async (req, res) => {
  try {
    const slackService = new SlackService();
    
    if (!slackService.isConfigured()) {
      return res.status(400).json({ error: 'Slack service not configured' });
    }

    const { WebClient } = require('@slack/web-api');
    const client = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    const result = await client.conversations.list({
      types: 'public_channel,private_channel'
    });
    
    const channels = result.channels.map(channel => ({
      id: channel.id,
      name: channel.name,
      is_private: channel.is_private,
      is_member: channel.is_member
    }));
    
    res.json({ channels });
  } catch (error) {
    logger.error('Failed to get Slack channels:', error.message);
    res.status(500).json({ error: 'Failed to get channels' });
  }
});

// Send custom message to Slack
router.post('/send-message', async (req, res) => {
  try {
    const { channel, message, blocks } = req.body;
    
    if (!channel || !message) {
      return res.status(400).json({ error: 'Channel and message are required' });
    }

    const { WebClient } = require('@slack/web-api');
    const client = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    const result = await client.chat.postMessage({
      channel,
      text: message,
      blocks,
      username: 'Security Dashboard',
      icon_emoji: ':shield:'
    });
    
    logger.info(`Custom Slack message sent to ${channel}`);
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Failed to send custom message:', error.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;

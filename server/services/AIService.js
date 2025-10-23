const OpenAI = require('openai');
const winston = require('winston');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
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
    return !!process.env.OPENAI_API_KEY;
  }

  async analyzeAlert(alert) {
    try {
      if (!this.isConfigured()) {
        return this.getDefaultAnalysis(alert);
      }

      const prompt = this.buildAnalysisPrompt(alert);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a cybersecurity expert AI assistant specializing in threat analysis and risk assessment. Provide detailed, actionable insights for security alerts and vulnerabilities."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

      const analysis = response.choices[0].message.content;
      return this.parseAnalysis(analysis, alert);
    } catch (error) {
      this.logger.error('AI analysis failed:', error.message);
      return this.getDefaultAnalysis(alert);
    }
  }

  async prioritizeAlerts(alerts) {
    try {
      if (!this.isConfigured()) {
        return this.getDefaultPrioritization(alerts);
      }

      const prompt = this.buildPrioritizationPrompt(alerts);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a cybersecurity expert AI assistant specializing in alert prioritization. Analyze multiple security alerts and provide a prioritized ranking with detailed explanations for each ranking decision."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.2
      });

      const prioritization = response.choices[0].message.content;
      return this.parsePrioritization(prioritization, alerts);
    } catch (error) {
      this.logger.error('AI prioritization failed:', error.message);
      return this.getDefaultPrioritization(alerts);
    }
  }

  async generateRemediationPlan(alert) {
    try {
      if (!this.isConfigured()) {
        return this.getDefaultRemediation(alert);
      }

      const prompt = this.buildRemediationPrompt(alert);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a cybersecurity expert AI assistant specializing in incident response and remediation. Provide detailed, step-by-step remediation plans for security issues."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.3
      });

      const remediation = response.choices[0].message.content;
      return this.parseRemediation(remediation, alert);
    } catch (error) {
      this.logger.error('AI remediation planning failed:', error.message);
      return this.getDefaultRemediation(alert);
    }
  }

  async generateThreatIntelligence(alert) {
    try {
      if (!this.isConfigured()) {
        return this.getDefaultThreatIntel(alert);
      }

      const prompt = this.buildThreatIntelPrompt(alert);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a cybersecurity expert AI assistant specializing in threat intelligence and threat actor analysis. Provide detailed threat intelligence insights and context for security alerts."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1200,
        temperature: 0.4
      });

      const threatIntel = response.choices[0].message.content;
      return this.parseThreatIntel(threatIntel, alert);
    } catch (error) {
      this.logger.error('AI threat intelligence generation failed:', error.message);
      return this.getDefaultThreatIntel(alert);
    }
  }

  buildAnalysisPrompt(alert) {
    return `
Analyze the following security alert and provide a comprehensive risk assessment:

Alert Details:
- Title: ${alert.title}
- Description: ${alert.description}
- Source: ${alert.source}
- Severity: ${alert.severity}
- Category: ${alert.category}
- Asset: ${JSON.stringify(alert.asset)}
- Vulnerability Details: ${JSON.stringify(alert.vulnerability)}
- Threat Details: ${JSON.stringify(alert.threat)}
- Detection Info: ${JSON.stringify(alert.detection)}

Please provide:
1. Risk Score (1-10)
2. Business Impact Assessment
3. Urgency Reason
4. Recommended Actions
5. Similar Incidents Context
6. Confidence Level (1-10)

Format your response as JSON with these exact keys: risk_score, business_impact, urgency_reason, recommended_actions, similar_incidents, confidence
    `.trim();
  }

  buildPrioritizationPrompt(alerts) {
    const alertsSummary = alerts.map((alert, index) => `
${index + 1}. ${alert.title}
   - Severity: ${alert.severity}
   - Source: ${alert.source}
   - Asset: ${alert.asset?.name || 'Unknown'}
   - Category: ${alert.category}
   - Current Priority: ${alert.priority}
    `).join('\n');

    return `
Analyze and prioritize the following security alerts. Consider factors like:
- Severity and potential impact
- Asset criticality
- Exploitability
- Business context
- Threat landscape

Alerts to prioritize:
${alertsSummary}

Provide a prioritized ranking (1 = highest priority) with detailed explanations for each ranking decision.

Format your response as JSON with an array of objects containing: alert_id, rank, priority_score, explanation
    `.trim();
  }

  buildRemediationPrompt(alert) {
    return `
Create a detailed remediation plan for this security alert:

Alert: ${alert.title}
Description: ${alert.description}
Severity: ${alert.severity}
Asset: ${alert.asset?.name || 'Unknown'}
Vulnerability: ${JSON.stringify(alert.vulnerability)}
Threat: ${JSON.stringify(alert.threat)}

Provide:
1. Immediate Actions (0-24 hours)
2. Short-term Actions (1-7 days)
3. Long-term Actions (1-4 weeks)
4. Required Resources
5. Estimated Timeline
6. Success Criteria

Format as JSON with: immediate_actions, short_term_actions, long_term_actions, resources, timeline, success_criteria
    `.trim();
  }

  buildThreatIntelPrompt(alert) {
    return `
Provide threat intelligence analysis for this security alert:

Alert: ${alert.title}
Source: ${alert.source}
Threat Details: ${JSON.stringify(alert.threat)}
Asset: ${JSON.stringify(alert.asset)}

Analyze:
1. Threat Actor Profile
2. Attack Vector Analysis
3. IOCs and Indicators
4. Historical Context
5. Mitigation Strategies
6. Intelligence Sources

Format as JSON with: threat_actor, attack_vector, iocs, historical_context, mitigation_strategies, intelligence_sources
    `.trim();
  }

  parseAnalysis(analysis, alert) {
    try {
      const parsed = JSON.parse(analysis);
      return {
        risk_score: parsed.risk_score || this.calculateRiskScore(alert),
        business_impact: parsed.business_impact || this.assessBusinessImpact(alert),
        urgency_reason: parsed.urgency_reason || this.getUrgencyReason(alert),
        recommended_actions: parsed.recommended_actions || this.getRecommendedActions(alert),
        similar_incidents: parsed.similar_incidents || [],
        confidence: parsed.confidence || 7
      };
    } catch (error) {
      this.logger.warn('Failed to parse AI analysis, using default:', error.message);
      return this.getDefaultAnalysis(alert);
    }
  }

  parsePrioritization(prioritization, alerts) {
    try {
      const parsed = JSON.parse(prioritization);
      return parsed.map(item => ({
        alert_id: item.alert_id,
        rank: item.rank,
        priority_score: item.priority_score,
        explanation: item.explanation
      }));
    } catch (error) {
      this.logger.warn('Failed to parse AI prioritization, using default:', error.message);
      return this.getDefaultPrioritization(alerts);
    }
  }

  parseRemediation(remediation, alert) {
    try {
      const parsed = JSON.parse(remediation);
      return {
        immediate_actions: parsed.immediate_actions || [],
        short_term_actions: parsed.short_term_actions || [],
        long_term_actions: parsed.long_term_actions || [],
        resources: parsed.resources || [],
        timeline: parsed.timeline || 'Unknown',
        success_criteria: parsed.success_criteria || []
      };
    } catch (error) {
      this.logger.warn('Failed to parse AI remediation, using default:', error.message);
      return this.getDefaultRemediation(alert);
    }
  }

  parseThreatIntel(threatIntel, alert) {
    try {
      const parsed = JSON.parse(threatIntel);
      return {
        threat_actor: parsed.threat_actor || 'Unknown',
        attack_vector: parsed.attack_vector || 'Unknown',
        iocs: parsed.iocs || [],
        historical_context: parsed.historical_context || 'No historical context available',
        mitigation_strategies: parsed.mitigation_strategies || [],
        intelligence_sources: parsed.intelligence_sources || []
      };
    } catch (error) {
      this.logger.warn('Failed to parse AI threat intelligence, using default:', error.message);
      return this.getDefaultThreatIntel(alert);
    }
  }

  getDefaultAnalysis(alert) {
    return {
      risk_score: this.calculateRiskScore(alert),
      business_impact: this.assessBusinessImpact(alert),
      urgency_reason: this.getUrgencyReason(alert),
      recommended_actions: this.getRecommendedActions(alert),
      similar_incidents: [],
      confidence: 5
    };
  }

  getDefaultPrioritization(alerts) {
    return alerts.map((alert, index) => ({
      alert_id: alert.id,
      rank: index + 1,
      priority_score: alert.priority,
      explanation: `Priority based on severity: ${alert.severity}`
    }));
  }

  getDefaultRemediation(alert) {
    return {
      immediate_actions: ['Isolate affected systems', 'Block malicious IPs'],
      short_term_actions: ['Apply security patches', 'Update security controls'],
      long_term_actions: ['Implement security monitoring', 'Conduct security training'],
      resources: ['Security team', 'IT team'],
      timeline: '1-2 weeks',
      success_criteria: ['No further incidents', 'Systems patched']
    };
  }

  getDefaultThreatIntel(alert) {
    return {
      threat_actor: 'Unknown',
      attack_vector: 'Unknown',
      iocs: [],
      historical_context: 'No historical context available',
      mitigation_strategies: ['Implement network segmentation', 'Deploy endpoint protection'],
      intelligence_sources: ['Internal logs', 'Security tools']
    };
  }

  calculateRiskScore(alert) {
    let score = 1;
    
    const severityScore = {
      'critical': 10,
      'high': 8,
      'medium': 5,
      'low': 2,
      'info': 1
    };

    score = severityScore[alert.severity] || 5;

    // Adjust based on CVSS score
    if (alert.vulnerability?.cvss_score) {
      score += Math.floor(alert.vulnerability.cvss_score);
    }

    // Adjust based on asset criticality
    if (alert.asset?.tags?.includes('critical')) {
      score += 2;
    }

    return Math.min(score, 10);
  }

  assessBusinessImpact(alert) {
    const severity = alert.severity;
    const asset = alert.asset?.name || 'Unknown';
    
    if (severity === 'critical') {
      return `Critical impact on ${asset} - immediate business disruption possible`;
    } else if (severity === 'high') {
      return `High impact on ${asset} - significant business risk`;
    } else if (severity === 'medium') {
      return `Medium impact on ${asset} - moderate business risk`;
    } else {
      return `Low impact on ${asset} - minimal business risk`;
    }
  }

  getUrgencyReason(alert) {
    const reasons = [];
    
    if (alert.severity === 'critical') {
      reasons.push('Critical severity requires immediate attention');
    }
    
    if (alert.vulnerability?.cvss_score >= 9) {
      reasons.push('Very high CVSS score indicates severe vulnerability');
    }
    
    if (alert.threat?.confidence >= 8) {
      reasons.push('High confidence threat detection');
    }
    
    if (alert.asset?.tags?.includes('critical')) {
      reasons.push('Affects critical business asset');
    }
    
    return reasons.length > 0 ? reasons.join('; ') : 'Standard priority based on severity';
  }

  getRecommendedActions(alert) {
    const actions = [];
    
    if (alert.severity === 'critical') {
      actions.push('Immediate isolation of affected systems');
      actions.push('Emergency response team activation');
    }
    
    if (alert.vulnerability?.cve) {
      actions.push(`Apply patch for CVE-${alert.vulnerability.cve}`);
    }
    
    if (alert.threat?.ioc_type) {
      actions.push(`Block IOC: ${alert.threat.ioc_value}`);
    }
    
    actions.push('Review security controls');
    actions.push('Update incident response procedures');
    
    return actions;
  }
}

module.exports = AIService;

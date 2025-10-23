import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  LightBulbIcon,
  ChartBarIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import Chart from '../components/Chart';

const AIInsights = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const queryClient = useQueryClient();

  const { data: insights, isLoading } = useQuery(
    ['ai-insights', selectedTimeRange],
    () => axios.get(`/api/ai/insights?timeRange=${selectedTimeRange}`).then(res => res.data.insights),
    { refetchInterval: 60000 }
  );

  const { data: aiStatus } = useQuery(
    'ai-status',
    () => axios.get('/api/ai/status').then(res => res.data)
  );

  const prioritizeAlertsMutation = useMutation(
    (alertIds) => axios.post('/api/ai/prioritize', { alertIds }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('alerts');
        toast.success('Alerts prioritized successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to prioritize alerts');
      }
    }
  );

  const generateInsightsMutation = useMutation(
    () => axios.post('/api/ai/bulk-process', { 
      alertIds: insights?.highPriorityAlerts?.map(a => a.id) || [],
      operations: ['analyze', 'prioritize']
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['ai-insights', selectedTimeRange]);
        toast.success('AI insights generated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to generate insights');
      }
    }
  );

  if (isLoading) {
    return <LoadingSpinner size="xl" text="Loading AI insights..." />;
  }

  const timeRangeOptions = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            AI-Powered Insights
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Intelligent threat analysis and automated prioritization
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="form-input"
          >
            {timeRangeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => generateInsightsMutation.mutate()}
            disabled={generateInsightsMutation.isLoading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SparklesIcon className="h-4 w-4 mr-2" />
            {generateInsightsMutation.isLoading ? 'Generating...' : 'Generate Insights'}
          </button>
        </div>
      </div>

      {/* AI Status */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${aiStatus?.configured ? 'bg-green-100' : 'bg-red-100'}`}>
              <CpuChipIcon className={`h-6 w-6 ${aiStatus?.configured ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">AI Service Status</h3>
              <p className="text-sm text-gray-500">
                {aiStatus?.configured ? 'AI service is ready and configured' : 'AI service is not configured'}
              </p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            aiStatus?.configured 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {aiStatus?.status || 'Unknown'}
          </div>
        </div>
      </div>

      {/* High Priority Alerts */}
      {insights?.highPriorityAlerts && insights.highPriorityAlerts.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-red-600" />
              High Priority Alerts
            </h3>
            <button
              onClick={() => prioritizeAlertsMutation.mutate(insights.highPriorityAlerts.map(a => a.id))}
              disabled={prioritizeAlertsMutation.isLoading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {prioritizeAlertsMutation.isLoading ? 'Prioritizing...' : 'Re-prioritize'}
            </button>
          </div>
          <div className="space-y-4">
            {insights.highPriorityAlerts.map((alert, index) => (
              <div key={alert.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-gray-900">Priority: {alert.priority}/10</span>
                  </div>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">{alert.title}</h4>
                {alert.urgency_reason && (
                  <div className="bg-blue-50 p-3 rounded-lg mb-2">
                    <p className="text-sm text-blue-800">
                      <strong>AI Analysis:</strong> {alert.urgency_reason}
                    </p>
                  </div>
                )}
                {alert.recommended_actions && alert.recommended_actions.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Recommended Actions:</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {alert.recommended_actions.map((action, actionIndex) => (
                        <li key={actionIndex} className="flex items-start space-x-2">
                          <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Critical Vulnerabilities */}
      {insights?.criticalVulnerabilities && insights.criticalVulnerabilities.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-red-600" />
              Critical Vulnerabilities
            </h3>
          </div>
          <div className="space-y-3">
            {insights.criticalVulnerabilities.map((vuln, index) => (
              <div key={vuln.id} className="border border-red-200 bg-red-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-medium text-gray-900">{vuln.title}</h4>
                  <div className="flex items-center space-x-2">
                    {vuln.cve && (
                      <span className="text-sm font-mono text-gray-600">{vuln.cve}</span>
                    )}
                    {vuln.cvss_score && (
                      <span className="text-sm font-medium text-red-600">CVSS: {vuln.cvss_score}</span>
                    )}
                  </div>
                </div>
                {vuln.business_impact && (
                  <p className="text-sm text-red-800">
                    <strong>Business Impact:</strong> {vuln.business_impact}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Threat Intelligence */}
      {insights?.threatAlerts && insights.threatAlerts.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-orange-600" />
              Threat Intelligence
            </h3>
          </div>
          <div className="space-y-3">
            {insights.threatAlerts.map((threat, index) => (
              <div key={threat.id} className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-medium text-gray-900">{threat.title}</h4>
                  <div className="flex items-center space-x-2">
                    {threat.confidence && (
                      <span className="text-sm font-medium text-orange-600">
                        Confidence: {threat.confidence}/10
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {threat.threat_actor && (
                    <div>
                      <span className="font-medium text-gray-700">Threat Actor:</span>
                      <span className="ml-2 text-gray-600">{threat.threat_actor}</span>
                    </div>
                  )}
                  {threat.attack_vector && (
                    <div>
                      <span className="font-medium text-gray-700">Attack Vector:</span>
                      <span className="ml-2 text-gray-600">{threat.attack_vector}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance Violations */}
      {insights?.complianceViolations && insights.complianceViolations.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <CheckCircleIcon className="h-5 w-5 mr-2 text-yellow-600" />
              Compliance Violations
            </h3>
          </div>
          <div className="space-y-3">
            {insights.complianceViolations.map((violation, index) => (
              <div key={violation.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-medium text-gray-900">{violation.title}</h4>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    violation.severity === 'critical' ? 'bg-red-100 text-red-800' :
                    violation.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {violation.severity.toUpperCase()}
                  </span>
                </div>
                {violation.business_impact && (
                  <p className="text-sm text-yellow-800">
                    <strong>Business Impact:</strong> {violation.business_impact}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      {insights?.recommendations && insights.recommendations.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <LightBulbIcon className="h-5 w-5 mr-2 text-blue-600" />
              AI Recommendations
            </h3>
          </div>
          <div className="space-y-3">
            {insights.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                <div className="flex-shrink-0">
                  <ArrowTrendingUpIcon className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-sm text-blue-800">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Alert Severity Distribution</h3>
          </div>
          <Chart
            type="doughnut"
            data={{
              labels: ['Critical', 'High', 'Medium', 'Low'],
              datasets: [{
                data: [
                  insights?.criticalVulnerabilities?.length || 0,
                  insights?.highPriorityAlerts?.filter(a => a.severity === 'high').length || 0,
                  insights?.highPriorityAlerts?.filter(a => a.severity === 'medium').length || 0,
                  insights?.highPriorityAlerts?.filter(a => a.severity === 'low').length || 0
                ],
                backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e'],
                borderWidth: 0
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom'
                }
              }
            }}
            height={300}
          />
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Threat Categories</h3>
          </div>
          <Chart
            type="bar"
            data={{
              labels: ['Vulnerabilities', 'Threats', 'Compliance', 'Incidents'],
              datasets: [{
                label: 'Count',
                data: [
                  insights?.criticalVulnerabilities?.length || 0,
                  insights?.threatAlerts?.length || 0,
                  insights?.complianceViolations?.length || 0,
                  0 // incidents count
                ],
                backgroundColor: ['#3b82f6', '#ef4444', '#eab308', '#8b5cf6'],
                borderWidth: 0
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                }
              },
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }}
            height={300}
          />
        </div>
      </div>
    </div>
  );
};

export default AIInsights;

import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import {
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import AlertCard from '../components/AlertCard';
import StatsCard from '../components/StatsCard';
import Chart from '../components/Chart';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useQuery(
    'dashboard-stats',
    () => axios.get('/api/alerts/stats/overview?timeRange=24h').then(res => res.data),
    { refetchInterval: 30000 }
  );

  const { data: recentAlerts, isLoading: alertsLoading } = useQuery(
    'recent-alerts',
    () => axios.get('/api/alerts?limit=10&sortBy=created_at&sortOrder=desc').then(res => res.data),
    { refetchInterval: 30000 }
  );

  const { data: aiInsights, isLoading: insightsLoading } = useQuery(
    'ai-insights',
    () => axios.get('/api/ai/insights?timeRange=24h').then(res => res.data),
    { refetchInterval: 60000 }
  );

  if (statsLoading || alertsLoading || insightsLoading) {
    return <LoadingSpinner />;
  }

  const overview = stats?.overview || {
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    open: 0,
    inProgress: 0,
    resolved: 0
  };

  const alerts = recentAlerts?.alerts || [];
  const insights = aiInsights?.insights || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-7 text-gray-900 truncate">
            Security Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Real-time security monitoring and threat analysis
          </p>
        </div>
        <div className="flex-shrink-0">
          <Link
            to="/alerts"
            className="inline-flex items-center px-3 py-2 sm:px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto justify-center"
          >
            View All Alerts
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Alerts"
          value={overview.total}
          icon={ExclamationTriangleIcon}
          color="blue"
          trend={overview.total > 0 ? 'up' : 'neutral'}
        />
        <StatsCard
          title="Critical"
          value={overview.critical}
          icon={ShieldCheckIcon}
          color="red"
          trend={overview.critical > 0 ? 'up' : 'down'}
        />
        <StatsCard
          title="High Priority"
          value={overview.high}
          icon={ChartBarIcon}
          color="orange"
          trend={overview.high > 0 ? 'up' : 'down'}
        />
        <StatsCard
          title="Open"
          value={overview.open}
          icon={ClockIcon}
          color="yellow"
          trend={overview.open > 0 ? 'up' : 'down'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Alert Severity Distribution</h3>
          </div>
          <div className="h-64 sm:h-80">
            <Chart
              type="doughnut"
              data={{
                labels: ['Critical', 'High', 'Medium', 'Low'],
                datasets: [{
                  data: [overview.critical, overview.high, overview.medium, overview.low],
                  backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e'],
                  borderWidth: 0
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      padding: 10,
                      usePointStyle: true
                    }
                  }
                }
              }}
              height={300}
            />
          </div>
        </div>

        {/* Status Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Alert Status Distribution</h3>
          </div>
          <div className="h-64 sm:h-80">
            <Chart
              type="bar"
              data={{
                labels: ['Open', 'Investigating', 'In Progress', 'Resolved'],
                datasets: [{
                  label: 'Count',
                  data: [overview.open, overview.inProgress, overview.inProgress, overview.resolved],
                  backgroundColor: ['#ef4444', '#f97316', '#3b82f6', '#22c55e'],
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
                  },
                  x: {
                    ticks: {
                      maxRotation: 45
                    }
                  }
                }
              }}
              height={300}
            />
          </div>
        </div>
      </div>

      {/* AI Insights */}
      {insights.recommendations && insights.recommendations.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">AI-Powered Insights</h3>
            <p className="text-sm text-gray-500">Recommendations based on current threat landscape</p>
          </div>
          <div className="space-y-3">
            {insights.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex-shrink-0">
                  <ArrowTrendingUpIcon className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-sm text-blue-800">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Recent Alerts</h3>
          <Link
            to="/alerts"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View all alerts
          </Link>
        </div>
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No recent alerts</p>
            </div>
          ) : (
            alerts.slice(0, 5).map((alert) => (
              <AlertCard key={alert.id} alert={alert} showActions={false} />
            ))
          )}
        </div>
      </div>

      {/* Top Sources */}
      {stats?.topSources && stats.topSources.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Top Alert Sources</h3>
          </div>
          <div className="space-y-3">
            {stats.topSources.map((source, index) => (
              <div key={source._id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {source._id.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {source._id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">{source.count} alerts</span>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(source.count / stats.topSources[0].count) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

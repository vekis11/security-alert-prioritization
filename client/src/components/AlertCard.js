import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  EyeIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

const AlertCard = ({ alert, showActions = true, compact = false }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'text-red-800 bg-red-100 border-red-200',
      high: 'text-orange-800 bg-orange-100 border-orange-200',
      medium: 'text-yellow-800 bg-yellow-100 border-yellow-200',
      low: 'text-green-800 bg-green-100 border-green-200',
      info: 'text-blue-800 bg-blue-100 border-blue-200'
    };
    return colors[severity] || colors.info;
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'text-red-800 bg-red-100',
      investigating: 'text-yellow-800 bg-yellow-100',
      in_progress: 'text-blue-800 bg-blue-100',
      resolved: 'text-green-800 bg-green-100',
      false_positive: 'text-gray-800 bg-gray-100'
    };
    return colors[status] || colors.open;
  };

  const getPriorityColor = (priority) => {
    if (priority >= 9) return 'text-red-800 bg-red-100';
    if (priority >= 7) return 'text-orange-800 bg-orange-100';
    if (priority >= 5) return 'text-yellow-800 bg-yellow-100';
    if (priority >= 3) return 'text-green-800 bg-green-100';
    return 'text-gray-800 bg-gray-100';
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'high':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'medium':
        return <InformationCircleIcon className="h-4 w-4" />;
      case 'low':
        return <CheckCircleIcon className="h-4 w-4" />;
      default:
        return <InformationCircleIcon className="h-4 w-4" />;
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow duration-200">
        <div className="flex items-center space-x-3">
          <div className={`p-1 rounded-full ${getSeverityColor(alert.severity)}`}>
            {getSeverityIcon(alert.severity)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {alert.title}
            </p>
            <p className="text-xs text-gray-500">
              {alert.source} • {formatTime(alert.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
            {alert.severity}
          </span>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(alert.priority)}`}>
            P{alert.priority}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                {getSeverityIcon(alert.severity)}
                <span className="ml-1 hidden sm:inline">{alert.severity.toUpperCase()}</span>
                <span className="ml-1 sm:hidden">{alert.severity.charAt(0).toUpperCase()}</span>
              </span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(alert.priority)}`}>
                P{alert.priority}
              </span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(alert.status)}`}>
                <span className="hidden sm:inline">{alert.status.replace('_', ' ').toUpperCase()}</span>
                <span className="sm:hidden">{alert.status.charAt(0).toUpperCase()}</span>
              </span>
            </div>
            
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2 line-clamp-2">
              {alert.title}
            </h3>
            
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {alert.description}
            </p>
            
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <TagIcon className="h-3 w-3 flex-shrink-0" />
                <span className="capitalize truncate">{alert.source}</span>
              </div>
              <div className="flex items-center space-x-1">
                <ClockIcon className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{formatTime(alert.created_at)}</span>
              </div>
              {alert.asset?.name && (
                <div className="flex items-center space-x-1 min-w-0">
                  <span className="truncate">Asset: {alert.asset.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alert.vulnerability?.cve && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">CVE</h4>
                  <p className="text-sm text-gray-600">{alert.vulnerability.cve}</p>
                </div>
              )}
              
              {alert.vulnerability?.cvss_score && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">CVSS Score</h4>
                  <p className="text-sm text-gray-600">{alert.vulnerability.cvss_score}</p>
                </div>
              )}
              
              {alert.threat?.threat_actor && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Threat Actor</h4>
                  <p className="text-sm text-gray-600">{alert.threat.threat_actor}</p>
                </div>
              )}
              
              {alert.assignee?.name && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Assigned To</h4>
                  <div className="flex items-center space-x-1">
                    <UserIcon className="h-3 w-3" />
                    <span className="text-sm text-gray-600">{alert.assignee.name}</span>
                  </div>
                </div>
              )}
            </div>
            
            {alert.ai_analysis?.urgency_reason && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-1">AI Analysis</h4>
                <p className="text-sm text-blue-800">{alert.ai_analysis.urgency_reason}</p>
              </div>
            )}
            
            {alert.tags && alert.tags.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {alert.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {showActions && (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <EyeIcon className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">{showDetails ? 'Hide Details' : 'Show Details'}</span>
                <span className="sm:hidden">{showDetails ? 'Hide' : 'Show'}</span>
              </button>
              
              {alert.comments && alert.comments.length > 0 && (
                <span className="inline-flex items-center text-xs text-gray-500">
                  <ChatBubbleLeftIcon className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">{alert.comments.length} comments</span>
                  <span className="sm:hidden">{alert.comments.length}</span>
                </span>
              )}
            </div>
            
            <Link
              to={`/alerts/${alert.id}`}
              className="inline-flex items-center justify-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto"
            >
              View Details
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertCard;

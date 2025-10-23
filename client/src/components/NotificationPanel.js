import React from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Link } from 'react-router-dom';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  BellIcon
} from '@heroicons/react/24/outline';

const NotificationPanel = ({ notifications, onClose, onClearAll }) => {
  const { dismissNotification } = useSocket();

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'alert':
      case 'alert-notification':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'sync':
      case 'sync-complete':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'prioritization':
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <BellIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Notifications</h3>
          <div className="flex items-center space-x-2">
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs sm:text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <BellIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="p-4 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      <button
                        onClick={() => dismissNotification(notification.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    
                    {notification.severity && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border mt-2 ${getSeverityColor(notification.severity)}`}>
                        {notification.severity.toUpperCase()}
                      </span>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">
                        {formatTime(notification.timestamp)}
                      </p>
                      
                      {notification.alertId && (
                        <Link
                          to={`/alerts/${notification.alertId}`}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          View details
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <Link
            to="/alerts"
            className="block w-full text-center text-sm text-blue-600 hover:text-blue-800"
            onClick={onClose}
          >
            View all alerts
          </Link>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;

import React from 'react';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
} from '@heroicons/react/24/outline';

const StatsCard = ({ title, value, icon: Icon, color, trend, subtitle }) => {
  const getColorClasses = (color) => {
    const colors = {
      blue: 'text-blue-600 bg-blue-100',
      red: 'text-red-600 bg-red-100',
      orange: 'text-orange-600 bg-orange-100',
      yellow: 'text-yellow-600 bg-yellow-100',
      green: 'text-green-600 bg-green-100',
      purple: 'text-purple-600 bg-purple-100',
      gray: 'text-gray-600 bg-gray-100'
    };
    return colors[color] || colors.gray;
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <ArrowTrendingUpIcon className="h-4 w-4 text-red-500" />;
      case 'down':
        return <ArrowTrendingDownIcon className="h-4 w-4 text-green-500" />;
      default:
        return <MinusIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'up':
        return 'text-red-600';
      case 'down':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="card">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`p-3 rounded-lg ${getColorClasses(color)}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">
                {value.toLocaleString()}
              </div>
              {trend && (
                <div className={`ml-2 flex items-baseline text-sm font-semibold ${getTrendColor(trend)}`}>
                  {getTrendIcon(trend)}
                </div>
              )}
            </dd>
            {subtitle && (
              <dd className="text-sm text-gray-500 mt-1">
                {subtitle}
              </dd>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;

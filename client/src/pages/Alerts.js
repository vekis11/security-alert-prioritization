import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import AlertCard from '../components/AlertCard';
import LoadingSpinner from '../components/LoadingSpinner';

const Alerts = () => {
  const [filters, setFilters] = useState({
    search: '',
    severity: '',
    status: '',
    source: '',
    category: '',
    priority: '',
    assignee: '',
    page: 1,
    limit: 25,
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error, refetch } = useQuery(
    ['alerts', filters],
    () => axios.get('/api/alerts', { params: filters }).then(res => res.data),
    { keepPreviousData: true }
  );

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    refetch();
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      severity: '',
      status: '',
      source: '',
      category: '',
      priority: '',
      assignee: '',
      page: 1,
      limit: 25,
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
  };

  const getSeverityCount = (severity) => {
    return data?.stats?.[severity] || 0;
  };

  const getStatusCount = (status) => {
    const statusMap = {
      open: 'open',
      investigating: 'inProgress',
      resolved: 'resolved'
    };
    return data?.stats?.[statusMap[status]] || 0;
  };

  if (isLoading) {
    return <LoadingSpinner size="xl" text="Loading alerts..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Alerts</h3>
        <p className="text-gray-500 mb-4">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  const alerts = data?.alerts || [];
  const stats = data?.stats || {};
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-7 text-gray-900 truncate">
            Security Alerts
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and manage security alerts across all sources
          </p>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 sm:px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto justify-center"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-lg bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Critical</dt>
                <dd className="text-2xl font-semibold text-gray-900">{getSeverityCount('critical')}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-lg bg-orange-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">High</dt>
                <dd className="text-2xl font-semibold text-gray-900">{getSeverityCount('high')}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-lg bg-yellow-100">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Open</dt>
                <dd className="text-2xl font-semibold text-gray-900">{getStatusCount('open')}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-lg bg-green-100">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Resolved</dt>
                <dd className="text-2xl font-semibold text-gray-900">{getStatusCount('resolved')}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear all
            </button>
          </div>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="sm:col-span-2 xl:col-span-1">
                <label className="form-label">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="form-input pl-10"
                    placeholder="Search alerts..."
                  />
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="form-label">Severity</label>
                <select
                  value={filters.severity}
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                  className="form-input"
                >
                  <option value="">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="info">Info</option>
                </select>
              </div>

              <div>
                <label className="form-label">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="form-input"
                >
                  <option value="">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="investigating">Investigating</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="false_positive">False Positive</option>
                </select>
              </div>

              <div>
                <label className="form-label">Source</label>
                <select
                  value={filters.source}
                  onChange={(e) => handleFilterChange('source', e.target.value)}
                  className="form-input"
                >
                  <option value="">All Sources</option>
                  <option value="tenable">Tenable</option>
                  <option value="crowdstrike">CrowdStrike</option>
                  <option value="veracode">Veracode</option>
                  <option value="splunk">Splunk</option>
                  <option value="manual">Manual</option>
                </select>
              </div>

              <div>
                <label className="form-label">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="form-input"
                >
                  <option value="">All Categories</option>
                  <option value="vulnerability">Vulnerability</option>
                  <option value="threat">Threat</option>
                  <option value="compliance">Compliance</option>
                  <option value="incident">Incident</option>
                  <option value="anomaly">Anomaly</option>
                </select>
              </div>

              <div>
                <label className="form-label">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="form-input"
                >
                  <option value="">All Priorities</option>
                  <option value="9">9-10 (Critical)</option>
                  <option value="7">7-8 (High)</option>
                  <option value="5">5-6 (Medium)</option>
                  <option value="3">3-4 (Low)</option>
                  <option value="1">1-2 (Info)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <label className="form-label">Sort By</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="form-input"
                  >
                    <option value="created_at">Created Date</option>
                    <option value="priority">Priority</option>
                    <option value="severity">Severity</option>
                    <option value="status">Status</option>
                    <option value="title">Title</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Order</label>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                    className="form-input"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="btn-primary"
              >
                Apply Filters
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Alerts Found</h3>
            <p className="text-gray-500">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} showActions={true} />
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleFilterChange('page', pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => handleFilterChange('page', pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;

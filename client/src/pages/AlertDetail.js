import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  UserIcon,
  ClockIcon,
  TagIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  LightBulbIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import Chart from '../components/Chart';

const AlertDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const { data: alert, isLoading, error } = useQuery(
    ['alert', id],
    () => axios.get(`/api/alerts/${id}`).then(res => res.data.alert),
    { enabled: !!id }
  );

  const { data: aiAnalysis } = useQuery(
    ['alert-analysis', id],
    () => axios.get(`/api/alerts/${id}/analysis`).then(res => res.data.analysis),
    { enabled: !!id }
  );

  const { data: remediation } = useQuery(
    ['alert-remediation', id],
    () => axios.get(`/api/alerts/${id}/remediation`).then(res => res.data.remediation),
    { enabled: !!id }
  );

  const { data: threatIntel } = useQuery(
    ['alert-threat-intel', id],
    () => axios.get(`/api/alerts/${id}/threat-intelligence`).then(res => res.data.threat_intelligence),
    { enabled: !!id }
  );

  const updateAlertMutation = useMutation(
    (data) => axios.put(`/api/alerts/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['alert', id]);
        toast.success('Alert updated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update alert');
      }
    }
  );

  const assignAlertMutation = useMutation(
    (assignee) => axios.put(`/api/alerts/${id}/assign`, { assignee }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['alert', id]);
        toast.success('Alert assigned successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to assign alert');
      }
    }
  );

  const resolveAlertMutation = useMutation(
    (resolution_notes) => axios.put(`/api/alerts/${id}/resolve`, { resolution_notes }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['alert', id]);
        toast.success('Alert resolved successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to resolve alert');
      }
    }
  );

  const markFalsePositiveMutation = useMutation(
    (reason) => axios.put(`/api/alerts/${id}/false-positive`, { reason }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['alert', id]);
        toast.success('Alert marked as false positive');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to mark as false positive');
      }
    }
  );

  const handleStatusChange = (status) => {
    updateAlertMutation.mutate({ status });
  };

  const handleAssign = (assignee) => {
    assignAlertMutation.mutate(assignee);
  };

  const handleResolve = (resolution_notes) => {
    resolveAlertMutation.mutate(resolution_notes);
  };

  const handleFalsePositive = (reason) => {
    markFalsePositiveMutation.mutate(reason);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      await axios.put(`/api/alerts/${id}`, {
        comments: [{
          user_id: 'current-user',
          user_name: 'Current User',
          content: newComment.trim(),
          timestamp: new Date()
        }]
      });
      queryClient.invalidateQueries(['alert', id]);
      setNewComment('');
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="xl" text="Loading alert details..." />;
  }

  if (error || !alert) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Alert Not Found</h3>
        <p className="text-gray-500 mb-4">The requested alert could not be found.</p>
        <button
          onClick={() => navigate('/alerts')}
          className="btn-primary"
        >
          Back to Alerts
        </button>
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/alerts')}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{alert.title}</h1>
            <p className="text-sm text-gray-500">Alert ID: {alert.id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getSeverityColor(alert.severity)}`}>
            {alert.severity.toUpperCase()}
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(alert.status)}`}>
            {alert.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Alert Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Description</h3>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{alert.description}</p>
          </div>

          {/* Asset Information */}
          {alert.asset && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Asset Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {alert.asset.name && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-gray-900">{alert.asset.name}</p>
                  </div>
                )}
                {alert.asset.ip && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">IP Address</label>
                    <p className="text-gray-900">{alert.asset.ip}</p>
                  </div>
                )}
                {alert.asset.hostname && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Hostname</label>
                    <p className="text-gray-900">{alert.asset.hostname}</p>
                  </div>
                )}
                {alert.asset.os && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Operating System</label>
                    <p className="text-gray-900">{alert.asset.os}</p>
                  </div>
                )}
                {alert.asset.tags && alert.asset.tags.length > 0 && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500">Tags</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {alert.asset.tags.map((tag, index) => (
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
            </div>
          )}

          {/* Vulnerability Details */}
          {alert.vulnerability && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Vulnerability Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {alert.vulnerability.cve && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">CVE</label>
                    <p className="text-gray-900 font-mono">{alert.vulnerability.cve}</p>
                  </div>
                )}
                {alert.vulnerability.cvss_score && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">CVSS Score</label>
                    <p className="text-gray-900">{alert.vulnerability.cvss_score}</p>
                  </div>
                )}
                {alert.vulnerability.cvss_vector && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500">CVSS Vector</label>
                    <p className="text-gray-900 font-mono text-sm">{alert.vulnerability.cvss_vector}</p>
                  </div>
                )}
                {alert.vulnerability.published_date && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Published Date</label>
                    <p className="text-gray-900">{new Date(alert.vulnerability.published_date).toLocaleDateString()}</p>
                  </div>
                )}
                {alert.vulnerability.references && alert.vulnerability.references.length > 0 && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500">References</label>
                    <ul className="mt-1 space-y-1">
                      {alert.vulnerability.references.map((ref, index) => (
                        <li key={index}>
                          <a
                            href={ref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            {ref}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Threat Information */}
          {alert.threat && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Threat Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {alert.threat.threat_actor && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Threat Actor</label>
                    <p className="text-gray-900">{alert.threat.threat_actor}</p>
                  </div>
                )}
                {alert.threat.attack_vector && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Attack Vector</label>
                    <p className="text-gray-900">{alert.threat.attack_vector}</p>
                  </div>
                )}
                {alert.threat.ioc_type && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">IOC Type</label>
                    <p className="text-gray-900">{alert.threat.ioc_type}</p>
                  </div>
                )}
                {alert.threat.ioc_value && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">IOC Value</label>
                    <p className="text-gray-900 font-mono">{alert.threat.ioc_value}</p>
                  </div>
                )}
                {alert.threat.confidence && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Confidence</label>
                    <p className="text-gray-900">{alert.threat.confidence}/10</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {aiAnalysis && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <LightBulbIcon className="h-5 w-5 mr-2 text-blue-600" />
                  AI Analysis
                </h3>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Risk Score</label>
                    <p className="text-2xl font-bold text-gray-900">{aiAnalysis.risk_score}/10</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Confidence</label>
                    <p className="text-2xl font-bold text-gray-900">{aiAnalysis.confidence}/10</p>
                  </div>
                </div>
                
                {aiAnalysis.business_impact && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Business Impact</label>
                    <p className="text-gray-900">{aiAnalysis.business_impact}</p>
                  </div>
                )}
                
                {aiAnalysis.urgency_reason && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Urgency Reason</label>
                    <p className="text-gray-900">{aiAnalysis.urgency_reason}</p>
                  </div>
                )}
                
                {aiAnalysis.recommended_actions && aiAnalysis.recommended_actions.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Recommended Actions</label>
                    <ul className="mt-2 space-y-1">
                      {aiAnalysis.recommended_actions.map((action, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-900">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <ChatBubbleLeftIcon className="h-5 w-5 mr-2 text-gray-600" />
                Comments ({alert.comments?.length || 0})
              </h3>
              <button
                onClick={() => setShowComments(!showComments)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showComments ? 'Hide' : 'Show'} Comments
              </button>
            </div>
            
            {showComments && (
              <div className="space-y-4">
                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="space-y-3">
                  <div>
                    <label className="form-label">Add Comment</label>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="form-input"
                      rows={3}
                      placeholder="Add a comment..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !newComment.trim()}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingComment ? 'Adding...' : 'Add Comment'}
                  </button>
                </form>

                {/* Comments List */}
                {alert.comments && alert.comments.length > 0 ? (
                  <div className="space-y-3">
                    {alert.comments.map((comment, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <UserIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">{comment.user_name}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-700">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No comments yet</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => handleStatusChange('investigating')}
                disabled={alert.status === 'investigating'}
                className="w-full btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Investigation
              </button>
              
              <button
                onClick={() => handleStatusChange('in_progress')}
                disabled={alert.status === 'in_progress'}
                className="w-full btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mark In Progress
              </button>
              
              <button
                onClick={() => handleResolve('Alert resolved')}
                disabled={alert.status === 'resolved'}
                className="w-full btn-success disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Resolve Alert
              </button>
              
              <button
                onClick={() => handleFalsePositive('False positive')}
                disabled={alert.status === 'false_positive'}
                className="w-full btn-warning disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mark False Positive
              </button>
            </div>
          </div>

          {/* Alert Metadata */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Alert Details</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Source</label>
                <p className="text-gray-900 capitalize">{alert.source}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Category</label>
                <p className="text-gray-900 capitalize">{alert.category}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Priority</label>
                <p className="text-gray-900">{alert.priority}/10</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-gray-900">{new Date(alert.created_at).toLocaleString()}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-gray-900">{new Date(alert.updated_at).toLocaleString()}</p>
              </div>
              
              {alert.assignee && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Assigned To</label>
                  <p className="text-gray-900">{alert.assignee.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {alert.tags && alert.tags.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
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
      </div>
    </div>
  );
};

export default AlertDetail;

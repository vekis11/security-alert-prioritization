import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import {
  UserIcon,
  BellIcon,
  CogIcon,
  KeyIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    phone: ''
  });
  const [preferences, setPreferences] = useState({
    notifications: {
      email: true,
      slack: false,
      critical_alerts: true,
      high_priority: true
    },
    dashboard: {
      default_view: 'overview',
      refresh_interval: 30,
      items_per_page: 25
    }
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const { user, updateProfile, changePassword } = useAuth();
  const queryClient = useQueryClient();

  const { data: integrations } = useQuery(
    'integrations',
    () => axios.get('/api/integrations').then(res => res.data.integrations)
  );

  const updateProfileMutation = useMutation(
    (data) => updateProfile(data),
    {
      onSuccess: () => {
        toast.success('Profile updated successfully');
      },
      onError: (error) => {
        toast.error(error.error || 'Failed to update profile');
      }
    }
  );

  const changePasswordMutation = useMutation(
    ({ currentPassword, newPassword }) => changePassword(currentPassword, newPassword),
    {
      onSuccess: () => {
        toast.success('Password changed successfully');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      },
      onError: (error) => {
        toast.error(error.error || 'Failed to change password');
      }
    }
  );

  React.useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        email: user.email || '',
        department: user.profile?.department || '',
        phone: user.profile?.phone || ''
      });
      setPreferences(user.preferences || {
        notifications: {
          email: true,
          slack: false,
          critical_alerts: true,
          high_priority: true
        },
        dashboard: {
          default_view: 'overview',
          refresh_interval: 30,
          items_per_page: 25
        }
      });
    }
  }, [user]);

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      profile: formData,
      preferences
    });
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'preferences', name: 'Preferences', icon: CogIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'integrations', name: 'Integrations', icon: GlobeAltIcon }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
          Settings
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <tab.icon className="h-4 w-4 sm:h-5 sm:w-5 mr-3 flex-shrink-0" />
                <span className="truncate">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
                <p className="text-sm text-gray-500">Update your personal information</p>
              </div>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Department</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isLoading}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateProfileMutation.isLoading ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
                <p className="text-sm text-gray-500">Configure how you receive notifications</p>
              </div>
              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Notification Channels</h4>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.notifications.email}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            email: e.target.checked
                          }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">Email notifications</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.notifications.slack}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            slack: e.target.checked
                          }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">Slack notifications</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Alert Types</h4>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.notifications.critical_alerts}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            critical_alerts: e.target.checked
                          }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">Critical alerts</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.notifications.high_priority}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            high_priority: e.target.checked
                          }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">High priority alerts</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => updateProfileMutation.mutate({ preferences })}
                    disabled={updateProfileMutation.isLoading}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateProfileMutation.isLoading ? 'Updating...' : 'Update Notifications'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Dashboard Preferences</h3>
                <p className="text-sm text-gray-500">Customize your dashboard experience</p>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="form-label">Default View</label>
                  <select
                    value={preferences.dashboard.default_view}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      dashboard: {
                        ...prev.dashboard,
                        default_view: e.target.value
                      }
                    }))}
                    className="form-input"
                  >
                    <option value="overview">Overview</option>
                    <option value="alerts">Alerts</option>
                    <option value="analytics">Analytics</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Refresh Interval (seconds)</label>
                  <select
                    value={preferences.dashboard.refresh_interval}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      dashboard: {
                        ...prev.dashboard,
                        refresh_interval: parseInt(e.target.value)
                      }
                    }))}
                    className="form-input"
                  >
                    <option value={15}>15 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>1 minute</option>
                    <option value={300}>5 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Items Per Page</label>
                  <select
                    value={preferences.dashboard.items_per_page}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      dashboard: {
                        ...prev.dashboard,
                        items_per_page: parseInt(e.target.value)
                      }
                    }))}
                    className="form-input"
                  >
                    <option value={10}>10 items</option>
                    <option value={25}>25 items</option>
                    <option value={50}>50 items</option>
                    <option value={100}>100 items</option>
                  </select>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => updateProfileMutation.mutate({ preferences })}
                    disabled={updateProfileMutation.isLoading}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateProfileMutation.isLoading ? 'Updating...' : 'Update Preferences'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
                <p className="text-sm text-gray-500">Manage your password and security preferences</p>
              </div>
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div>
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="form-input"
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={changePasswordMutation.isLoading}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {changePasswordMutation.isLoading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Active Integrations</h3>
                <p className="text-sm text-gray-500">Manage your connected security tools</p>
              </div>
              <div className="space-y-4">
                {integrations?.length === 0 ? (
                  <div className="text-center py-8">
                    <GlobeAltIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No integrations configured</p>
                  </div>
                ) : (
                  integrations?.map((integration) => (
                    <div key={integration._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <CogIcon className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">{integration.name}</h4>
                            <p className="text-sm text-gray-500 capitalize">{integration.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            integration.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {integration.status}
                          </span>
                        </div>
                      </div>
                      {integration.last_sync && (
                        <p className="text-sm text-gray-500 mt-2">
                          Last sync: {new Date(integration.last_sync).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;

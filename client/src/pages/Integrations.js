import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  PlusIcon,
  CogIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  TestTubeIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const Integrations = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [formData, setFormData] = useState({});
  const queryClient = useQueryClient();

  const { data: integrations, isLoading } = useQuery(
    'integrations',
    () => axios.get('/api/integrations').then(res => res.data.integrations)
  );

  const { data: availableTypes } = useQuery(
    'integration-types',
    () => axios.get('/api/integrations/types/available').then(res => res.data.types)
  );

  const createIntegrationMutation = useMutation(
    (data) => axios.post('/api/integrations', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('integrations');
        setShowCreateForm(false);
        setSelectedType('');
        setFormData({});
        toast.success('Integration created successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to create integration');
      }
    }
  );

  const updateIntegrationMutation = useMutation(
    ({ id, data }) => axios.put(`/api/integrations/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('integrations');
        toast.success('Integration updated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update integration');
      }
    }
  );

  const deleteIntegrationMutation = useMutation(
    (id) => axios.delete(`/api/integrations/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('integrations');
        toast.success('Integration deleted successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to delete integration');
      }
    }
  );

  const testIntegrationMutation = useMutation(
    (id) => axios.post(`/api/integrations/${id}/test`),
    {
      onSuccess: (response) => {
        toast.success(response.data.result.success ? 'Connection test successful' : 'Connection test failed');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Connection test failed');
      }
    }
  );

  const syncIntegrationMutation = useMutation(
    (id) => axios.post(`/api/integrations/${id}/sync`),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('integrations');
        toast.success(`Sync completed: ${response.data.processed} alerts processed`);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Sync failed');
      }
    }
  );

  const handleCreateIntegration = (e) => {
    e.preventDefault();
    createIntegrationMutation.mutate({
      name: formData.name,
      type: selectedType,
      configuration: formData.configuration,
      settings: formData.settings || {}
    });
  };

  const handleFormChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleConfigurationChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      configuration: {
        ...prev.configuration,
        [selectedType]: {
          ...prev.configuration?.[selectedType],
          [key]: value
        }
      }
    }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'testing':
        return <TestTubeIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <PauseIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-green-800 bg-green-100';
      case 'error':
        return 'text-red-800 bg-red-100';
      case 'testing':
        return 'text-yellow-800 bg-yellow-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="xl" text="Loading integrations..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Security Integrations
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Connect and manage security tools and data sources
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Integration
          </button>
        </div>
      </div>

      {/* Create Integration Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create New Integration</h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleCreateIntegration} className="space-y-4">
                <div>
                  <label className="form-label">Integration Name</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="form-input"
                    placeholder="Enter integration name"
                    required
                  />
                </div>
                
                <div>
                  <label className="form-label">Integration Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="form-input"
                    required
                  >
                    <option value="">Select integration type</option>
                    {availableTypes?.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedType && availableTypes && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-900">
                      {availableTypes.find(t => t.id === selectedType)?.name} Configuration
                    </h4>
                    {availableTypes
                      .find(t => t.id === selectedType)
                      ?.fields?.map((field) => (
                        <div key={field.name}>
                          <label className="form-label">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <input
                            type={field.type === 'password' ? 'password' : 'text'}
                            value={formData.configuration?.[selectedType]?.[field.name] || ''}
                            onChange={(e) => handleConfigurationChange(field.name, e.target.value)}
                            className="form-input"
                            placeholder={field.default || `Enter ${field.label.toLowerCase()}`}
                            required={field.required}
                          />
                        </div>
                      ))}
                  </div>
                )}
                
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createIntegrationMutation.isLoading}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createIntegrationMutation.isLoading ? 'Creating...' : 'Create Integration'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Integrations List */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {integrations?.map((integration) => (
          <div key={integration._id} className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CogIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{integration.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{integration.type}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(integration.status)}
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(integration.status)}`}>
                  {integration.status}
                </span>
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Last Sync</span>
                <span className="text-gray-900">
                  {integration.last_sync 
                    ? new Date(integration.last_sync).toLocaleString()
                    : 'Never'
                  }
                </span>
              </div>
              
              {integration.sync_status && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Records Processed</span>
                  <span className="text-gray-900">{integration.sync_status.records_processed || 0}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => testIntegrationMutation.mutate(integration._id)}
                  disabled={testIntegrationMutation.isLoading}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  title="Test Connection"
                >
                  <TestTubeIcon className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => syncIntegrationMutation.mutate(integration._id)}
                  disabled={syncIntegrationMutation.isLoading || integration.status !== 'active'}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  title="Sync Data"
                >
                  <PlayIcon className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => updateIntegrationMutation.mutate({
                    id: integration._id,
                    data: { status: integration.status === 'active' ? 'inactive' : 'active' }
                  })}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title={integration.status === 'active' ? 'Deactivate' : 'Activate'}
                >
                  {integration.status === 'active' ? (
                    <PauseIcon className="h-4 w-4" />
                  ) : (
                    <PlayIcon className="h-4 w-4" />
                  )}
                </button>
                
                <button
                  onClick={() => deleteIntegrationMutation.mutate(integration._id)}
                  className="p-2 text-red-400 hover:text-red-600"
                  title="Delete Integration"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {integrations?.length === 0 && (
        <div className="text-center py-12">
          <CogIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Integrations</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first security integration.</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary"
          >
            Add Integration
          </button>
        </div>
      )}
    </div>
  );
};

export default Integrations;

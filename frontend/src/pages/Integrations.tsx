import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Check, X, ExternalLink, AlertCircle } from 'lucide-react';

import api from '../services/api';
import { API_URL } from '../utils/constants';

type ConnectionSummary = {
  service: 'slack' | 'google';
  metadata?: Record<string, any>;
  createdAt?: string;
  hasToken?: boolean;
};

const Integrations: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const apiBase = useMemo(() => API_URL.replace(/\/$/, ''), []);

  const {
    data: connections = [],
    isLoading,
  } = useQuery<ConnectionSummary[]>({
    queryKey: ['connections'],
    queryFn: () => api.get('/connections'),
  });

  const disconnectMutation = useMutation({
    mutationFn: (service: string) => api.delete(`/connections/${service}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success('Disconnected successfully');
    },
    onError: () => toast.error('Failed to disconnect'),
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const success = params.get('success');
    const error = params.get('error');

    if (success) {
      toast.success(`Connected to ${success}!`);
      params.delete('success');
      navigate(`${location.pathname}${params.toString() ? `?${params.toString()}` : ''}`, {
        replace: true,
      });
    } else if (error) {
      toast.error(`Failed to connect to ${error}`);
      params.delete('error');
      navigate(`${location.pathname}${params.toString() ? `?${params.toString()}` : ''}`, {
        replace: true,
      });
    }
  }, [location.pathname, location.search, navigate]);

  const handleConnect = (service: 'slack' | 'google') => {
    const token = localStorage.getItem('flowforge_token');
    const url = new URL(`${apiBase}/auth/${service}`);
    if (token) {
      url.searchParams.set('token', token);
    }
    window.location.href = url.toString();
  };

  const isConnected = (service: 'slack' | 'google') =>
    connections.some((c) => c.service === service && c.hasToken !== false);

  const getConnectionMetadata = (service: 'slack' | 'google') =>
    connections.find((c) => c.service === service)?.metadata;

  const renderStatus = (service: 'slack' | 'google') => {
    const connected = isConnected(service);
    const metadata = getConnectionMetadata(service);

    if (connected) {
      return (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <Check className="h-4 w-4" />
          <span>Connected</span>
          {metadata?.workspace && (
            <span className="text-gray-600 text-xs">({metadata.workspace})</span>
          )}
          {metadata?.email && (
            <span className="text-gray-600 text-xs">({metadata.email})</span>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <AlertCircle className="h-4 w-4" />
        <span>Not connected</span>
      </div>
    );
  };

  const renderActions = (service: 'slack' | 'google') => {
    const connected = isConnected(service);

    if (connected) {
      return (
        <button
          onClick={() => disconnectMutation.mutate(service)}
          className="inline-flex items-center gap-1 text-sm px-3 py-2 border border-red-500 text-red-600 rounded-md hover:bg-red-50 transition"
        >
          <X className="h-4 w-4" />
          Disconnect
        </button>
      );
    }

    return (
      <button
        onClick={() => handleConnect(service)}
        className="inline-flex items-center gap-2 text-sm px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
      >
        <ExternalLink className="h-4 w-4" />
        {service === 'slack' ? 'Connect Slack' : 'Connect Google'}
      </button>
    );
  };

  const services = [
    {
      key: 'slack' as const,
      title: 'Slack',
      description: 'Send messages to your Slack workspace',
      note: null,
    },
    {
      key: 'google' as const,
      title: 'Gmail',
      description: 'Send emails from your Gmail account',
      note: null,
    },
    {
      key: 'google' as const,
      title: 'Google Sheets',
      description: 'Read and write data to your spreadsheets',
      note: 'Uses same Google connection as Gmail',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">My Integrations</h1>
        <p className="text-gray-600">
          Connect your accounts to use them in workflows.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-600">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span>Loading integrations...</span>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={`${service.title}-${service.description}`}
              className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{service.title}</h2>
                  <p className="text-sm text-gray-600">{service.description}</p>
                  {service.note && (
                    <p className="text-xs text-gray-500 mt-1">{service.note}</p>
                  )}
                </div>
                {renderStatus(service.key)}
              </div>
              <div className="mt-6">{renderActions(service.key)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Integrations;


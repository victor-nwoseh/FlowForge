import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X, ExternalLink, AlertCircle, MessageSquare, Mail, Table2, Info, Link2 } from 'lucide-react';

import api from '../services/api';
import { API_URL } from '../utils/constants';

type ConnectionSummary = {
  service: 'slack' | 'google';
  metadata?: Record<string, any>;
  createdAt?: string;
  hasToken?: boolean;
};

// Service configuration with icons and accent colors
const serviceConfig = {
  slack: {
    icon: MessageSquare,
    accentBorder: 'border-l-violet-500/60',
    accentBg: 'bg-violet-500/15',
    accentText: 'text-violet-400',
  },
  gmail: {
    icon: Mail,
    accentBorder: 'border-l-rose-500/60',
    accentBg: 'bg-rose-500/15',
    accentText: 'text-rose-400',
  },
  sheets: {
    icon: Table2,
    accentBorder: 'border-l-emerald-500/60',
    accentBg: 'bg-emerald-500/15',
    accentText: 'text-emerald-400',
  },
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

  const services = [
    {
      key: 'slack' as const,
      configKey: 'slack' as const,
      title: 'Slack',
      description: 'Send messages to your Slack workspace',
      note: null,
    },
    {
      key: 'google' as const,
      configKey: 'gmail' as const,
      title: 'Gmail',
      description: 'Send emails from your Gmail account',
      note: null,
    },
    {
      key: 'google' as const,
      configKey: 'sheets' as const,
      title: 'Google Sheets',
      description: 'Read and write data to your spreadsheets',
      note: 'Uses same Google connection as Gmail',
    },
  ];

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="relative bg-forge-900/80 backdrop-blur-xl border border-forge-700/50 rounded-xl p-6 overflow-hidden"
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-forge-700/20 to-transparent" />

          <div className="flex items-start gap-4">
            {/* Icon skeleton */}
            <div className="w-12 h-12 rounded-xl bg-forge-800/60 animate-pulse" />

            <div className="flex-1 space-y-3">
              {/* Title skeleton */}
              <div className="h-5 w-24 bg-forge-800/60 rounded animate-pulse" />
              {/* Description skeleton */}
              <div className="h-4 w-full bg-forge-800/40 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-forge-800/40 rounded animate-pulse" />
            </div>

            {/* Status skeleton */}
            <div className="h-6 w-24 bg-forge-800/60 rounded-full animate-pulse" />
          </div>

          {/* Button skeleton */}
          <div className="mt-6 h-10 w-32 bg-forge-800/60 rounded-lg animate-pulse" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
      {/* Page Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-ember-500/15 border border-ember-500/30">
            <Link2 className="h-5 w-5 text-ember-300" />
          </div>
          <h1 className="text-2xl font-semibold text-forge-50">Integrations</h1>
        </div>
        <p className="text-forge-400 ml-12">
          Connect your accounts to use them in workflows.
        </p>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const config = serviceConfig[service.configKey];
            const Icon = config.icon;
            const connected = isConnected(service.key);
            const metadata = getConnectionMetadata(service.key);

            return (
              <div
                key={`${service.title}-${service.description}`}
                className={`
                  group relative bg-forge-900/80 backdrop-blur-xl
                  border border-forge-700/50 border-l-2 ${config.accentBorder}
                  rounded-xl overflow-hidden flex flex-col
                  transition-all duration-300 ease-out
                  hover:border-ember-500/40 hover:shadow-lg hover:shadow-ember-500/5
                  hover:scale-[1.01]
                `}
              >
                {/* Q1: Icon + Name + Badge */}
                <div className="flex items-center gap-3 p-4 border-b border-forge-700/30">
                  <div className={`
                    p-2.5 rounded-lg ${config.accentBg} border border-forge-700/30
                    transition-all duration-300
                    group-hover:border-forge-600/50
                  `}>
                    <Icon className={`h-5 w-5 ${config.accentText}`} />
                  </div>
                  <h2 className="text-base font-semibold text-forge-50 flex-1">
                    {service.title}
                  </h2>
                  {connected ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                      </span>
                      <span className="text-xs font-medium text-emerald-400">Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-forge-700/50 border border-forge-600/30">
                      <AlertCircle className="h-3 w-3 text-forge-400" />
                      <span className="text-xs font-medium text-forge-400">Not connected</span>
                    </div>
                  )}
                </div>

                {/* Q2: Description */}
                <div className="px-4 py-3 border-b border-forge-700/30">
                  <p className="text-sm text-forge-400 leading-relaxed">
                    {service.description}
                  </p>
                  {service.note && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Info className="h-3 w-3 text-forge-500 flex-shrink-0" />
                      <p className="text-xs text-forge-500 italic">
                        {service.note}
                      </p>
                    </div>
                  )}
                </div>

                {/* Q3: Email/Workspace */}
                <div className="px-4 py-3 border-b border-forge-700/30 min-h-[52px] flex items-center">
                  {connected && (metadata?.workspace || metadata?.email) ? (
                    <div className="flex items-center gap-2 w-full">
                      {metadata?.workspace && (
                        <>
                          <MessageSquare className="h-4 w-4 text-forge-500 flex-shrink-0" />
                          <span className="text-sm font-mono text-forge-300">
                            {metadata.workspace}
                          </span>
                        </>
                      )}
                      {metadata?.email && (
                        <>
                          <Mail className="h-4 w-4 text-forge-500 flex-shrink-0" />
                          <span className="text-sm font-mono text-forge-300 truncate">
                            {metadata.email}
                          </span>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-forge-600 italic">
                      {connected ? 'No account info' : 'Not connected'}
                    </span>
                  )}
                </div>

                {/* Q4: Action Button */}
                <div className="px-4 py-3 mt-auto">
                  {connected ? (
                    <button
                      onClick={() => disconnectMutation.mutate(service.key)}
                      disabled={disconnectMutation.isPending}
                      className="
                        w-full inline-flex items-center justify-center gap-2 text-sm font-medium
                        px-4 py-2.5 rounded-lg
                        bg-red-500/10 text-red-400 border border-red-500/30
                        transition-all duration-200
                        hover:bg-red-500/20 hover:border-red-500/50
                        disabled:opacity-50 disabled:cursor-not-allowed
                      "
                    >
                      <X className="h-4 w-4" />
                      {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(service.key)}
                      className="
                        w-full inline-flex items-center justify-center gap-2 text-sm font-medium
                        px-4 py-2.5 rounded-lg
                        bg-gradient-to-r from-ember-500 to-ember-400
                        text-white shadow-lg shadow-ember-500/20
                        transition-all duration-200
                        hover:from-ember-400 hover:to-ember-300
                        hover:shadow-ember-500/30 hover:scale-[1.02]
                        active:scale-[0.98]
                      "
                    >
                      <ExternalLink className="h-4 w-4" />
                      Connect {service.title === 'Google Sheets' ? 'Google' : service.title}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Integrations;


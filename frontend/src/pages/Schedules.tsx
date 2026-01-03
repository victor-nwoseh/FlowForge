import React, { useState } from 'react';
import cronstrue from 'cronstrue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Play, Pause, Trash2, Calendar, Clock } from 'lucide-react';

import api from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';

type Schedule = {
  _id: string;
  workflowId: { _id: string; name: string } | string;
  cronExpression: string;
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
};

const cronToHuman = (cron: string) => {
  try {
    const text = cronstrue.toString(cron, { use24HourTimeFormat: true });
    return `Runs ${text}`;
  } catch {
    return cron;
  }
};

// Loading skeleton component
const LoadingSkeleton = () => (
  <div className="bg-forge-900/80 backdrop-blur-xl border border-forge-700/50 rounded-xl overflow-hidden">
    {/* Header skeleton */}
    <div className="bg-forge-800/60 border-b border-forge-700/50 px-4 py-3">
      <div className="flex gap-8">
        {['w-32', 'w-40', 'w-20', 'w-28', 'w-28', 'w-32'].map((width, i) => (
          <div key={i} className={`h-4 ${width} bg-forge-700/50 rounded animate-pulse`} />
        ))}
      </div>
    </div>
    {/* Row skeletons */}
    {[1, 2, 3].map((i) => (
      <div key={i} className="px-4 py-4 border-b border-forge-700/30">
        <div className="flex gap-8 items-center">
          <div className="w-32 h-4 bg-forge-800/60 rounded animate-pulse" />
          <div className="w-40 space-y-2">
            <div className="h-4 bg-forge-800/60 rounded animate-pulse" />
            <div className="h-3 w-32 bg-forge-800/40 rounded animate-pulse" />
          </div>
          <div className="w-20 h-6 bg-forge-800/60 rounded-full animate-pulse" />
          <div className="w-28 h-4 bg-forge-800/60 rounded animate-pulse" />
          <div className="w-28 h-4 bg-forge-800/60 rounded animate-pulse" />
          <div className="w-32 flex gap-2">
            <div className="h-7 w-16 bg-forge-800/60 rounded animate-pulse" />
            <div className="h-7 w-16 bg-forge-800/60 rounded animate-pulse" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const Schedules: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [scheduleToDelete, setScheduleToDelete] = useState<{ id: string; workflowName: string } | null>(null);

  const { data: schedules = [], isLoading } = useQuery<Schedule[]>({
    queryKey: ['schedules'],
    queryFn: () => api.get('/schedules'),
  });

  const deleteMutation = useMutation({
    mutationFn: (scheduleId: string) => api.delete(`/schedules/${scheduleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule deleted');
    },
    onError: () => toast.error('Failed to delete schedule'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ scheduleId, isActive }: { scheduleId: string; isActive: boolean }) =>
      api.patch(`/schedules/${scheduleId}/toggle`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule updated');
    },
    onError: () => toast.error('Failed to update schedule'),
  });

  const handleToggle = (schedule: Schedule) => {
    toggleMutation.mutate({ scheduleId: schedule._id, isActive: !schedule.isActive });
  };

  const handleDelete = (scheduleId: string, workflowName: string) => {
    setScheduleToDelete({ id: scheduleId, workflowName });
  };

  const handleConfirmDelete = () => {
    if (!scheduleToDelete) return;
    deleteMutation.mutate(scheduleToDelete.id);
    setScheduleToDelete(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-ember-500/15 border border-ember-500/30">
            <Clock className="h-5 w-5 text-ember-300" />
          </div>
          <h1 className="text-2xl font-semibold text-forge-50">Scheduled Workflows</h1>
        </div>
        <p className="text-forge-400 ml-12">Manage recurring workflow executions</p>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : schedules.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-forge-700/50 bg-forge-900/60 backdrop-blur-sm p-12 text-center">
          <div className="p-4 rounded-full bg-ember-500/10 border border-ember-500/20 mb-4">
            <Calendar className="h-10 w-10 text-ember-400" />
          </div>
          <p className="text-lg font-medium text-forge-50 mb-1">No scheduled workflows yet</p>
          <p className="text-sm text-forge-500 mb-6 max-w-sm">
            Create a workflow and add a scheduled trigger to see it here.
          </p>
          <button
            onClick={() => navigate('/workflows/new')}
            className="
              inline-flex items-center gap-2 px-5 py-2.5 rounded-lg
              bg-gradient-to-r from-ember-500 to-ember-400
              text-white font-medium text-sm
              shadow-lg shadow-ember-500/20
              transition-all duration-200
              hover:from-ember-400 hover:to-ember-300
              hover:shadow-ember-500/30 hover:scale-[1.02]
              active:scale-[0.98]
            "
          >
            Create Workflow
          </button>
        </div>
      ) : (
        /* Table */
        <div className="bg-forge-900/80 backdrop-blur-xl border border-forge-700/50 rounded-xl overflow-hidden">
          <table className="min-w-full">
            {/* Table Header */}
            <thead>
              <tr className="bg-forge-800/60 border-b border-forge-700/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-forge-400">
                  Workflow
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-forge-400">
                  Schedule
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-forge-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-forge-400">
                  Last Run
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-forge-400">
                  Next Run
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-forge-400">
                  Actions
                </th>
              </tr>
            </thead>
            {/* Table Body */}
            <tbody className="divide-y divide-forge-700/30">
              {schedules.map((schedule) => {
                const workflow =
                  typeof schedule.workflowId === 'string'
                    ? { _id: schedule.workflowId, name: schedule.workflowId }
                    : schedule.workflowId;

                return (
                  <tr
                    key={schedule._id}
                    className={`
                      transition-all duration-200
                      hover:bg-forge-800/40
                      ${!schedule.isActive && 'opacity-70'}
                    `}
                  >
                    {/* Workflow Name */}
                    <td className="px-4 py-4 text-left">
                      <button
                        className="text-sm font-medium text-ember-400 hover:text-ember-300 hover:underline decoration-ember-500/50 transition-colors text-left"
                        onClick={() => navigate(`/workflows/${workflow._id}`)}
                      >
                        {workflow.name || 'Untitled Workflow'}
                      </button>
                    </td>

                    {/* Cron Expression */}
                    <td className="px-4 py-4">
                      <div className="text-sm font-mono text-forge-50">{schedule.cronExpression}</div>
                      <div className="text-xs text-forge-500 mt-0.5">{cronToHuman(schedule.cronExpression)}</div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-4">
                      {schedule.isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-medium text-emerald-400">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                          </span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-forge-700/50 border border-forge-600/30 px-2.5 py-1 text-xs font-medium text-forge-400">
                          <span className="h-2 w-2 rounded-full bg-forge-500"></span>
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Last Run */}
                    <td className="px-4 py-4 text-sm tabular-nums">
                      {schedule.lastRunAt ? (
                        <span className="text-forge-300">
                          {new Date(schedule.lastRunAt).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-forge-500 italic">Never</span>
                      )}
                    </td>

                    {/* Next Run */}
                    <td className="px-4 py-4 text-sm tabular-nums">
                      {schedule.isActive ? (
                        schedule.nextRunAt ? (
                          <span className="text-forge-300">
                            {new Date(schedule.nextRunAt).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-forge-400">Scheduled</span>
                        )
                      ) : (
                        <span className="text-forge-500 italic">Paused</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {/* Toggle Button */}
                        <button
                          onClick={() => handleToggle(schedule)}
                          disabled={toggleMutation.isPending}
                          className={`
                            inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
                            w-24 transition-all duration-200
                            disabled:opacity-50 disabled:cursor-not-allowed
                            ${schedule.isActive
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50'
                            }
                          `}
                        >
                          {schedule.isActive ? (
                            <>
                              <Pause className="h-3.5 w-3.5" /> Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5" /> Activate
                            </>
                          )}
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(schedule._id, workflow.name || 'Untitled Workflow')}
                          disabled={deleteMutation.isPending}
                          className="
                            inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
                            bg-red-500/10 text-red-400 border border-red-500/30
                            transition-all duration-200
                            hover:bg-red-500/20 hover:border-red-500/50
                            disabled:opacity-50 disabled:cursor-not-allowed
                          "
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        isOpen={scheduleToDelete !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => setScheduleToDelete(null)}
        title="Delete Schedule"
        message={`Are you sure you want to delete the schedule for "${scheduleToDelete?.workflowName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default Schedules;


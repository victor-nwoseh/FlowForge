import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Play, Pause, Trash2, Calendar } from 'lucide-react';

import api from '../services/api';

type Schedule = {
  _id: string;
  workflowId: { _id: string; name: string } | string;
  cronExpression: string;
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
};

const cronToHuman = (cron: string) => {
  const map: Record<string, string> = {
    '0 9 * * *': 'Every day at 9:00 AM',
    '0 10 * * 1': 'Every Monday at 10:00 AM',
    '0 * * * *': 'Every hour',
    '*/15 * * * *': 'Every 15 minutes',
    '0 9 * * 1-5': 'Weekdays at 9:00 AM',
  };
  return map[cron] || cron;
};

const Schedules: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const handleDelete = (scheduleId: string) => {
    const confirm = window.confirm('Delete this schedule?');
    if (!confirm) return;
    deleteMutation.mutate(scheduleId);
  };

  const renderStatus = (schedule: Schedule) => {
    if (schedule.isActive) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
        Inactive
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Scheduled Workflows</h1>
          <p className="text-sm text-gray-600">Manage recurring workflow executions</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-600">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span>Loading schedules...</span>
        </div>
      ) : schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center">
          <Calendar className="h-10 w-10 text-gray-400" />
          <p className="mt-3 text-sm font-medium text-gray-800">No scheduled workflows yet</p>
          <p className="text-xs text-gray-500">Create a workflow and add a scheduled trigger to see it here.</p>
          <button
            onClick={() => navigate('/workflows/new')}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create Workflow
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Workflow
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Cron
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Last Run
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Next Run
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {schedules.map((schedule) => {
                const workflow =
                  typeof schedule.workflowId === 'string'
                    ? { _id: schedule.workflowId, name: schedule.workflowId }
                    : schedule.workflowId;

                return (
                  <tr key={schedule._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-blue-600">
                      <button
                        className="hover:underline"
                        onClick={() => navigate(`/workflows/${workflow._id}`)}
                      >
                        {workflow.name || 'Untitled Workflow'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      <div>{schedule.cronExpression}</div>
                      <div className="text-xs text-gray-500">{cronToHuman(schedule.cronExpression)}</div>
                    </td>
                    <td className="px-4 py-3">{renderStatus(schedule)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {schedule.lastRunAt ? new Date(schedule.lastRunAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {schedule.isActive
                        ? schedule.nextRunAt
                          ? new Date(schedule.nextRunAt).toLocaleString()
                          : 'Scheduled'
                        : 'Paused'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggle(schedule)}
                          className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:border-blue-500 hover:text-blue-600"
                        >
                          {schedule.isActive ? (
                            <>
                              <Pause className="h-3 w-3" /> Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3" /> Activate
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(schedule._id)}
                          className="inline-flex items-center gap-1 rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
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
    </div>
  );
};

export default Schedules;


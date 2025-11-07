import React from 'react';
import { useAuthStore } from '../store/auth.store';

const Dashboard: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-12">
      <h1 className="text-3xl font-semibold text-gray-900 mb-4">Dashboard</h1>
      <p className="text-gray-600 mb-8">
        Welcome back{user ? `, ${user.email}` : ''}! Here&apos;s where your workflows will live.
      </p>
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-gray-500">
        Workflow builder coming in Week 2. Stay tuned!
      </div>
    </div>
  );
};

export default Dashboard;


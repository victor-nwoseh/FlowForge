import React, { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import WorkflowsList from './pages/WorkflowsList';
import WorkflowBuilder from './pages/WorkflowBuilder';
import ExecutionsList from './pages/ExecutionsList';
import ExecutionDetails from './pages/ExecutionDetails';
import Integrations from './pages/Integrations';
import Schedules from './pages/Schedules';
import Templates from './pages/Templates';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import { useAuthStore } from './store/auth.store';
import ErrorBoundary from './components/ErrorBoundary';
import useExecutionSocket from './hooks/useExecutionSocket';

const App: React.FC = () => {
  const initAuth = useAuthStore((state) => state.initAuth);
  const location = useLocation();
  useExecutionSocket();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const isLandingPage = location.pathname === '/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <>
      {!isLandingPage && !isAuthPage && <Navbar />}
      <main className={isLandingPage || isAuthPage ? '' : 'min-h-[calc(100vh-4rem)] bg-gray-50'}>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/workflows" element={<WorkflowsList />} />
              <Route path="/workflows/new" element={<WorkflowBuilder />} />
              <Route path="/workflows/:id" element={<WorkflowBuilder />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/executions" element={<ExecutionsList />} />
              <Route path="/executions/:id" element={<ExecutionDetails />} />
              <Route path="/schedules" element={<Schedules />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </main>
    </>
  );
};

export default App;


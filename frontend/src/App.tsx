import React, { useEffect, useMemo } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, FileText, Link2, History, Clock, LogOut } from 'lucide-react';
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
import Dock, { DockItemData } from './components/Dock';
import { useAuthStore } from './store/auth.store';
import ErrorBoundary from './components/ErrorBoundary';
import useExecutionSocket from './hooks/useExecutionSocket';

const App: React.FC = () => {
  const initAuth = useAuthStore((state) => state.initAuth);
  const logout = useAuthStore((state) => state.logout);
  const location = useLocation();
  const navigate = useNavigate();
  useExecutionSocket();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const isLandingPage = location.pathname === '/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const showDock = !isLandingPage && !isAuthPage;

  const dockItems: DockItemData[] = useMemo(() => [
    {
      icon: <LayoutGrid size={20} />,
      label: 'Workflows',
      onClick: () => navigate('/workflows')
    },
    {
      icon: <FileText size={20} />,
      label: 'Templates',
      onClick: () => navigate('/templates')
    },
    {
      icon: <Link2 size={20} />,
      label: 'Integrations',
      onClick: () => navigate('/integrations')
    },
    {
      icon: <History size={20} />,
      label: 'Executions',
      onClick: () => navigate('/executions')
    },
    {
      icon: <Clock size={20} />,
      label: 'Schedules',
      onClick: () => navigate('/schedules')
    },
    {
      icon: <LogOut size={20} />,
      label: 'Logout',
      onClick: () => logout()
    }
  ], [navigate, logout]);

  return (
    <>
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
      {showDock && <Dock items={dockItems} />}
    </>
  );
};

export default App;


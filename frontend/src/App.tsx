import React, { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import { useAuthStore } from './store/auth.store';

const App: React.FC = () => {
  const initAuth = useAuthStore((state) => state.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Navigate to="/workflows" replace />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/workflows" element={<Dashboard />} />
          </Route>
        </Routes>
      </main>
    </>
  );
};

export default App;


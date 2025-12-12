import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { History, Link2, Clock } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import Button from './Button';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    logout: state.logout,
  }));

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-semibold text-blue-600">
          FlowForge
        </Link>

        {isAuthenticated ? (
          <div className="flex items-center gap-4">
            <NavLink
              to="/workflows"
              className={({ isActive }) =>
                `text-sm transition ${
                  isActive ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-blue-600'
                }`
              }
            >
              Workflows
            </NavLink>
            <NavLink
              to="/integrations"
              className={({ isActive }) =>
                `inline-flex items-center gap-1 text-sm transition ${
                  isActive ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-blue-600'
                }`
              }
            >
              <Link2 className="h-4 w-4" />
              Integrations
            </NavLink>
            <NavLink
              to="/executions"
              className={({ isActive }) =>
                `inline-flex items-center gap-1 text-sm transition ${
                  isActive ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-blue-600'
                }`
              }
            >
              <History className="h-4 w-4" />
              Executions
            </NavLink>
            <NavLink
              to="/schedules"
              className={({ isActive }) =>
                `inline-flex items-center gap-1 text-sm transition ${
                  isActive ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-blue-600'
                }`
              }
            >
              <Clock className="h-4 w-4" />
              Schedules
            </NavLink>
            <span className="text-sm text-gray-600">{user?.email}</span>
            <Button
              variant="secondary"
              className="!w-auto"
              onClick={() => {
                logout();
              }}
            >
              Log out
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-gray-600 hover:text-gray-800">
              Login
            </Link>
            <Link to="/register" className="text-sm text-blue-600 hover:text-blue-700">
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;


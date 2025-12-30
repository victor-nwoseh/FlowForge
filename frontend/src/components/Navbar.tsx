import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { History, Link2, Clock, FileText, LayoutGrid } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import LiquidMetalButton from './LiquidMetalButton';
import TrueFocus from './TrueFocus';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    logout: state.logout,
  }));

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
      isActive
        ? 'text-ember-400 bg-forge-800/50'
        : 'text-forge-300 hover:text-forge-50 hover:bg-forge-800/30'
    }`;

  const iconClass = "h-4 w-4 text-ember-500/80";

  return (
    <nav className="sticky top-0 z-50 bg-forge-950/80 backdrop-blur-xl border-b border-forge-800">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
        <Link to="/" className="flex items-center text-forge-50">
          <TrueFocus
            sentence="Flow Forge"
            manualMode={false}
            blurAmount={3}
            borderColor="#e97f38"
            glowColor="rgba(233, 127, 56, 0.6)"
            animationDuration={0.4}
            pauseBetweenAnimations={0.5}
            fontSize="1.25rem"
          />
        </Link>

        {isAuthenticated ? (
          <div className="flex items-center gap-1 lg:gap-4">
            <NavLink
              to="/workflows"
              className={navLinkClass}
            >
              <LayoutGrid className={iconClass} />
              <span className="hidden md:inline">Workflows</span>
            </NavLink>
            <NavLink
              to="/templates"
              className={navLinkClass}
            >
              <FileText className={iconClass} />
              <span className="hidden md:inline">Templates</span>
            </NavLink>
            <NavLink
              to="/integrations"
              className={navLinkClass}
            >
              <Link2 className={iconClass} />
              <span className="hidden md:inline">Integrations</span>
            </NavLink>
            <NavLink
              to="/executions"
              className={navLinkClass}
            >
              <History className={iconClass} />
              <span className="hidden md:inline">Executions</span>
            </NavLink>
            <NavLink
              to="/schedules"
              className={navLinkClass}
            >
              <Clock className={iconClass} />
              <span className="hidden md:inline">Schedules</span>
            </NavLink>
            
            <div className="h-6 w-px bg-forge-800 mx-2 hidden xl:block" />
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-forge-400 hidden xl:inline max-w-[150px] truncate">
                {user?.email}
              </span>
              <LiquidMetalButton
                variant="outline"
                size="sm"
                className="whitespace-nowrap"
                onClick={() => {
                  logout();
                }}
              >
                Log out
              </LiquidMetalButton>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-forge-300 hover:text-forge-50 transition-colors">
              Login
            </Link>
            <LiquidMetalButton to="/register" size="sm">
              Register
            </LiquidMetalButton>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;


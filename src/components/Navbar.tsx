import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Train, User, LogOut, LayoutDashboard, MapPin } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-slate-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center space-x-2">
            <Train className="h-8 w-8 text-emerald-400" />
            <span className="text-xl font-bold tracking-tight">RailReserve</span>
          </Link>

          <div className="flex items-center space-x-6">
            <Link to="/" className="hover:text-emerald-400 transition-colors">Home</Link>
            <Link to="/cancel" className="hover:text-emerald-400 transition-colors">Cancel Ticket</Link>
            {user ? (
              <>
                <Link to="/dashboard" className="hover:text-emerald-400 transition-colors flex items-center space-x-1">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className="hover:text-emerald-400 transition-colors font-semibold text-emerald-400">
                    Admin Panel
                  </Link>
                )}
                <div className="flex items-center space-x-4 border-l border-slate-700 pl-6">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium">{user.name}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="hover:text-emerald-400 transition-colors">Login</Link>
                <Link
                  to="/register"
                  className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, ShieldCheck, Ticket, QrCode } from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight hover:text-teal-400">
              <span className="bg-teal-500 text-slate-900 px-2 py-0.5 rounded text-sm font-black">2026</span>
              <span>Buildathon Portal</span>
            </Link>

            {isAuthenticated && (
              <div className="hidden md:flex items-center ml-8 gap-4 text-sm font-medium">
                {isAdmin ? (
                  <>
                    <Link to="/admin/dashboard" className="text-slate-300 hover:text-white">Dashboard</Link>
                    <Link to="/admin/scanner" className="text-slate-300 hover:text-teal-400 flex items-center gap-1">
                      <QrCode size={16} /> QR Scanner
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/student/dashboard" className="text-slate-300 hover:text-white flex items-center gap-1">
                      <Ticket size={16} /> My Dashboard
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700">
                  {isAdmin ? <ShieldCheck size={16} className="text-teal-400" /> : <User size={16} className="text-blue-400" />}
                  <span className="font-semibold text-slate-200">{user?.full_name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isAdmin ? 'bg-teal-900 text-teal-300' : 'bg-blue-900 text-blue-300'}`}>
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-rose-900/50 hover:text-rose-300 text-slate-300 px-3 py-1.5 rounded border border-slate-700 transition"
                  title="Logout"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm font-medium">
                <Link to="/login" className="text-slate-300 hover:text-white px-3 py-1.5">
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-1.5 rounded-md text-sm font-semibold transition shadow-sm"
                >
                  Register Team
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

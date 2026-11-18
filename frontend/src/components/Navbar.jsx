import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, ShieldCheck, Ticket, QrCode, Code2, ArrowRight } from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-[#07090e]/80 backdrop-blur-xl border-b border-white/[0.08] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center group-hover:border-emerald-500/50 group-hover:bg-emerald-500/20 transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <Code2 size={18} />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black text-base sm:text-lg tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  BUILD OPS
                </span>
                <span className="text-[10px] tracking-wider text-emerald-400 uppercase font-bold">
                  ASIET × TCS
                </span>
              </div>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
              <a href="/#rules" className="hover:text-white transition-colors">
                Rules & Guidelines
              </a>
            </div>
          </div>

          {/* Right Action / Auth Controls */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {isAdmin ? (
                  <div className="hidden sm:flex items-center gap-2">
                    <Link
                      to="/admin/dashboard"
                      className="text-xs font-medium text-zinc-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/5 transition"
                    >
                      Admin Dashboard
                    </Link>
                    <Link
                      to="/admin/scanner"
                      className="text-xs font-medium text-zinc-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/5 flex items-center gap-1.5 transition"
                    >
                      <QrCode size={14} className="text-emerald-400" /> Gate Scanner
                    </Link>
                  </div>
                ) : (
                  <Link
                    to="/student/dashboard"
                    className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/5 transition"
                  >
                    <Ticket size={14} className="text-emerald-400" /> My Dashboard
                  </Link>
                )}

                <div className="flex items-center gap-2 text-xs bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  {isAdmin ? (
                    <ShieldCheck size={14} className="text-amber-400" />
                  ) : (
                    <User size={14} className="text-emerald-400" />
                  )}
                  <span className="font-medium text-zinc-200 max-w-[120px] sm:max-w-none truncate">
                    {user?.full_name}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase ${
                      isAdmin
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    }`}
                  >
                    {user?.role}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 sm:gap-3 text-sm">
                <Link
                  to="/login"
                  className="text-zinc-300 hover:text-white font-medium px-3 py-1.5 rounded-lg hover:bg-white/5 transition text-xs sm:text-sm"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn-primary px-4 sm:px-5 py-2 rounded-xl font-semibold flex items-center gap-1.5 text-xs sm:text-sm shadow-[0_4px_16px_rgba(16,185,129,0.35)] cursor-pointer"
                >
                  <span>Register Team</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

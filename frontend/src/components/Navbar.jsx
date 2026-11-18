import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, ShieldCheck, Ticket, QrCode, ArrowUpRight } from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide navbar on the Home page for a full-bleed cinema poster hero
  if (location.pathname === '/') {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-[#030504]/85 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Minimal Brand Wordmark */}
        <Link
          to="/"
          className="font-poster text-base sm:text-lg tracking-wider text-[#eef2ee] hover:text-emerald-400 transition-colors"
        >
          BUILD OPS
        </Link>

        {/* Right: Auth / Portal Controls */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <Link
                    to="/admin/dashboard"
                    className="hidden sm:inline-flex items-center gap-1.5 font-mono-tech text-[11px] uppercase tracking-wider text-[#8b9b90] hover:text-[#eef2ee] px-3 py-1.5 border border-transparent hover:border-white/10 transition"
                  >
                    <ShieldCheck size={13} className="text-emerald-400" />
                    Admin
                  </Link>
                  <Link
                    to="/admin/scanner"
                    className="inline-flex items-center gap-1.5 font-mono-tech text-[11px] uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/35 hover:border-emerald-400 px-3 py-1.5 transition"
                  >
                    <QrCode size={13} />
                    <span className="hidden sm:inline">Scanner</span>
                  </Link>
                </div>
              ) : (
                <Link
                  to="/student/dashboard"
                  className="inline-flex items-center gap-1.5 font-mono-tech text-[11px] uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/35 hover:border-emerald-400 px-3 py-1.5 transition"
                >
                  <Ticket size={13} />
                  <span>My Pass</span>
                </Link>
              )}

              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 border border-white/10 bg-[#070c09] font-mono-tech text-[11px] text-[#8b9b90]">
                <span className="text-[#eef2ee] max-w-[120px] truncate">{user?.full_name}</span>
                <span className="text-white/20">/</span>
                <span className="text-emerald-400 text-[10px]">{user?.role}</span>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-[#8b9b90] hover:text-rose-300 border border-white/10 hover:border-rose-500/40 bg-[#070c09] transition cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                to="/login"
                className="font-mono-tech text-[11px] uppercase tracking-[0.16em] text-[#8b9b90] hover:text-[#eef2ee] px-3.5 py-2 transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="doom-btn-primary font-mono-tech text-[11px] uppercase tracking-[0.16em] px-4 py-2 gap-1.5"
              >
                <span>Register</span>
                <ArrowUpRight size={13} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

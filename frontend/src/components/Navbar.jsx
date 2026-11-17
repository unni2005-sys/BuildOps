import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, ShieldCheck, Ticket, QrCode, Code2 } from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-[#050c08]/90 backdrop-blur-md text-emerald-50 border-b border-emerald-500/20 sticky top-0 z-50 shadow-[0_4px_24px_rgba(0,0,0,0.65)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <span className="w-8 h-8 rounded bg-emerald-950/90 border border-amber-300/40 text-emerald-400 flex items-center justify-center shadow-[0_0_12px_rgba(34,255,102,0.22)] group-hover:border-emerald-400 transition">
                <Code2 size={16} />
              </span>
              <div className="flex flex-col leading-none">
                <span className="font-display font-black text-base tracking-[0.12em] text-buildops">
                  BUILD OPS
                </span>
                <span className="font-imperial text-[9px] tracking-[0.22em] text-amber-200/75 uppercase mt-0.5">
                  ASIET × TCS
                </span>
              </div>
            </Link>

            {isAuthenticated && (
              <div className="hidden md:flex items-center ml-8 gap-5 text-xs font-semibold uppercase tracking-wider">
                {isAdmin ? (
                  <>
                    <Link
                      to="/admin/dashboard"
                      className="text-emerald-200/75 hover:text-emerald-300 hover:drop-shadow-[0_0_8px_rgba(34,255,102,0.5)] transition"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/admin/scanner"
                      className="text-emerald-200/75 hover:text-amber-200 flex items-center gap-1.5 transition"
                    >
                      <QrCode size={15} className="text-emerald-400" /> QR Scanner
                    </Link>
                  </>
                ) : (
                  <Link
                    to="/student/dashboard"
                    className="text-emerald-200/75 hover:text-emerald-300 flex items-center gap-1.5 transition"
                  >
                    <Ticket size={15} className="text-emerald-400" /> My Dashboard
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-2 text-xs bg-[#091710] px-3 py-1.5 rounded-md border border-emerald-500/25">
                  {isAdmin ? (
                    <ShieldCheck size={15} className="text-amber-300" />
                  ) : (
                    <User size={15} className="text-emerald-400" />
                  )}
                  <span className="font-semibold text-emerald-50 max-w-[120px] sm:max-w-none truncate">
                    {user?.full_name}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border ${
                      isAdmin
                        ? 'bg-amber-500/15 text-amber-200 border-amber-400/35'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-400/35'
                    }`}
                  >
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs bg-[#091710] hover:bg-rose-950/70 hover:text-rose-200 hover:border-rose-500/40 text-emerald-200/80 px-3 py-1.5 rounded-md border border-emerald-500/25 transition cursor-pointer"
                  title="Logout"
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                <Link
                  to="/login"
                  className="text-emerald-200/80 hover:text-amber-200 px-3 py-1.5 tracking-wider uppercase transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="doom-btn-primary px-4 py-1.5 rounded-md text-xs tracking-wider uppercase"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="laser-divider opacity-60" />
    </nav>
  );
};

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Lock, Mail, ArrowRight } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUnverifiedEmail('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'ADMIN' || user.is_admin) {
        navigate('/admin/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      console.error(err);
      if (err.response?.data?.unverified) {
        setUnverifiedEmail(err.response.data.email || email);
        setError(err.response.data.error || 'Please verify your email before signing in.');
      } else if (err.response?.data?.non_field_errors) {
        setError(err.response.data.non_field_errors[0]);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle Arcane Glow Orb Behind Card */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse-aura" />

      {/* Poster Branding Header */}
      <div className="text-center mb-6 relative z-10 animate-fade-in-up">
        <p className="font-imperial text-[10px] sm:text-xs tracking-[0.32em] text-amber-200/80 uppercase">
          Department of Computer Applications • ASIET × TCS
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-[0.14em] text-buildops mt-2">
          BUILD OPS
        </h1>
        <p className="font-mono-tech text-[11px] tracking-[0.26em] text-arcane-gold animate-glitch-gold uppercase mt-1.5">
          DEC 8 – 9, 2026 • PORTAL ACCESS
        </p>
      </div>

      <div className="max-w-md w-full doom-card p-7 sm:p-8 rounded-xl relative z-10 animate-fade-in-up">
        {/* Sign In / Sign Up Switcher */}
        <div className="grid grid-cols-2 bg-[#040a07] p-1 rounded-lg border border-emerald-500/20 mb-6 text-xs font-bold tracking-wider uppercase">
          <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 py-2 rounded-md text-center shadow-[0_0_12px_rgba(34,255,102,0.18)]">
            Sign In
          </div>
          <Link
            to="/register"
            className="text-emerald-200/60 hover:text-amber-200 py-2 rounded-md text-center transition"
          >
            Sign Up
          </Link>
        </div>

        <div className="text-center mb-6">
          <h2 className="font-display text-lg font-bold tracking-wider text-emerald-50 uppercase">
            Access Your Account
          </h2>
          <p className="text-xs text-emerald-200/65 mt-1">
            View your team registration and digital E-Ticket
          </p>
        </div>

        {error && (
          <div className="bg-rose-950/60 border border-rose-500/40 text-rose-200 p-3 rounded-lg text-xs mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            {unverifiedEmail && (
              <div className="mt-2 pl-6">
                <Link
                  to={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                  className="text-xs text-amber-200 font-bold underline hover:text-amber-100 flex items-center gap-1"
                >
                  Verify your email now <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-200/80 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-3 text-emerald-400/60" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@college.edu"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm doom-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-200/80 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-3 text-emerald-400/60" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm doom-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full doom-btn-primary py-2.5 px-4 rounded-lg text-xs font-display tracking-[0.15em] uppercase disabled:opacity-50 cursor-pointer mt-2"
          >
            {loading ? 'Authenticating...' : 'Enter Portal'}
          </button>
        </form>

        <div className="laser-divider my-6 opacity-50" />

        <p className="text-center text-xs text-emerald-200/65">
          New to Build Ops?{' '}
          <Link to="/register" className="text-amber-200 font-semibold hover:text-emerald-300 hover:underline transition">
            Create Student Account
          </Link>
        </p>
      </div>
    </div>
  );
};

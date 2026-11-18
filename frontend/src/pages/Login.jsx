import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  AlertCircle,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  RefreshCw,
  Code2,
  CheckCircle2,
} from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-[#06080e] relative text-zinc-100 selection:bg-emerald-500/30 selection:text-white">
      {/* Ambient Lighting Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-emerald-500/[0.07] blur-[140px]" />
        <div className="absolute top-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-blue-500/[0.04] blur-[120px]" />
      </div>

      {/* Main Standard Login Card */}
      <div className="max-w-md w-full clean-card p-8 sm:p-10 rounded-3xl border border-white/[0.1] shadow-2xl relative z-10 backdrop-blur-2xl bg-[#090d16]/90">
        {/* Top Accent Light Edge */}
        <div className="absolute top-0 left-12 right-12 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

        {/* Card Header & Brand */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
            <Code2 size={24} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold mb-2">
            <span>ASIET × TCS</span>
            <span className="text-zinc-500">•</span>
            <span>12h Buildathon</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
            Welcome Back
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Sign in to access your squad portal & live QR pass
          </p>
        </div>

        {/* Standard Segmented Tab Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] mb-6 text-xs font-semibold">
          <div className="py-2.5 rounded-lg bg-emerald-500 text-black font-bold text-center shadow-md shadow-emerald-500/20 cursor-default">
            Sign In
          </div>
          <Link
            to="/register"
            className="py-2.5 rounded-lg text-zinc-400 hover:text-white text-center transition hover:bg-white/[0.03]"
          >
            Sign Up
          </Link>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="bg-rose-950/60 border border-rose-500/40 text-rose-200 p-3.5 rounded-2xl text-xs mb-5 shadow-lg">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            {unverifiedEmail && (
              <div className="mt-2.5 pl-6 pt-2 border-t border-rose-500/20">
                <Link
                  to={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                  className="text-xs text-amber-300 font-semibold underline hover:text-amber-200 flex items-center gap-1.5"
                >
                  <span>Verify your email now</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Standard Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Mail size={16} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@college.edu"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#04060a] border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#04060a] border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-semibold text-xs uppercase tracking-wider btn-primary shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 pt-5 border-t border-white/[0.08] text-center text-xs text-zinc-400">
          <span>New to Build Ops? </span>
          <Link
            to="/register"
            className="text-emerald-400 font-semibold hover:text-emerald-300 transition underline underline-offset-4 decoration-emerald-500/30 hover:decoration-emerald-400"
          >
            Create Student Account
          </Link>
        </div>
      </div>
    </div>
  );
};

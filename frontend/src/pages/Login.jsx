import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Tilt3D } from '../components/Tilt3D';
import {
  AlertCircle,
  ArrowUpRight,
  ArrowLeft,
  Eye,
  EyeOff,
  RefreshCw,
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
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-12 px-4 sm:px-6 bg-[#030504] relative">
      <div className="max-w-md w-full relative z-10 animate-fade-in-up">
        {/* Back to Home Navigation */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-display text-xs text-[#8b9b90] hover:text-emerald-400 transition-colors group cursor-pointer"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </Link>
        </div>

        <Tilt3D maxTilt={4} perspective={1200}>
          <div className="doom-surface p-7 sm:p-9 border border-white/[0.12] relative">
            {/* Subtle top hairline accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/80 via-[#d4b46a]/50 to-transparent" />

            {/* Header */}
            <div className="mb-7">
              <div className="font-display text-xs text-[#8b9b90] tracking-wider mb-3">
                BUILD OPS 2026
              </div>
              <h1 className="font-poster text-2xl sm:text-3xl text-[#eef2ee] tracking-tight">
                Sign In
              </h1>
              <p className="text-xs text-[#8b9b90] mt-1 font-display">
                Access your team registration and gate pass.
              </p>
            </div>

            {/* Sharp Tab Switcher */}
            <div className="grid grid-cols-2 border border-white/[0.12] mb-6 font-mono-tech text-[11px] uppercase tracking-[0.16em]">
              <div className="py-2.5 bg-emerald-500 text-[#030705] font-bold text-center">
                Sign In
              </div>
              <Link
                to="/register"
                className="py-2.5 text-[#8b9b90] hover:text-[#eef2ee] text-center transition bg-[#040705]"
              >
                Sign Up
              </Link>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="bg-rose-950/50 border border-rose-500/40 text-rose-200 p-3.5 text-xs mb-5">
                <div className="flex items-center gap-2.5">
                  <AlertCircle size={15} className="shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
                {unverifiedEmail && (
                  <div className="mt-2.5 pl-6 pt-2 border-t border-rose-500/20">
                    <Link
                      to={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                      className="font-mono-tech text-[11px] text-[#d4b46a] uppercase tracking-wider hover:underline inline-flex items-center gap-1"
                    >
                      <span>Enter 4-digit verification code</span>
                      <ArrowUpRight size={12} />
                    </Link>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-mono-tech text-[10px] uppercase tracking-[0.18em] text-[#8b9b90] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@college.edu"
                  className="w-full px-3.5 py-2.5 text-sm doom-input"
                />
              </div>

              <div>
                <label className="block font-mono-tech text-[10px] uppercase tracking-[0.18em] text-[#8b9b90] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm doom-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#5a685e] hover:text-[#eef2ee] transition cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full doom-btn-primary py-3 px-4 font-mono-tech text-xs uppercase tracking-[0.18em] gap-2 disabled:opacity-50 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Authenticating</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowUpRight size={14} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/[0.08] flex items-center justify-between font-display text-xs text-[#8b9b90]">
              <span>New team leader?</span>
              <Link
                to="/register"
                className="text-emerald-400 hover:text-emerald-300 uppercase tracking-wider font-semibold"
              >
                Create Account
              </Link>
            </div>
          </div>
        </Tilt3D>
      </div>
    </div>
  );
};

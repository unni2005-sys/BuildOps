import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import {
  AlertCircle,
  ArrowRight,
  Mail,
  User,
  Phone,
  Lock,
  RefreshCw,
  Code2,
  CheckCircle2,
} from 'lucide-react';

export const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'mobileNumber') {
      // Allow digits only, max 10 characters
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setFormData({ ...formData, [name]: digitsOnly });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!/^\d{10}$/.test(formData.mobileNumber)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/accounts/register/', {
        full_name: formData.fullName.trim(),
        email: formData.email.trim(),
        mobile_number: formData.mobileNumber.trim(),
        password: formData.password,
      });
      setSuccessData(res.data);
    } catch (err) {
      console.error(err);
      if (err.response?.data) {
        const errorMsg = typeof err.response.data === 'string'
          ? err.response.data
          : Object.values(err.response.data).flat().join(' ');
        setError(errorMsg || 'Registration failed. Please check your details.');
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#06080e] relative text-zinc-100 selection:bg-emerald-500/30 selection:text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-emerald-500/[0.08] blur-[140px]" />
        </div>
        <div className="max-w-md w-full clean-card p-8 sm:p-10 rounded-3xl border border-white/[0.1] text-center relative z-10 backdrop-blur-2xl bg-[#090d16]/90 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
            <Mail size={26} />
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white mb-2">
            Verify Your Email
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed mb-6">
            We sent a verification link to <strong className="text-emerald-300">{formData.email}</strong>.
            Once verified, your Team Registration window will open automatically.
          </p>

          {successData.dev_verification_token && (
            <div className="bg-amber-500/10 border border-amber-400/30 p-4 rounded-2xl text-left mb-6">
              <p className="text-[10px] font-mono-tech font-bold text-amber-300 uppercase tracking-widest mb-1.5">
                Quick Verify (Dev Mode)
              </p>
              <button
                onClick={() => navigate(`/verify-email?token=${successData.dev_verification_token}`)}
                className="w-full mt-2 bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
              >
                <span>Verify Email & Register Team</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          <div className="space-y-3">
            <Link
              to={`/verify-email?email=${encodeURIComponent(formData.email)}`}
              className="w-full inline-flex items-center justify-center gap-2 btn-primary py-3 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider"
            >
              <span>Enter Verification Code</span>
              <ArrowRight size={14} />
            </Link>
            <div>
              <Link to="/login" className="text-xs text-zinc-400 hover:text-white transition">
                ← Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-[#06080e] relative text-zinc-100 selection:bg-emerald-500/30 selection:text-white">
      {/* Ambient Lighting Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-emerald-500/[0.07] blur-[140px]" />
        <div className="absolute top-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-blue-500/[0.04] blur-[120px]" />
      </div>

      {/* Main Standard Register Card */}
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
            Create Account
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Register as Team Leader to unlock squad registration
          </p>
        </div>

        {/* Standard Segmented Tab Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] mb-6 text-xs font-semibold">
          <Link
            to="/login"
            className="py-2.5 rounded-lg text-zinc-400 hover:text-white text-center transition hover:bg-white/[0.03]"
          >
            Sign In
          </Link>
          <div className="py-2.5 rounded-lg bg-emerald-500 text-black font-bold text-center shadow-md shadow-emerald-500/20 cursor-default">
            Sign Up
          </div>
        </div>

        {error && (
          <div className="bg-rose-950/60 border border-rose-500/40 text-rose-200 p-3.5 rounded-2xl text-xs mb-5 shadow-lg flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <User size={16} />
              </div>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Rohan Verma"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#04060a] border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
              />
            </div>
          </div>

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
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="you@college.edu"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#04060a] border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Mobile Number (10 digits)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Phone size={16} />
              </div>
              <input
                type="tel"
                name="mobileNumber"
                required
                maxLength={10}
                value={formData.mobileNumber}
                onChange={handleChange}
                placeholder="9876543210"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#04060a] border border-white/10 text-white placeholder-zinc-500 text-sm font-mono-tech focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Lock size={15} />
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 6 chars"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#04060a] border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Lock size={15} />
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#04060a] border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-semibold text-xs uppercase tracking-wider btn-primary shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Sign Up & Verify Email</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/[0.08] text-center text-xs text-zinc-400">
          <span>Already registered? </span>
          <Link
            to="/login"
            className="text-emerald-400 font-semibold hover:text-emerald-300 transition underline underline-offset-4 decoration-emerald-500/30 hover:decoration-emerald-400"
          >
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
};

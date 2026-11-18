import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Tilt3D } from '../components/Tilt3D';
import {
  AlertCircle,
  ArrowUpRight,
  Mail,
  RefreshCw,
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
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 bg-[#030504] relative">
        <div className="max-w-md w-full doom-surface p-8 border border-white/[0.12] relative z-10 animate-fade-in-up">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500" />
          <div className="w-11 h-11 border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-5">
            <Mail size={20} />
          </div>
          <span className="font-mono-tech text-[10px] tracking-[0.22em] text-emerald-400 uppercase block mb-1.5">
            Step 01 Complete
          </span>
          <h2 className="font-poster text-2xl text-[#eef2ee] tracking-tight mb-2">
            Verify Your Email
          </h2>
          <p className="text-xs text-[#8b9b90] leading-relaxed mb-6">
            A verification link was sent to <strong className="text-[#eef2ee]">{formData.email}</strong>.
            Once confirmed, team registration opens automatically.
          </p>

          {successData.dev_verification_token && (
            <div className="bg-[#0b1510] border border-[#d4b46a]/40 p-4 mb-5">
              <p className="font-mono-tech text-[10px] text-[#d4b46a] uppercase tracking-widest mb-2">
                Dev Mode Quick Verify
              </p>
              <button
                onClick={() => navigate(`/verify-email?token=${successData.dev_verification_token}`)}
                className="w-full doom-btn-primary py-2.5 px-3 font-mono-tech text-[11px] uppercase tracking-wider gap-1.5 cursor-pointer"
              >
                <span>Verify &amp; Continue</span>
                <ArrowUpRight size={13} />
              </button>
            </div>
          )}

          <div className="space-y-3">
            <Link
              to={`/verify-email?email=${encodeURIComponent(formData.email)}`}
              className="w-full doom-btn-primary py-3 px-4 font-mono-tech text-xs uppercase tracking-[0.16em] gap-2"
            >
              <span>Enter Verification Token</span>
              <ArrowUpRight size={14} />
            </Link>
            <div className="text-center pt-1">
              <Link to="/login" className="font-mono-tech text-[11px] text-[#8b9b90] hover:text-[#eef2ee] uppercase tracking-wider">
                ← Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-10 px-4 sm:px-6 bg-[#030504] relative">
      <div className="max-w-md w-full relative z-10 animate-fade-in-up">
        <Tilt3D maxTilt={4} perspective={1200}>
          <div className="doom-surface p-7 sm:p-9 border border-white/[0.12] relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/80 via-[#d4b46a]/50 to-transparent" />

            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between font-mono-tech text-[10px] tracking-[0.22em] text-[#8b9b90] uppercase mb-3">
                <span>BUILD OPS 2026</span>
                <span className="text-[#d4b46a]">₹500 / TEAM</span>
              </div>
              <h1 className="font-poster text-2xl sm:text-3xl text-[#eef2ee] tracking-tight">
                Create Account
              </h1>
              <p className="text-xs text-[#8b9b90] mt-1">
                Sign up as Team Leader to register your team of two.
              </p>
            </div>

            {/* Sharp Tab Switcher */}
            <div className="grid grid-cols-2 border border-white/[0.12] mb-6 font-mono-tech text-[11px] uppercase tracking-[0.16em]">
              <Link
                to="/login"
                className="py-2.5 text-[#8b9b90] hover:text-[#eef2ee] text-center transition bg-[#040705]"
              >
                Sign In
              </Link>
              <div className="py-2.5 bg-emerald-500 text-[#030705] font-bold text-center">
                Sign Up
              </div>
            </div>

            {error && (
              <div className="bg-rose-950/50 border border-rose-500/40 text-rose-200 p-3.5 text-xs mb-5 flex items-center gap-2.5">
                <AlertCircle size={15} className="shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-mono-tech text-[10px] uppercase tracking-[0.18em] text-[#8b9b90] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Team leader full name"
                  className="w-full px-3.5 py-2.5 text-sm doom-input"
                />
              </div>

              <div>
                <label className="block font-mono-tech text-[10px] uppercase tracking-[0.18em] text-[#8b9b90] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@college.edu"
                  className="w-full px-3.5 py-2.5 text-sm doom-input"
                />
              </div>

              <div>
                <label className="block font-mono-tech text-[10px] uppercase tracking-[0.18em] text-[#8b9b90] mb-1.5">
                  Mobile Number (10 Digits)
                </label>
                <input
                  type="tel"
                  name="mobileNumber"
                  required
                  maxLength={10}
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  placeholder="9876543210"
                  className="w-full px-3.5 py-2.5 text-sm font-mono-tech doom-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono-tech text-[10px] uppercase tracking-[0.18em] text-[#8b9b90] mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 chars"
                    className="w-full px-3.5 py-2.5 text-sm doom-input"
                  />
                </div>

                <div>
                  <label className="block font-mono-tech text-[10px] uppercase tracking-[0.18em] text-[#8b9b90] mb-1.5">
                    Confirm
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    className="w-full px-3.5 py-2.5 text-sm doom-input"
                  />
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
                    <span>Creating Account</span>
                  </>
                ) : (
                  <>
                    <span>Sign Up &amp; Verify Email</span>
                    <ArrowUpRight size={14} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/[0.08] flex items-center justify-between font-mono-tech text-[11px] text-[#8b9b90]">
              <span>Already registered?</span>
              <Link
                to="/login"
                className="text-emerald-400 hover:text-emerald-300 uppercase tracking-wider"
              >
                Sign In →
              </Link>
            </div>
          </div>
        </Tilt3D>
      </div>
    </div>
  );
};

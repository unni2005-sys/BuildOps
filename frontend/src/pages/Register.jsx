import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { AlertCircle, ArrowRight, Mail } from 'lucide-react';

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
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-emerald-500/12 blur-[120px]" />
        <div className="max-w-md w-full doom-card p-8 rounded-xl text-center relative z-10 animate-fade-in-up">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_rgba(34,255,102,0.28)]">
            <Mail size={26} />
          </div>
          <h2 className="font-display text-xl font-bold tracking-wider text-arcane-gold uppercase mb-2">
            Verify Your Email
          </h2>
          <p className="text-xs text-emerald-100/75 leading-relaxed mb-6">
            We sent a verification link to <strong className="text-emerald-200">{formData.email}</strong>.
            Once verified, your Team Registration window will open automatically.
          </p>

          {successData.dev_verification_token && (
            <div className="bg-amber-500/10 border border-amber-400/35 p-4 rounded-lg text-left mb-5">
              <p className="text-[10px] font-display font-bold text-amber-200 uppercase tracking-widest mb-1">
                Quick Verify (Dev Mode)
              </p>
              <button
                onClick={() => navigate(`/verify-email?token=${successData.dev_verification_token}`)}
                className="w-full mt-2 bg-amber-400/90 hover:bg-amber-300 text-[#050c08] text-xs font-bold py-2 px-3 rounded-md flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                Verify Email & Register Team <ArrowRight size={14} />
              </button>
            </div>
          )}

          <div className="space-y-3">
            <Link
              to={`/verify-email?email=${encodeURIComponent(formData.email)}`}
              className="w-full inline-block doom-btn-primary py-2.5 px-4 rounded-lg text-xs font-display tracking-widest uppercase"
            >
              Enter Verification Code
            </Link>
            <div>
              <Link to="/login" className="text-xs text-emerald-200/60 hover:text-amber-200 transition">
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse-aura" />

      {/* Poster Branding Header */}
      <div className="text-center mb-5 relative z-10 animate-fade-in-up">
        <p className="font-imperial text-[10px] sm:text-xs tracking-[0.32em] text-amber-200/80 uppercase">
          Department of Computer Applications • ASIET × TCS
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-[0.14em] text-buildops mt-2">
          BUILD OPS
        </h1>
        <p className="font-mono-tech text-[11px] tracking-[0.26em] text-arcane-gold animate-glitch-gold uppercase mt-1.5">
          NEW CHALLENGER REGISTRATION
        </p>
      </div>

      <div className="max-w-md w-full doom-card p-7 sm:p-8 rounded-xl relative z-10 animate-fade-in-up">
        {/* Sign In / Sign Up Switcher */}
        <div className="grid grid-cols-2 bg-[#040a07] p-1 rounded-lg border border-emerald-500/20 mb-6 text-xs font-bold tracking-wider uppercase">
          <Link
            to="/login"
            className="text-emerald-200/60 hover:text-amber-200 py-2 rounded-md text-center transition"
          >
            Sign In
          </Link>
          <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 py-2 rounded-md text-center shadow-[0_0_12px_rgba(34,255,102,0.18)]">
            Sign Up
          </div>
        </div>

        <div className="text-center mb-5">
          <h2 className="font-display text-lg font-bold tracking-wider text-emerald-50 uppercase">
            Create Student Account
          </h2>
          <p className="text-xs text-emerald-200/65 mt-1">
            Team Leader details auto-fill right after verification
          </p>
        </div>

        {error && (
          <div className="bg-rose-950/60 border border-rose-500/40 text-rose-200 p-3 rounded-lg text-xs flex items-center gap-2 mb-4">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-200/80 mb-1">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. Rohan Verma"
              className="w-full rounded-lg px-3 py-2 text-sm doom-input"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-200/80 mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="you@college.edu"
              className="w-full rounded-lg px-3 py-2 text-sm doom-input"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-200/80 mb-1">
              Mobile Number (10 digits)
            </label>
            <input
              type="tel"
              name="mobileNumber"
              required
              maxLength={10}
              value={formData.mobileNumber}
              onChange={handleChange}
              placeholder="10-digit mobile number"
              className="w-full rounded-lg px-3 py-2 text-sm font-mono-tech doom-input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-200/80 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Min 6 chars"
                className="w-full rounded-lg px-3 py-2 text-sm doom-input"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-200/80 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat password"
                className="w-full rounded-lg px-3 py-2 text-sm doom-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full doom-btn-primary py-2.5 px-4 rounded-lg text-xs font-display tracking-[0.14em] uppercase disabled:opacity-50 cursor-pointer mt-2"
          >
            {loading ? 'Creating Account...' : 'Sign Up & Verify Email'}
          </button>
        </form>

        <div className="laser-divider my-5 opacity-50" />

        <p className="text-center text-xs text-emerald-200/65">
          Already registered?{' '}
          <Link to="/login" className="text-amber-200 font-semibold hover:text-emerald-300 hover:underline transition">
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
};

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white p-8 rounded-lg border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-4">
            <Mail size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Verify Your Email</h2>
          <p className="text-sm text-slate-600 mb-6">
            We sent a verification link to <strong className="text-slate-800">{formData.email}</strong>.
            Once verified, you will immediately proceed to register your team.
          </p>

          {successData.dev_verification_token && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-md text-left mb-6">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Quick Verify (Dev Mode)</p>
              <button
                onClick={() => navigate(`/verify-email?token=${successData.dev_verification_token}`)}
                className="w-full mt-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold py-2 px-3 rounded flex items-center justify-center gap-1 transition cursor-pointer"
              >
                Verify Email & Register Team <ArrowRight size={14} />
              </button>
            </div>
          )}

          <div className="space-y-3">
            <Link
              to={`/verify-email?email=${encodeURIComponent(formData.email)}`}
              className="w-full inline-block bg-teal-600 hover:bg-teal-500 text-white font-medium py-2 px-4 rounded text-sm transition"
            >
              Enter Verification Code
            </Link>
            <div>
              <Link to="/login" className="text-xs text-slate-500 hover:text-slate-800">
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
        {/* Sign In / Sign Up Switcher */}
        <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-md mb-6 text-xs font-semibold">
          <Link
            to="/login"
            className="text-slate-600 hover:text-slate-900 py-2 rounded text-center transition"
          >
            Sign In
          </Link>
          <div className="bg-white text-slate-900 py-2 rounded text-center shadow-xs">
            Sign Up
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Build Ops Sign Up</h2>
          <p className="text-sm text-slate-600 mt-1">
            Create your account to register for Build Ops
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-md text-xs flex items-center gap-2 mb-4">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. Rohan Verma"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="you@college.edu"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Mobile Number (10 digits)</label>
            <input
              type="tel"
              name="mobileNumber"
              required
              maxLength={10}
              value={formData.mobileNumber}
              onChange={handleChange}
              placeholder="10-digit mobile number"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 6 characters"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat your password"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-2.5 px-4 rounded-md text-sm transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Creating Account...' : 'Sign Up & Verify Email'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="text-teal-600 font-semibold hover:underline">
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
};

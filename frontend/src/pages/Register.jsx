import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

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
        full_name: formData.fullName,
        email: formData.email,
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
            <CheckCircle2 size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Registration Submitted!</h2>
          <p className="text-sm text-slate-600 mb-6">
            We have sent a verification email to <strong className="text-slate-800">{formData.email}</strong>. Please verify your email to activate your account.
          </p>

          {successData.dev_verification_token && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-md text-left mb-6">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Development Mode Active</p>
              <p className="text-xs text-amber-900 mb-2">
                Verification Token: <code className="bg-white px-2 py-0.5 rounded border border-amber-300 font-mono text-xs">{successData.dev_verification_token}</code>
              </p>
              <button
                onClick={() => navigate(`/verify-email?token=${successData.dev_verification_token}`)}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold py-2 px-3 rounded flex items-center justify-center gap-1 transition"
              >
                One-Click Auto Verify & Continue <ArrowRight size={14} />
              </button>
            </div>
          )}

          <div className="space-y-3">
            <Link
              to={`/verify-email?email=${encodeURIComponent(formData.email)}`}
              className="w-full inline-block bg-teal-600 hover:bg-teal-500 text-white font-medium py-2 px-4 rounded text-sm transition"
            >
              Enter Verification Code / Token
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Student Registration</h2>
          <p className="text-sm text-slate-600 mt-1">
            Register your account to lead or join a Buildathon team
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
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-2.5 px-4 rounded-md text-sm transition shadow-sm disabled:opacity-50"
          >
            {loading ? 'Submitting Registration...' : 'Create Student Account'}
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

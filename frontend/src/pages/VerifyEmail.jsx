import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const emailFromUrl = searchParams.get('email') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [emailForResend, setEmailForResend] = useState(emailFromUrl);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const { setAuthData } = useAuth();
  const navigate = useNavigate();

  const handleVerify = async (tokenToUse) => {
    const t = tokenToUse || token;
    if (!t) {
      setStatusMsg({ type: 'error', text: 'Please enter a verification token.' });
      return;
    }

    setLoading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const res = await api.post('/accounts/verify-email/', { token: t });
      setStatusMsg({ type: 'success', text: 'Email verified! Opening Team Registration...' });
      setAuthData(res.data);
      setTimeout(() => {
        navigate('/student/register-team', { replace: true });
      }, 1000);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.token?.[0] || err.response?.data?.error || 'Verification failed. The token may be expired or invalid.';
      setStatusMsg({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenFromUrl) {
      handleVerify(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!emailForResend) {
      setStatusMsg({ type: 'error', text: 'Please enter your email to resend verification.' });
      return;
    }
    setResending(true);
    try {
      const res = await api.post('/accounts/resend-verification/', { email: emailForResend });
      setStatusMsg({ type: 'success', text: res.data.message });
      if (res.data.dev_verification_token) {
        setToken(res.data.dev_verification_token);
      }
    } catch (err) {
      const msg = err.response?.data?.email?.[0] || 'Unable to resend verification email.';
      setStatusMsg({ type: 'error', text: msg });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Email Verification</h2>
          <p className="text-sm text-slate-600 mt-1">
            Confirm your student email to activate your account
          </p>
        </div>

        {statusMsg.text && (
          <div
            className={`p-3 rounded-md text-xs flex items-center gap-2 mb-4 border ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Verification Token</label>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste verification token here"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-2 px-4 rounded-md text-sm transition shadow-sm disabled:opacity-50"
          >
            {loading ? 'Verifying Token...' : 'Verify Email & Proceed'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-xs font-semibold text-slate-700 mb-2">Need a new verification link?</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={emailForResend}
              onChange={(e) => setEmailForResend(e.target.value)}
              placeholder="Enter your registered email"
              className="flex-1 border border-slate-300 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button
              onClick={handleResend}
              disabled={resending}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-1.5 rounded-md font-medium transition disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend'}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Already verified?{' '}
          <Link to="/login" className="text-teal-600 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

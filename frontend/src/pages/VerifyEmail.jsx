import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, AlertCircle } from 'lucide-react';

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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-emerald-500/10 blur-[120px]" />

      <div className="max-w-md w-full doom-card p-8 rounded-xl relative z-10 animate-fade-in-up">
        <div className="text-center mb-6">
          <p className="font-imperial text-[10px] tracking-[0.28em] text-amber-200/75 uppercase">
            Build Ops Identity Check
          </p>
          <h2 className="font-display text-xl font-bold tracking-wider text-buildops uppercase mt-1">
            Email Verification
          </h2>
          <p className="text-xs text-emerald-200/65 mt-1">
            Confirm your email to unlock Team Registration
          </p>
        </div>

        {statusMsg.text && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 mb-4 border ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-400/40 text-emerald-200'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-200/80 mb-1.5">
              Verification Token
            </label>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste verification token here"
              className="w-full rounded-lg px-3 py-2.5 text-sm font-mono-tech doom-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full doom-btn-primary py-2.5 px-4 rounded-lg text-xs font-display tracking-[0.14em] uppercase disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Verifying Token...' : 'Verify Email & Proceed'}
          </button>
        </form>

        <div className="laser-divider my-6 opacity-50" />

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200/75 mb-2">
            Need a new verification link?
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={emailForResend}
              onChange={(e) => setEmailForResend(e.target.value)}
              placeholder="Enter registered email"
              className="flex-1 rounded-lg px-3 py-1.5 text-xs doom-input"
            />
            <button
              onClick={handleResend}
              disabled={resending}
              className="doom-btn-secondary text-xs px-3.5 py-1.5 rounded-lg font-semibold disabled:opacity-50 cursor-pointer"
            >
              {resending ? 'Sending...' : 'Resend'}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-emerald-200/60">
          Already verified?{' '}
          <Link to="/login" className="text-amber-200 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

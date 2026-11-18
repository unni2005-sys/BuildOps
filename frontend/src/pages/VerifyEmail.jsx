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
      setStatusMsg({ type: 'success', text: 'Email verified. Opening Team Registration...' });
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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 bg-[#030504] relative">
      <div className="max-w-md w-full doom-surface p-8 border border-white/[0.12] relative z-10 animate-fade-in-up">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/80 via-[#d4b46a]/50 to-transparent" />

        <div className="mb-6">
          <span className="font-mono-tech text-[10px] tracking-[0.22em] text-[#d4b46a] uppercase block mb-2">
            BUILD OPS // VERIFICATION
          </span>
          <h2 className="font-poster text-2xl text-[#eef2ee] tracking-tight">
            Email Verification
          </h2>
          <p className="text-xs text-[#8b9b90] mt-1">
            Confirm your email address to unlock team registration.
          </p>
        </div>

        {statusMsg.text && (
          <div
            className={`p-3.5 text-xs flex items-center gap-2.5 mb-5 border ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} className="space-y-4">
          <div>
            <label className="block font-mono-tech text-[10px] uppercase tracking-[0.18em] text-[#8b9b90] mb-1.5">
              Verification Token
            </label>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste token from email"
              className="w-full px-3.5 py-2.5 text-sm font-mono-tech doom-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full doom-btn-primary py-3 px-4 font-mono-tech text-xs uppercase tracking-[0.16em] disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Verifying Token...' : 'Verify Email & Proceed'}
          </button>
        </form>

        <div className="my-6 border-t border-white/[0.08]" />

        <div>
          <p className="font-mono-tech text-[10px] uppercase tracking-[0.18em] text-[#8b9b90] mb-2">
            Resend Verification Link
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={emailForResend}
              onChange={(e) => setEmailForResend(e.target.value)}
              placeholder="Enter registered email"
              className="flex-1 px-3 py-2 text-xs doom-input"
            />
            <button
              onClick={handleResend}
              disabled={resending}
              className="doom-btn-secondary font-mono-tech text-[11px] uppercase tracking-wider px-4 py-2 disabled:opacity-50 cursor-pointer"
            >
              {resending ? 'Sending' : 'Resend'}
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between font-mono-tech text-[11px] text-[#8b9b90]">
          <span>Already verified?</span>
          <Link to="/login" className="text-emerald-400 hover:text-emerald-300 uppercase tracking-wider">
            Sign In →
          </Link>
        </div>
      </div>
    </div>
  );
};

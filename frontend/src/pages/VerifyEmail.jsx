import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Tilt3D } from '../components/Tilt3D';
import { CheckCircle2, AlertCircle, ArrowLeft, ArrowUpRight, RefreshCw, Mail } from 'lucide-react';

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || searchParams.get('token') || '';
  const emailFromUrl = searchParams.get('email') || '';

  // 4 individual digit boxes
  const [digits, setDigits] = useState(() => {
    const cleaned = initialCode.replace(/\D/g, '').slice(0, 4);
    return [
      cleaned[0] || '',
      cleaned[1] || '',
      cleaned[2] || '',
      cleaned[3] || '',
    ];
  });

  const [email, setEmail] = useState(emailFromUrl);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const digitInputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const { setAuthData } = useAuth();
  const navigate = useNavigate();

  // Focus the first empty digit input on initial load
  useEffect(() => {
    const firstEmptyIndex = digits.findIndex((d) => !d);
    if (firstEmptyIndex !== -1 && digitInputRefs[firstEmptyIndex]?.current) {
      digitInputRefs[firstEmptyIndex].current.focus();
    }
  }, []);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleDigitChange = (index, value) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    // If pasted multiple digits
    if (numericValue.length > 1) {
      handlePastedCode(numericValue);
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = numericValue.slice(-1);
    setDigits(nextDigits);

    // Auto-advance to next input
    if (index < 3 && digitInputRefs[index + 1]?.current) {
      digitInputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      digitInputRefs[index - 1]?.current?.focus();
    }
  };

  const handlePastedCode = (pastedText) => {
    const cleaned = pastedText.replace(/\D/g, '').slice(0, 4);
    if (!cleaned) return;
    const nextDigits = [
      cleaned[0] || '',
      cleaned[1] || '',
      cleaned[2] || '',
      cleaned[3] || '',
    ];
    setDigits(nextDigits);
    const nextFocusIndex = Math.min(cleaned.length, 3);
    digitInputRefs[nextFocusIndex]?.current?.focus();
  };

  const handleVerify = async (codeToUse) => {
    const fullCode = codeToUse || digits.join('');
    if (fullCode.length !== 4) {
      setStatusMsg({ type: 'error', text: 'Please enter the complete 4-digit verification code.' });
      return;
    }

    if (!email.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter your registered email address.' });
      return;
    }

    setLoading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const payload = {
        code: fullCode,
        email: email.trim().toLowerCase(),
      };

      const res = await api.post('/accounts/verify-email/', payload);
      setStatusMsg({ type: 'success', text: 'Email verified successfully! Opening squad registration...' });
      setAuthData(res.data);
      setTimeout(() => {
        navigate('/student/register-team', { replace: true });
      }, 1000);
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.code?.[0] ||
        err.response?.data?.token?.[0] ||
        err.response?.data?.error ||
        'Verification failed. The code may be incorrect or expired.';
      setStatusMsg({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  // Auto-verify if 4 digits were provided directly in URL
  useEffect(() => {
    const initialClean = initialCode.replace(/\D/g, '').slice(0, 4);
    if (initialClean.length === 4) {
      handleVerify(initialClean);
    }
  }, [initialCode]);

  // Trigger verify automatically when 4 digits are entered
  useEffect(() => {
    const fullCode = digits.join('');
    if (fullCode.length === 4 && !loading && !statusMsg.text) {
      handleVerify(fullCode);
    }
  }, [digits]);

  const handleResend = async (e) => {
    e?.preventDefault();
    if (!email) {
      setStatusMsg({ type: 'error', text: 'Please enter your registered email address to receive a new code.' });
      return;
    }
    if (resendCooldown > 0) return;

    setResending(true);
    setStatusMsg({ type: '', text: '' });
    try {
      const res = await api.post('/accounts/resend-verification/', { email: email.trim() });
      setStatusMsg({ type: 'success', text: res.data.message || 'A new 4-digit verification code has been dispatched.' });
      setResendCooldown(30);

      // If in dev mode, prefill code
      if (res.data.dev_verification_code || res.data.dev_verification_token) {
        const devCode = (res.data.dev_verification_code || res.data.dev_verification_token).replace(/\D/g, '').slice(0, 4);
        if (devCode.length === 4) {
          setDigits([devCode[0], devCode[1], devCode[2], devCode[3]]);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.email?.[0] || 'Unable to resend verification code. Please check your email.';
      setStatusMsg({ type: 'error', text: msg });
    } finally {
      setResending(false);
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

        <Tilt3D maxTilt={3} perspective={1200}>
          <div className="doom-surface p-7 sm:p-9 border border-white/[0.12] relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/80 via-[#d4b46a]/50 to-transparent" />

            {/* Header */}
            <div className="mb-6">
              <span className="font-mono-tech text-[10px] tracking-[0.22em] text-[#d4b46a] uppercase block mb-1.5">
                BUILD OPS // SECURITY
              </span>
              <h1 className="font-poster text-2xl sm:text-3xl text-[#eef2ee] tracking-tight">
                Enter Verification Code
              </h1>
              <p className="text-xs text-[#8b9b90] mt-1 font-display">
                {email ? (
                  <>
                    Enter the 4-digit code sent to <strong className="text-emerald-300 font-mono-tech">{email}</strong>
                  </>
                ) : (
                  'Enter the 4-digit code sent to your registered email.'
                )}
              </p>
            </div>

            {/* Status Alert */}
            {statusMsg.text && (
              <div
                className={`p-3.5 text-xs flex items-center gap-2.5 mb-5 border rounded-lg ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
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

            <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} className="space-y-6">
              {/* Optional Email field if not in URL */}
              {!emailFromUrl && (
                <div>
                  <label className="block font-mono-tech text-[10px] uppercase tracking-[0.18em] text-[#8b9b90] mb-1.5">
                    Your Registered Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu"
                    className="w-full px-3.5 py-2 text-xs doom-input font-mono-tech"
                  />
                </div>
              )}

              {/* 4-Digit Code Input Boxes */}
              <div>
                <label className="block font-mono-tech text-[10px] uppercase tracking-[0.2em] text-[#8b9b90] mb-3 text-center">
                  4-Digit Verification Code
                </label>
                <div
                  className="flex justify-center items-center gap-3 sm:gap-4"
                  onPaste={(e) => {
                    e.preventDefault();
                    handlePastedCode(e.clipboardData.getData('text'));
                  }}
                >
                  {digits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={digitInputRefs[idx]}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className={`w-13 h-15 sm:w-15 sm:h-17 text-2xl sm:text-3xl font-mono-tech font-black text-center rounded-xl bg-black/60 border transition-all duration-150 outline-none ${
                        digit
                          ? 'border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                          : 'border-white/20 text-[#eef2ee] focus:border-emerald-400/80 focus:shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                      }`}
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || digits.join('').length !== 4}
                className="w-full doom-btn-primary py-3 px-4 font-mono-tech text-xs uppercase tracking-[0.16em] disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Code &amp; Continue</span>
                    <ArrowUpRight size={14} />
                  </>
                )}
              </button>
            </form>

            <div className="my-6 border-t border-white/[0.08]" />

            {/* Resend Code Section */}
            <div className="text-center space-y-2">
              <p className="font-mono-tech text-[11px] text-[#8b9b90]">
                Didn't receive the email code? Check your spam folder or resend.
              </p>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || resendCooldown > 0}
                className="doom-btn-secondary font-mono-tech text-[11px] uppercase tracking-wider px-4 py-2 disabled:opacity-40 cursor-pointer inline-flex items-center gap-1.5"
              >
                {resending ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : resendCooldown > 0 ? (
                  <span>Resend in {resendCooldown}s</span>
                ) : (
                  <>
                    <Mail size={12} />
                    <span>Resend 4-Digit Code</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between font-mono-tech text-[11px] text-[#8b9b90]">
              <span>Already verified?</span>
              <Link to="/login" className="text-emerald-400 hover:text-emerald-300 uppercase tracking-wider font-semibold">
                Sign In →
              </Link>
            </div>
          </div>
        </Tilt3D>
      </div>
    </div>
  );
};

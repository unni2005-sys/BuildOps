import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { CheckCircle2, AlertCircle, RefreshCw, ArrowRight, MessageCircle, ExternalLink } from 'lucide-react';

export const PaymentStatus = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) {
      setError('No Order ID found in callback query parameters.');
      setLoading(false);
      return;
    }

    const verify = async () => {
      try {
        const res = await api.get(`/payments/verify/${orderId}/`);
        setResult(res.data);
        if (!res.data?.whatsapp_group_link) {
          setTimeout(() => {
            navigate('/student/dashboard', { replace: true });
          }, 2500);
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || err.response?.data?.message || 'Payment verification failed.');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [orderId, navigate]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="max-w-md w-full doom-card p-8 rounded-xl text-center animate-fade-in-up">
        {loading ? (
          <div className="py-8">
            <RefreshCw size={28} className="animate-spin text-emerald-400 mx-auto mb-3" />
            <h2 className="font-display text-sm font-bold tracking-wider text-emerald-100 uppercase">
              Verifying Payment...
            </h2>
            <p className="text-xs text-emerald-200/60 mt-1">Please do not refresh this window.</p>
          </div>
        ) : error ? (
          <div>
            <div className="w-12 h-12 rounded-full bg-rose-950/70 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={26} />
            </div>
            <h2 className="font-display text-lg font-bold text-rose-200 uppercase mb-2">
              Verification Issue
            </h2>
            <p className="text-xs text-emerald-100/70 mb-6">{error}</p>
            <Link
              to="/student/dashboard"
              className="inline-block doom-btn-secondary font-semibold text-xs px-5 py-2.5 rounded-lg"
            >
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <div>
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-400/50 text-emerald-300 flex items-center justify-center mx-auto mb-4 shadow-[0_0_26px_rgba(34,255,102,0.3)]">
              <CheckCircle2 size={30} />
            </div>
            <h2 className="font-display text-xl font-bold tracking-wider text-arcane-gold uppercase mb-1">
              Payment Successful!
            </h2>
            <p className="text-xs text-emerald-200/70 mb-6">
              Your registration for Build Ops is confirmed.
            </p>

            <div className="doom-panel rounded-lg p-4 text-left text-xs space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-emerald-200/60">Order ID:</span>
                <span className="font-mono-tech text-emerald-200">{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-200/60">Status:</span>
                <span className="font-bold text-emerald-glow">CONFIRMED & PAID</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-200/60">E-Ticket:</span>
                <span className="text-amber-200 font-semibold">Generated & Ready</span>
              </div>
            </div>

            {result?.whatsapp_group_link && (
              <a
                href={result.whatsapp_group_link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#16a34a] hover:bg-[#22c55e] text-[#030705] font-mono-tech text-xs font-bold tracking-wider uppercase py-2.5 px-4 mb-3 transition border border-emerald-400"
              >
                <MessageCircle size={14} />
                <span>Join Official WhatsApp Group</span>
                <ExternalLink size={12} />
              </a>
            )}

            <Link
              to="/student/dashboard"
              className="w-full inline-flex items-center justify-center gap-1.5 doom-btn-primary font-mono-tech tracking-wider uppercase text-xs py-2.5 px-4"
            >
              Go to Dashboard &amp; Gate Pass <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

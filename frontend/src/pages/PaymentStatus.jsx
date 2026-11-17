import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import { CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';

export const PaymentStatus = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');

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
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || err.response?.data?.message || 'Payment verification failed.');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [orderId]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg border border-slate-200 shadow-sm text-center">
        {loading ? (
          <div className="py-8">
            <RefreshCw size={28} className="animate-spin text-teal-600 mx-auto mb-3" />
            <h2 className="text-base font-bold text-slate-800">Verifying Payment with Gateway...</h2>
            <p className="text-xs text-slate-500 mt-1">Please do not refresh this window.</p>
          </div>
        ) : error ? (
          <div>
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Payment Verification Issue</h2>
            <p className="text-xs text-slate-600 mb-6">{error}</p>
            <Link
              to="/student/dashboard"
              className="inline-block bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs px-4 py-2 rounded-md transition"
            >
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <div>
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Payment Successful!</h2>
            <p className="text-xs text-slate-600 mb-6">
              Your registration for Build Ops is confirmed.
            </p>

            <div className="bg-slate-50 rounded-md p-4 border border-slate-200 text-left text-xs space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">Order ID:</span>
                <span className="font-mono font-medium text-slate-800">{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-emerald-700">CONFIRMED & PAID</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">E-Ticket:</span>
                <span className="text-teal-700 font-semibold">Generated & Emailed</span>
              </div>
            </div>

            <Link
              to="/student/dashboard"
              className="w-full inline-flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs py-2.5 px-4 rounded-md shadow-sm transition"
            >
              Go to Dashboard & Download Ticket <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

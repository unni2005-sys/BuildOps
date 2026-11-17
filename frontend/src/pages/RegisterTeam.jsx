import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Users,
  AlertCircle,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export const RegisterTeam = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [checkingExisting, setCheckingExisting] = useState(true);
  const [existingPendingTeam, setExistingPendingTeam] = useState(null);

  const [formData, setFormData] = useState({
    team_name: '',
    college_name: '',
    leader_phone: user?.mobile_number || '',
    member2_name: '',
    member2_email: '',
    member2_phone: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Payment flow steps: 'FORM' -> 'GATEWAY' -> 'SUCCESS'
  const [step, setStep] = useState('FORM');
  const [paymentOrder, setPaymentOrder] = useState(null);

  // Keep leader_phone synced with user profile
  useEffect(() => {
    if (user?.mobile_number && !formData.leader_phone) {
      setFormData((prev) => ({ ...prev, leader_phone: user.mobile_number }));
    }
  }, [user]);

  // Check if student already has a team
  useEffect(() => {
    const checkTeam = async () => {
      try {
        const res = await api.get('/teams/my-team/');
        const team = res.data.team;
        if (team) {
          if (team.payment_status === 'SUCCESS') {
            navigate('/student/dashboard', { replace: true });
            return;
          }
          // Team created previously but payment still pending
          setExistingPendingTeam(team);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingExisting(false);
      }
    };
    checkTeam();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'leader_phone' || name === 'member2_phone') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setFormData({ ...formData, [name]: digitsOnly });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const initiateCashfreeOrder = async () => {
    const returnUrl = `${window.location.origin}/payment-status`;
    const orderRes = await api.post('/payments/create-order/', { return_url: returnUrl });
    setPaymentOrder(orderRes.data);
    setStep('GATEWAY');
  };

  const handleConfirmAndPay = async (e) => {
    e.preventDefault();
    setError('');

    const leaderPhone = (user?.mobile_number || formData.leader_phone || '').trim();
    const member2Phone = formData.member2_phone.trim();
    const member2Email = formData.member2_email.trim().toLowerCase();

    if (!formData.team_name.trim()) {
      setError('Please enter your Team Name.');
      return;
    }

    if (!formData.college_name.trim()) {
      setError('Please enter your College / Institution Name.');
      return;
    }

    if (!/^\d{10}$/.test(leaderPhone)) {
      setError('Team Leader mobile number must be exactly 10 digits.');
      return;
    }

    if (!formData.member2_name.trim()) {
      setError('Please enter Member 2 Full Name.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member2Email)) {
      setError('Please enter a valid email address for Member 2.');
      return;
    }

    if (!/^\d{10}$/.test(member2Phone)) {
      setError('Member 2 mobile number must be exactly 10 digits.');
      return;
    }

    if (member2Email === user?.email?.toLowerCase()) {
      setError('Member 2 email must be different from Team Leader email.');
      return;
    }

    if (member2Phone === leaderPhone) {
      setError('Member 2 mobile number must be different from Team Leader mobile number.');
      return;
    }

    setLoading(true);
    try {
      // 1. Register the team
      const regRes = await api.post('/teams/register/', {
        team_name: formData.team_name.trim(),
        college_name: formData.college_name.trim(),
        leader_phone: leaderPhone,
        member2_name: formData.member2_name.trim(),
        member2_email: member2Email,
        member2_phone: member2Phone,
      });
      setExistingPendingTeam(regRes.data.team);

      // 2. Immediately create Cashfree order & open gateway
      await initiateCashfreeOrder();
    } catch (err) {
      console.error(err);
      if (err.response?.data) {
        const msg = typeof err.response.data === 'string'
          ? err.response.data
          : Object.values(err.response.data).flat().join(' ');
        setError(msg || 'Registration failed. Please check the details entered.');
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResumePayment = async () => {
    setError('');
    setLoading(true);
    try {
      await initiateCashfreeOrder();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Could not launch Cashfree payment gateway.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePayment = async () => {
    if (!paymentOrder?.order_id) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/payments/simulate/', { order_id: paymentOrder.order_id });
      setStep('SUCCESS');
      // Automatically redirect to dashboard with E-Ticket preview after 2.5s
      setTimeout(() => {
        navigate('/student/dashboard', { replace: true });
      }, 2500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingExisting) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex items-center gap-2 text-slate-600 text-sm">
          <RefreshCw size={18} className="animate-spin text-teal-600" />
          <span>Loading registration...</span>
        </div>
      </div>
    );
  }

  // STEP 3: PAYMENT SUCCESS SCREEN
  if (step === 'SUCCESS') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg border border-slate-200 shadow-sm text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Payment Successful!</h2>
          <p className="text-xs text-slate-600 mb-6">
            Your team registration for <strong>Build Ops</strong> is confirmed and your E-Ticket has been generated.
          </p>

          <div className="bg-slate-50 rounded-md p-4 border border-slate-200 text-left text-xs space-y-2 mb-6">
            <div className="flex justify-between">
              <span className="text-slate-500">Team Name:</span>
              <span className="font-semibold text-slate-900">{paymentOrder?.team?.team_name || existingPendingTeam?.team_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Order ID:</span>
              <span className="font-mono text-slate-800">{paymentOrder?.order_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount Paid:</span>
              <span className="font-bold text-emerald-700">₹{paymentOrder?.amount || 500}</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/student/dashboard', { replace: true })}
            className="w-full inline-flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs py-2.5 px-4 rounded-md shadow-sm transition cursor-pointer"
          >
            Go to Dashboard & View E-Ticket <ArrowRight size={14} />
          </button>
          <p className="text-[11px] text-slate-400 mt-3">
            Redirecting to your dashboard automatically...
          </p>
        </div>
      </div>
    );
  }

  // STEP 2: CASHFREE PAYMENT GATEWAY CHECKOUT
  if (step === 'GATEWAY' && paymentOrder) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-md bg-teal-50 text-teal-700 flex items-center justify-center">
                <CreditCard size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Cashfree Payment Gateway</h2>
                <p className="text-[11px] text-slate-500">Secure Checkout ({paymentOrder.environment})</p>
              </div>
            </div>
            <ShieldCheck size={20} className="text-emerald-600" />
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-md text-xs flex items-center gap-2 mb-4">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-slate-50 p-4 rounded-md border border-slate-200 space-y-2 text-xs mb-6">
            <div className="flex justify-between">
              <span className="text-slate-500">Event:</span>
              <span className="font-semibold text-slate-900">Build Ops</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Team:</span>
              <span className="font-semibold text-slate-900">{paymentOrder.team?.team_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Registration ID:</span>
              <span className="font-mono text-slate-800">{paymentOrder.team?.registration_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Order ID:</span>
              <span className="font-mono text-slate-700">{paymentOrder.order_id}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="font-semibold text-slate-700">Total Payable:</span>
              <span className="text-lg font-black text-teal-700">₹{paymentOrder.amount}</span>
            </div>
          </div>

          <button
            onClick={handleCompletePayment}
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-4 rounded-md text-sm transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Processing Payment...' : `Pay ₹${paymentOrder.amount} Now`}
          </button>

          <button
            onClick={() => navigate('/student/dashboard')}
            disabled={loading}
            className="w-full mt-3 text-xs text-slate-500 hover:text-slate-800 py-1.5 cursor-pointer"
          >
            Pay Later from Dashboard
          </button>
        </div>
      </div>
    );
  }

  // If user already registered a pending team earlier, let them jump right to Confirm & Pay
  if (existingPendingTeam) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Complete Your Team Payment</h2>
          <p className="text-xs text-slate-500 mb-5">
            Your team <strong>{existingPendingTeam.team_name}</strong> ({existingPendingTeam.registration_id}) is saved. Complete payment to generate your E-Ticket.
          </p>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-md text-xs flex items-center gap-2 mb-4">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2 mb-6">
            {existingPendingTeam.members.map((m) => (
              <div key={m.id} className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                <div>
                  <p className="font-semibold text-slate-900">{m.full_name}</p>
                  <p className="text-slate-600">{m.email} • {m.mobile_number}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded">{m.member_role}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleResumePayment}
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 px-4 rounded-md text-sm transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CreditCard size={16} />
            {loading ? 'Opening Cashfree...' : `Confirm & Pay ₹${existingPendingTeam.fee_amount || 500}`}
          </button>
        </div>
      </div>
    );
  }

  // STEP 1: TEAM REGISTRATION FORM
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-6">
          <div className="w-10 h-10 rounded-md bg-teal-50 text-teal-600 flex items-center justify-center">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Register Your Team</h1>
            <p className="text-xs text-slate-500">Enter your team & second member details, then confirm and pay ₹500.</p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-md text-xs flex items-center gap-2 mb-5">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleConfirmAndPay} className="space-y-6">
          {/* Team Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Team Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Team Name</label>
                <input
                  type="text"
                  name="team_name"
                  required
                  value={formData.team_name}
                  onChange={handleChange}
                  placeholder="e.g. Neural Ninjas"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">College Name</label>
                <input
                  type="text"
                  name="college_name"
                  required
                  value={formData.college_name}
                  onChange={handleChange}
                  placeholder="e.g. NIT / College Name"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Participant 1 (Team Leader - Auto-populated from login) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Team Leader (Auto-filled from your account)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                <input
                  type="text"
                  disabled
                  value={user?.full_name || ''}
                  className="w-full bg-slate-100 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full bg-slate-100 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Mobile Number</label>
                {user?.mobile_number ? (
                  <input
                    type="tel"
                    disabled
                    value={user.mobile_number}
                    className="w-full bg-slate-100 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700"
                  />
                ) : (
                  <input
                    type="tel"
                    name="leader_phone"
                    required
                    maxLength={10}
                    value={formData.leader_phone}
                    onChange={handleChange}
                    placeholder="10-digit mobile"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Participant 2 (Team Member) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Second Team Member Details
            </h3>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                name="member2_name"
                required
                value={formData.member2_name}
                onChange={handleChange}
                placeholder="Second member's full name"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  name="member2_email"
                  required
                  value={formData.member2_email}
                  onChange={handleChange}
                  placeholder="member2@college.edu"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mobile Number (10 digits)</label>
                <input
                  type="tel"
                  name="member2_phone"
                  required
                  maxLength={10}
                  value={formData.member2_phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-4 rounded-md text-sm transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CreditCard size={18} />
              {loading ? 'Confirming & Opening Payment Gateway...' : 'Confirm & Pay ₹500'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

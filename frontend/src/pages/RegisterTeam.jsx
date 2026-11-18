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
  RefreshCw,
  MessageCircle,
  ExternalLink
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
  const [whatsappLink, setWhatsappLink] = useState('');

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

  const loadRazorpayScript = () => {
    if (window.Razorpay) return Promise.resolve(true);
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const openRazorpayCheckout = async (order) => {
    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      setError('Could not load Razorpay Checkout SDK. Please check your internet connection or disable ad-blockers and try again.');
      return;
    }

    const razorpayKeyId = order.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || '';
    const options = {
      key: razorpayKeyId,
      amount: order.amount_paise,
      currency: order.currency || 'INR',
      name: 'Build Ops',
      description: `Team ${order.team?.team_name || ''} (${order.team?.registration_id || ''})`,
      order_id: order.order_id,
      prefill: {
        name: order.prefill?.name || user?.full_name || '',
        email: order.prefill?.email || user?.email || '',
        contact: order.prefill?.contact || user?.mobile_number || '',
      },
      notes: {
        registration_id: order.team?.registration_id || '',
        team_name: order.team?.team_name || '',
      },
      theme: {
        color: '#10b981',
      },
      handler: async (response) => {
        setLoading(true);
        setError('');
        try {
          const verRes = await api.post('/payments/verify-razorpay/', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          const waLink = verRes.data?.whatsapp_group_link || '';
          setWhatsappLink(waLink);
          setStep('SUCCESS');
          if (!waLink) {
            setTimeout(() => {
              navigate('/student/dashboard', { replace: true });
            }, 2500);
          }
        } catch (err) {
          console.error(err);
          setError(
            err.response?.data?.error ||
              'Payment verification failed. If money was debited, contact admin with your Razorpay Payment ID.'
          );
          setStep('FORM');
        } finally {
          setLoading(false);
        }
      },
      modal: {
        ondismiss: () => {
          setError('Payment window was closed. Click Confirm & Pay to try again.');
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (resp) => {
      setError(resp?.error?.description || 'Payment failed. Please try again.');
    });
    rzp.open();
  };

  const initiateRazorpayOrder = async () => {
    const orderRes = await api.post('/payments/create-order/', {});
    const order = orderRes.data;
    setPaymentOrder(order);

    const razorpayKeyId = order.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!order.is_mock && razorpayKeyId) {
      await openRazorpayCheckout(order);
    } else {
      // Fallback test checkout screen when Razorpay keys are not yet configured
      setStep('GATEWAY');
    }
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

      // 2. Immediately create Razorpay order & open checkout
      await initiateRazorpayOrder();
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
      await initiateRazorpayOrder();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Could not launch Razorpay payment gateway.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePayment = async () => {
    if (!paymentOrder?.order_id) return;
    setLoading(true);
    setError('');
    try {
      const simRes = await api.post('/payments/simulate/', { order_id: paymentOrder.order_id });
      const waLink = simRes.data?.whatsapp_group_link || '';
      setWhatsappLink(waLink);
      setStep('SUCCESS');
      if (!waLink) {
        setTimeout(() => {
          navigate('/student/dashboard', { replace: true });
        }, 2500);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingExisting) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
        <div className="flex items-center gap-2.5 text-emerald-300 text-xs font-display tracking-widest uppercase">
          <RefreshCw size={16} className="animate-spin text-emerald-400" />
          <span>Loading Registration...</span>
        </div>
      </div>
    );
  }

  // STEP 3: PAYMENT SUCCESS SCREEN
  if (step === 'SUCCESS') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[440px] rounded-full bg-emerald-500/15 blur-[120px] animate-pulse-aura" />

        <div className="max-w-md w-full doom-card p-8 rounded-xl text-center relative z-10 animate-fade-in-up">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-400/50 text-emerald-300 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(34,255,102,0.35)]">
            <CheckCircle2 size={34} />
          </div>
          <h2 className="font-display text-xl font-bold tracking-wider text-arcane-gold uppercase mb-1">
            Payment Successful!
          </h2>
          <p className="text-xs text-emerald-200/70 mb-6">
            Your team registration for <strong className="text-emerald-100">Build Ops</strong> is confirmed and your E-Ticket is live.
          </p>

          <div className="doom-panel rounded-lg p-4 text-left text-xs space-y-2.5 mb-6">
            <div className="flex justify-between">
              <span className="text-emerald-200/60">Team Name:</span>
              <span className="font-semibold text-emerald-50">{paymentOrder?.team?.team_name || existingPendingTeam?.team_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-200/60">Order ID:</span>
              <span className="font-mono-tech text-emerald-200">{paymentOrder?.order_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-200/60">Amount Paid:</span>
              <span className="font-bold text-emerald-glow">₹{paymentOrder?.amount || 500}</span>
            </div>
          </div>

          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 bg-[#16a34a] hover:bg-[#22c55e] text-[#030705] font-mono-tech text-xs font-bold tracking-wider uppercase py-3 px-4 mb-3 transition border border-emerald-400"
            >
              <MessageCircle size={15} />
              <span>Join Official WhatsApp Group</span>
              <ExternalLink size={13} />
            </a>
          )}

          <button
            onClick={() => navigate('/student/dashboard', { replace: true })}
            className="w-full inline-flex items-center justify-center gap-2 doom-btn-primary text-xs font-mono-tech tracking-widest uppercase py-3 px-4 cursor-pointer"
          >
            View My Gate Pass <ArrowRight size={14} />
          </button>
          {!whatsappLink && (
            <p className="text-[11px] text-emerald-200/50 mt-3">
              Redirecting to your dashboard automatically...
            </p>
          )}
        </div>
      </div>
    );
  }

  // STEP 2: RAZORPAY TEST CHECKOUT FALLBACK (when keys are not yet configured)
  if (step === 'GATEWAY' && paymentOrder) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[440px] rounded-full bg-emerald-500/12 blur-[120px]" />

        <div className="max-w-md w-full doom-card p-8 rounded-xl relative z-10 animate-fade-in-up">
          <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 flex items-center justify-center">
                <CreditCard size={20} />
              </div>
              <div>
                <h2 className="font-display text-sm font-bold tracking-wider text-emerald-50 uppercase">
                  Razorpay Checkout
                </h2>
                <p className="text-[11px] text-amber-200/75 font-mono-tech uppercase">
                  Test Mode ({paymentOrder.environment})
                </p>
              </div>
            </div>
            <ShieldCheck size={20} className="text-emerald-400" />
          </div>

          {error && (
            <div className="bg-rose-950/60 border border-rose-500/40 text-rose-200 p-3 rounded-lg text-xs flex items-center gap-2 mb-4">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="doom-panel p-4 rounded-lg space-y-2.5 text-xs mb-6">
            <div className="flex justify-between">
              <span className="text-emerald-200/60">Event:</span>
              <span className="font-semibold text-emerald-50">Build Ops</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-200/60">Team:</span>
              <span className="font-semibold text-emerald-50">{paymentOrder.team?.team_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-200/60">Registration ID:</span>
              <span className="font-mono-tech text-amber-200">{paymentOrder.team?.registration_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-200/60">Order ID:</span>
              <span className="font-mono-tech text-emerald-200/80">{paymentOrder.order_id}</span>
            </div>
            <div className="laser-divider my-2 opacity-60" />
            <div className="flex justify-between items-center pt-1">
              <span className="font-semibold text-emerald-100 uppercase tracking-wider text-[11px]">Total Payable:</span>
              <span className="font-display text-xl font-black text-arcane-gold">₹{paymentOrder.amount}</span>
            </div>
          </div>

          <button
            onClick={handleCompletePayment}
            disabled={loading}
            className="w-full doom-btn-primary py-3 px-4 rounded-lg text-xs font-display tracking-[0.15em] uppercase disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Processing Payment...' : `Pay ₹${paymentOrder.amount} Now`}
          </button>

          <button
            onClick={() => navigate('/student/dashboard')}
            disabled={loading}
            className="w-full mt-3 text-xs text-emerald-200/60 hover:text-amber-200 py-1.5 cursor-pointer transition"
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
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="max-w-lg w-full doom-card p-8 rounded-xl animate-fade-in-up">
          <p className="font-imperial text-[10px] tracking-[0.26em] text-amber-200/80 uppercase">
            Pending Registration
          </p>
          <h2 className="font-display text-lg font-bold tracking-wider text-buildops uppercase mt-1 mb-1">
            Complete Team Payment
          </h2>
          <p className="text-xs text-emerald-200/70 mb-5">
            Team <strong className="text-emerald-100">{existingPendingTeam.team_name}</strong>{' '}
            (<span className="font-mono-tech text-amber-200">{existingPendingTeam.registration_id}</span>) is saved. Complete payment to unlock your E-Ticket.
          </p>

          {error && (
            <div className="bg-rose-950/60 border border-rose-500/40 text-rose-200 p-3 rounded-lg text-xs flex items-center gap-2 mb-4">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2.5 mb-6">
            {existingPendingTeam.members.map((m) => (
              <div key={m.id} className="p-3.5 rounded-lg doom-panel text-xs flex justify-between items-center">
                <div>
                  <p className="font-semibold text-emerald-50">{m.full_name}</p>
                  <p className="text-emerald-200/65 font-mono-tech text-[11px] mt-0.5">{m.email} • {m.mobile_number}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 rounded uppercase">
                  {m.member_role}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={handleResumePayment}
            disabled={loading}
            className="w-full doom-btn-primary py-3 px-4 rounded-lg text-xs font-display tracking-[0.14em] uppercase disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CreditCard size={16} />
            {loading ? 'Opening Razorpay...' : `Confirm & Pay ₹${existingPendingTeam.fee_amount || 500}`}
          </button>
        </div>
      </div>
    );
  }

  // STEP 1: TEAM REGISTRATION FORM
  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-2xl mx-auto doom-card p-6 sm:p-8 rounded-xl animate-fade-in-up">
        <div className="flex items-center gap-3.5 pb-5 border-b border-emerald-500/20 mb-6">
          <div className="w-11 h-11 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 flex items-center justify-center shadow-[0_0_16px_rgba(34,255,102,0.2)]">
            <Users size={22} />
          </div>
          <div>
            <p className="font-imperial text-[10px] tracking-[0.26em] text-amber-200/80 uppercase">
              Build Ops • Team of Two
            </p>
            <h1 className="font-display text-lg sm:text-xl font-bold tracking-wider text-buildops uppercase">
              Register Your Team
            </h1>
            <p className="text-xs text-emerald-200/65 mt-0.5">
              Verify leader info, add your partner, and confirm with ₹500 registration fee.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-950/60 border border-rose-500/40 text-rose-200 p-3 rounded-lg text-xs flex items-center gap-2 mb-5">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleConfirmAndPay} className="space-y-6">
          {/* Team Details */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-display font-bold uppercase tracking-[0.18em] text-amber-200/90 border-l-2 border-emerald-400 pl-2.5">
              Team Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-200/80 mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  name="team_name"
                  required
                  value={formData.team_name}
                  onChange={handleChange}
                  placeholder="e.g. Neural Ninjas"
                  className="w-full rounded-lg px-3 py-2.5 text-sm doom-input"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-200/80 mb-1">
                  College Name
                </label>
                <input
                  type="text"
                  name="college_name"
                  required
                  value={formData.college_name}
                  onChange={handleChange}
                  placeholder="e.g. ASIET / College Name"
                  className="w-full rounded-lg px-3 py-2.5 text-sm doom-input"
                />
              </div>
            </div>
          </div>

          {/* Participant 1 (Team Leader - Auto-populated from login) */}
          <div className="space-y-3 pt-4 border-t border-emerald-500/15">
            <h3 className="text-[11px] font-display font-bold uppercase tracking-[0.18em] text-emerald-300 border-l-2 border-amber-300/70 pl-2.5">
              Team Leader (Auto-filled)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-200/60 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.full_name || ''}
                  className="w-full rounded-lg px-3 py-2 text-sm doom-input"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-200/60 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full rounded-lg px-3 py-2 text-sm doom-input"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-200/60 mb-1">
                  Mobile Number
                </label>
                {user?.mobile_number ? (
                  <input
                    type="tel"
                    disabled
                    value={user.mobile_number}
                    className="w-full rounded-lg px-3 py-2 text-sm font-mono-tech doom-input"
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
                    className="w-full rounded-lg px-3 py-2 text-sm font-mono-tech doom-input"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Participant 2 (Team Member) */}
          <div className="space-y-3 pt-4 border-t border-emerald-500/15">
            <h3 className="text-[11px] font-display font-bold uppercase tracking-[0.18em] text-amber-200/90 border-l-2 border-emerald-400 pl-2.5">
              Second Team Member
            </h3>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-200/80 mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="member2_name"
                required
                value={formData.member2_name}
                onChange={handleChange}
                placeholder="Second member's full name"
                className="w-full rounded-lg px-3 py-2.5 text-sm doom-input"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-200/80 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="member2_email"
                  required
                  value={formData.member2_email}
                  onChange={handleChange}
                  placeholder="member2@college.edu"
                  className="w-full rounded-lg px-3 py-2.5 text-sm doom-input"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-200/80 mb-1">
                  Mobile Number (10 digits)
                </label>
                <input
                  type="tel"
                  name="member2_phone"
                  required
                  maxLength={10}
                  value={formData.member2_phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  className="w-full rounded-lg px-3 py-2.5 text-sm font-mono-tech doom-input"
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <div className="laser-divider mb-5 opacity-60" />
            <button
              type="submit"
              disabled={loading}
              className="w-full doom-btn-primary py-3 px-4 rounded-lg text-xs font-display tracking-[0.16em] uppercase disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CreditCard size={17} />
              {loading ? 'Confirming & Opening Payment Gateway...' : 'Confirm & Pay ₹500'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

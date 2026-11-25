import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { scanScreenshotForTransactionId } from '../utils/upiOcr';
import {
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  ShieldCheck,
  Building2,
  Smartphone,
  Sparkles,
  Loader2
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

  // Flow steps: 'FORM' -> 'UPI_PAYMENT' -> 'VERIFICATION_PENDING'
  const [step, setStep] = useState('FORM');

  // UPI configuration & state
  const [upiDetails, setUpiDetails] = useState({
    upi_id: 'unniacc9961@okaxis',
    payee_name: 'Unnikrishnan M',
    phone_number: '9497290648',
    amount: 500,
    upi_uri: '',
  });

  // Proof upload state
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [autoDetectedInfo, setAutoDetectedInfo] = useState(null);
  const [showManualEdit, setShowManualEdit] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);

  // Sync leader phone with user profile
  useEffect(() => {
    if (user?.mobile_number && !formData.leader_phone) {
      setFormData((prev) => ({ ...prev, leader_phone: user.mobile_number }));
    }
  }, [user]);

  // Fetch UPI info from backend
  const fetchUpiInfo = async () => {
    try {
      const res = await api.get('/payments/upi-details/');
      if (res.data) {
        setUpiDetails((prev) => ({
          ...prev,
          upi_id: res.data.upi_id || prev.upi_id,
          payee_name: res.data.payee_name || prev.payee_name,
          phone_number: res.data.phone_number || prev.phone_number,
          amount: res.data.amount || prev.amount,
          upi_uri: res.data.upi_uri || prev.upi_uri,
        }));
      }
    } catch (err) {
      console.warn('Could not fetch dynamic UPI details, using defaults:', err);
    }
  };

  // Check if student already has a registered team
  useEffect(() => {
    const checkTeam = async () => {
      try {
        await fetchUpiInfo();
        const res = await api.get('/teams/my-team/');
        const team = res.data.team;
        if (team) {
          if (team.payment_status === 'SUCCESS') {
            navigate('/student/dashboard', { replace: true });
            return;
          }
          setExistingPendingTeam(team);
          if (team.payment_status === 'VERIFICATION_PENDING') {
            setStep('VERIFICATION_PENDING');
          } else {
            setStep('UPI_PAYMENT');
          }
        }
      } catch (err) {
        console.error('Error checking team:', err);
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

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, JPEG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('Image file size must be less than 8MB.');
      return;
    }

    setError('');
    setScreenshotFile(file);
    setAutoDetectedInfo(null);
    setShowManualEdit(false);

    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Automatically scan the uploaded screenshot for UTR / Transaction ID
    setIsScanningOcr(true);
    setOcrProgress(15);
    try {
      const ocrResult = await scanScreenshotForTransactionId(file, (p) => {
        if (p?.progress) {
          setOcrProgress(Math.max(15, p.progress));
        }
      });

      if (ocrResult.success && ocrResult.transactionId) {
        setTransactionId(ocrResult.transactionId);
        setAutoDetectedInfo({
          id: ocrResult.transactionId,
          type: ocrResult.type || 'Transaction ID',
          confidence: ocrResult.confidence || 'high',
        });
      } else {
        setAutoDetectedInfo({ notFound: true });
      }
    } catch (ocrErr) {
      console.warn('Automatic transaction ID extraction error:', ocrErr);
      setAutoDetectedInfo({ notFound: true });
    } finally {
      setIsScanningOcr(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'upi') {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } else if (type === 'note') {
      setCopiedNote(true);
      setTimeout(() => setCopiedNote(false), 2000);
    }
  };

  // Register Team -> Proceed to UPI
  const handleRegisterTeam = async (e) => {
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
      const regRes = await api.post('/teams/register/', {
        team_name: formData.team_name.trim(),
        college_name: formData.college_name.trim(),
        leader_phone: leaderPhone,
        member2_name: formData.member2_name.trim(),
        member2_email: member2Email,
        member2_phone: member2Phone,
      });

      const team = regRes.data.team;
      setExistingPendingTeam(team);
      await fetchUpiInfo();
      setStep('UPI_PAYMENT');
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

  // Submit Payment Proof (Screenshot + UTR)
  const handleSubmitProof = async (e) => {
    e.preventDefault();
    setError('');

    if (!screenshotFile) {
      setError('Please select and upload a screenshot of your completed UPI payment.');
      return;
    }

    setLoading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('screenshot', screenshotFile);
      if (transactionId.trim()) {
        uploadData.append('transaction_id', transactionId.trim());
      }
      if (autoDetectedInfo?.type) {
        uploadData.append('detection_type', autoDetectedInfo.type);
      }

      const res = await api.post('/payments/submit-proof/', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.team) {
        setExistingPendingTeam(res.data.team);
      }
      setStep('VERIFICATION_PENDING');
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error ||
          'Failed to submit payment proof. Please check your image file and try again.'
      );
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

  const activeTeam = existingPendingTeam;
  const regId = activeTeam?.registration_id || 'BUILDOPS';
  const paymentNote = `BuildOps-${regId}`;

  // =========================================================================
  // STEP 3: VERIFICATION PENDING SCREEN
  // =========================================================================
  if (step === 'VERIFICATION_PENDING') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-amber-500/10 blur-[130px] animate-pulse-aura" />

        <div className="max-w-lg w-full doom-card p-7 sm:p-9 rounded-xl text-center relative z-10 animate-fade-in-up border border-amber-500/30">
          <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-400/50 text-amber-300 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
            <Clock size={32} />
          </div>

          <h2 className="font-display text-xl font-bold tracking-wider text-amber-200 uppercase mb-1">
            Payment Proof Submitted
          </h2>
          <p className="text-xs text-emerald-200/75 mb-6">
            Your payment is currently <strong className="text-amber-300">Under Review</strong> by the event organizing team.
          </p>

          <div className="doom-panel rounded-lg p-4 text-left text-xs space-y-2.5 mb-6 border border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-emerald-200/60">Squad Name:</span>
              <span className="font-semibold text-emerald-50">{activeTeam?.team_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-emerald-200/60">Registration ID:</span>
              <span className="font-mono-tech text-amber-200 font-bold">{regId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-emerald-200/60">Amount Paid:</span>
              <span className="font-bold text-emerald-glow">₹{activeTeam?.fee_amount || 500}</span>
            </div>
            {activeTeam?.payment_proof?.payment_reference && (
              <div className="flex justify-between items-center">
                <span className="text-emerald-200/60">Transaction / UTR:</span>
                <span className="font-mono-tech text-emerald-300">{activeTeam.payment_proof.payment_reference}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-white/10">
              <span className="text-emerald-200/60">Status:</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 uppercase">
                <Clock size={12} /> Verification Pending
              </span>
            </div>
          </div>

          {(screenshotPreview || activeTeam?.payment_proof?.screenshot_url) && (
            <div className="mb-6 p-3 bg-black/40 border border-white/10 rounded-lg text-left">
              <span className="block text-[10px] font-mono-tech uppercase tracking-wider text-emerald-200/60 mb-2">
                Submitted Screenshot Preview:
              </span>
              <div className="max-h-48 overflow-hidden rounded border border-white/10 flex items-center justify-center bg-black/60">
                <img
                  src={screenshotPreview || activeTeam?.payment_proof?.screenshot_url}
                  alt="Payment Proof"
                  className="max-h-48 w-auto object-contain"
                />
              </div>
            </div>
          )}

          <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-200/80 mb-6 text-left">
            <p className="font-semibold text-emerald-300 mb-1 flex items-center gap-1.5">
              <ShieldCheck size={14} /> What happens next?
            </p>
            <p>
              Once our organizers confirm receipt of your ₹500 transfer against the UTR, your digital pass with QR gate access will unlock on your dashboard, and confirmation will be sent to both members via email.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/student/dashboard', { replace: true })}
              className="w-full inline-flex items-center justify-center gap-2 doom-btn-primary text-xs font-mono-tech tracking-widest uppercase py-3 px-4 cursor-pointer"
            >
              <span>Go to My Dashboard</span>
              <ArrowRight size={14} />
            </button>

            <button
              onClick={() => setStep('UPI_PAYMENT')}
              className="w-full text-xs text-emerald-200/60 hover:text-amber-200 py-1.5 transition cursor-pointer"
            >
              Need to upload a different screenshot? Click here
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STEP 2: UPI PAYMENT & SCREENSHOT UPLOAD SCREEN
  // =========================================================================
  if (step === 'UPI_PAYMENT' && activeTeam) {
    return (
      <div className="min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
          {/* Header */}
          <div className="doom-card p-6 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono-tech font-bold text-[#d4b46a] bg-[#0b1510] px-2.5 py-1 border border-[#d4b46a]/35 tracking-wider">
                  {regId}
                </span>
                <span className="text-[11px] font-mono-tech text-emerald-400 uppercase tracking-widest">
                  Step 2 of 2 • UPI Payment
                </span>
              </div>
              <h1 className="font-poster text-xl sm:text-2xl text-[#eef2ee] tracking-tight mt-1.5">
                {activeTeam.team_name}
              </h1>
              <p className="text-xs text-[#8b9b90] flex items-center gap-1.5 mt-0.5">
                <Building2 size={13} className="text-emerald-400" />
                <span>{activeTeam.college_name}</span>
              </p>
            </div>

            <div className="flex items-center sm:flex-col sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
              <span className="text-[10px] font-mono-tech uppercase tracking-wider text-[#8b9b90]">
                Registration Fee
              </span>
              <span className="font-display text-2xl font-black text-arcane-gold">
                ₹{activeTeam.fee_amount || 500}
              </span>
            </div>
          </div>

          {/* Rejection notice if previously rejected */}
          {activeTeam.payment_status === 'REJECTED' && (
            <div className="bg-rose-950/60 border border-rose-500/40 text-rose-200 p-4 rounded-xl text-xs flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-bold text-rose-100 uppercase tracking-wider text-[11px] mb-1">
                  Previous Payment Proof Rejected
                </p>
                <p className="text-rose-200/80">
                  {activeTeam.payment_proof?.rejection_reason ||
                    'Your previous payment proof could not be verified. Please check the transaction details and upload a clear screenshot.'}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-rose-950/60 border border-rose-500/40 text-rose-200 p-3.5 rounded-xl text-xs flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Two-Column Grid: Left QR & Instructions / Right Upload Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: UPI QR Code & Instructions */}
            <div className="lg:col-span-6 doom-card p-6 sm:p-7 rounded-xl flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                  <div className="flex items-center gap-2">
                    <Smartphone size={16} className="text-emerald-400" />
                    <h3 className="font-mono-tech text-xs font-bold uppercase tracking-widest text-[#eef2ee]">
                      Scan UPI QR Code
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono-tech uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/30 rounded">
                    Instant Pay
                  </span>
                </div>

                {/* QR Code Container */}
                <div className="text-center mb-5">
                  <div className="inline-block p-3.5 bg-white rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.18)] border border-emerald-400/40">
                    <img
                      src="/upi-qr.png"
                      alt="Build Ops UPI QR"
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                      onError={(e) => {
                        e.currentTarget.src = `/api/payments/upi-qr/?reg_id=${regId}`;
                      }}
                    />
                  </div>
                  <p className="font-mono-tech text-[11px] text-[#8b9b90] mt-2.5">
                    Scan with Google Pay, PhonePe, Paytm, or any UPI app
                  </p>
                </div>

                {/* UPI Details Box */}
                <div className="doom-panel p-4 rounded-lg space-y-2.5 text-xs border border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-[#8b9b90]">Payee UPI ID:</span>
                    <div className="flex items-center gap-1.5 font-mono-tech font-bold text-[#eef2ee]">
                      <span>{upiDetails.upi_id}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(upiDetails.upi_id, 'upi')}
                        className="text-[#8b9b90] hover:text-white p-1 transition cursor-pointer"
                        title="Copy UPI ID"
                      >
                        {copiedUpi ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#8b9b90]">Payee Name:</span>
                    <span className="font-semibold text-[#eef2ee]">{upiDetails.payee_name}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#8b9b90]">Payment Remarks/Note:</span>
                    <div className="flex items-center gap-1.5 font-mono-tech text-amber-200 font-bold">
                      <span>{paymentNote}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(paymentNote, 'note')}
                        className="text-[#8b9b90] hover:text-white p-1 transition cursor-pointer"
                        title="Copy Note"
                      >
                        {copiedNote ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Screenshot Upload Form */}
            <div className="lg:col-span-6 doom-card p-6 sm:p-7 rounded-xl flex flex-col justify-between">
              <div>
                <div className="pb-4 border-b border-white/10 mb-5">
                  <div className="flex items-center gap-2">
                    <Upload size={16} className="text-emerald-400" />
                    <h3 className="font-mono-tech text-xs font-bold uppercase tracking-widest text-[#eef2ee]">
                      Upload Payment Screenshot
                    </h3>
                  </div>
                  <p className="text-[11px] text-[#8b9b90] mt-1">
                    Upload the screenshot of your successful transaction to verify registration.
                  </p>
                </div>

                <form onSubmit={handleSubmitProof} className="space-y-4">
                  {/* File Upload Drop Area */}
                  <div>
                    <label className="block font-mono-tech text-[10px] uppercase tracking-[0.18em] text-[#8b9b90] mb-2">
                      Screenshot Image (PNG, JPG, WebP) *
                    </label>

                    {screenshotPreview ? (
                      <div className="relative border border-emerald-400/40 rounded-xl p-3 bg-black/50 text-center">
                        <img
                          src={screenshotPreview}
                          alt="Screenshot Preview"
                          className="max-h-56 mx-auto object-contain rounded mb-3"
                        />
                        <div className="flex items-center justify-between text-xs text-[#8b9b90] px-2 border-t border-white/10 pt-2">
                          <span className="truncate max-w-[200px]">{screenshotFile?.name}</span>
                          <label
                            htmlFor="screenshot-upload"
                            className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer underline text-[11px]"
                          >
                            Change image
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="screenshot-upload"
                        className="border-2 border-dashed border-white/20 hover:border-emerald-400/60 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-black/30 hover:bg-black/50 group"
                      >
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <ImageIcon size={22} />
                        </div>
                        <span className="font-display text-xs font-semibold text-[#eef2ee] group-hover:text-emerald-300 transition-colors">
                          Click to select payment screenshot
                        </span>
                        <span className="font-mono-tech text-[10px] text-[#8b9b90]">
                          PNG, JPG, JPEG, WebP up to 8MB
                        </span>
                      </label>
                    )}

                    <input
                      id="screenshot-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  {/* Automated Transaction ID / UTR Section */}
                  <div className="space-y-2">
                    {/* State 1: Currently Scanning OCR */}
                    {isScanningOcr && (
                      <div className="doom-panel p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-xs">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Loader2 size={15} className="animate-spin text-emerald-400 shrink-0" />
                            <span className="font-semibold text-emerald-100 text-[11px] font-mono-tech uppercase tracking-wide">
                              Scanning Screenshot for Transaction ID...
                            </span>
                          </div>
                          <span className="font-mono-tech text-[11px] text-emerald-400 font-bold">{ocrProgress}%</span>
                        </div>
                        <div className="w-full bg-black/60 h-1.5 rounded-full overflow-hidden border border-emerald-500/20">
                          <div
                            className="bg-emerald-400 h-full transition-all duration-200 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                            style={{ width: `${ocrProgress}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-emerald-200/60 font-mono-tech mt-2">
                          Reading UPI UTR / reference code directly from your image...
                        </p>
                      </div>
                    )}

                    {/* State 2: Transaction ID Auto-Detected */}
                    {!isScanningOcr && autoDetectedInfo && !autoDetectedInfo.notFound && (
                      <div className="doom-panel p-3.5 rounded-xl border border-emerald-400/50 bg-emerald-950/40 text-xs shadow-[0_0_20px_rgba(16,185,129,0.15)] space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center">
                              <CheckCircle2 size={14} />
                            </div>
                            <span className="text-[10px] font-mono-tech uppercase tracking-wider text-emerald-300 font-bold">
                              Auto-Fetched {autoDetectedInfo.type}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowManualEdit(!showManualEdit)}
                            className="text-[10px] font-mono-tech text-emerald-400/80 hover:text-emerald-200 underline cursor-pointer"
                          >
                            {showManualEdit ? 'Close edit' : 'Adjust manually'}
                          </button>
                        </div>

                        <div className="flex items-center justify-between bg-black/50 px-3 py-2 rounded-lg border border-emerald-500/20">
                          <div className="flex items-center gap-2">
                            <span className="text-[#8b9b90] font-mono-tech text-[10px] uppercase">ID:</span>
                            <span className="font-mono-tech font-bold text-sm text-emerald-100 tracking-wider">
                              {transactionId}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono-tech uppercase font-bold text-emerald-300/80 bg-emerald-500/15 border border-emerald-400/30 px-1.5 py-0.5 rounded">
                            Verified
                          </span>
                        </div>

                        {showManualEdit && (
                          <div className="pt-1.5 space-y-1 animate-fade-in-up">
                            <label className="block font-mono-tech text-[10px] uppercase tracking-wider text-[#8b9b90]">
                              Override Transaction ID:
                            </label>
                            <input
                              type="text"
                              value={transactionId}
                              onChange={(e) => setTransactionId(e.target.value)}
                              placeholder="e.g. 432109876543 (12-digit UTR)"
                              className="w-full px-3 py-1.5 text-xs font-mono-tech doom-input"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* State 3: Screenshot uploaded but no ID could be auto-extracted */}
                    {!isScanningOcr && autoDetectedInfo?.notFound && (
                      <div className="doom-panel p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/20 text-xs space-y-2">
                        <div className="flex items-start gap-2 text-amber-200">
                          <AlertCircle size={15} className="shrink-0 text-amber-400 mt-0.5" />
                          <p className="text-[11px] text-amber-200/90 leading-relaxed">
                            Could not auto-read transaction ID from this image. You can type it below or leave it for organizer manual review.
                          </p>
                        </div>
                        <div>
                          <input
                            type="text"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            placeholder="Enter 12-digit UTR if available"
                            className="w-full px-3 py-1.5 text-xs font-mono-tech doom-input"
                          />
                        </div>
                      </div>
                    )}

                    {/* State 4: Initial state before image is chosen */}
                    {!screenshotFile && (
                      <div className="p-3 rounded-xl doom-panel border border-white/5 text-xs flex items-center gap-2.5 text-[#8b9b90]">
                        <Sparkles size={15} className="text-emerald-400 shrink-0" />
                        <span className="text-[11px] font-mono-tech">
                          Transaction ID / UTR will be auto-fetched as soon as you select your screenshot.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading || !screenshotFile}
                      className="w-full doom-btn-primary py-3 px-4 font-mono-tech text-xs uppercase tracking-[0.18em] gap-2 disabled:opacity-50 cursor-pointer flex items-center justify-center rounded-lg"
                    >
                      {loading ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Uploading &amp; Submitting...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Payment Proof</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Pay Later link */}
              <div className="pt-4 border-t border-white/10 text-center mt-6">
                <button
                  type="button"
                  onClick={() => navigate('/student/dashboard')}
                  className="text-xs text-[#8b9b90] hover:text-[#eef2ee] transition cursor-pointer"
                >
                  Save progress and return to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STEP 1: TEAM REGISTRATION FORM
  // =========================================================================
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
          </div>
        </div>

        {error && (
          <div className="bg-rose-950/60 border border-rose-500/40 text-rose-200 p-3.5 rounded-lg text-xs flex items-center gap-2.5 mb-5">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegisterTeam} className="space-y-6">
          {/* Team Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block font-mono-tech text-[10px] uppercase tracking-[0.18em] text-[#8b9b90] mb-1.5">
                Team Name *
              </label>
              <input
                type="text"
                name="team_name"
                required
                value={formData.team_name}
                onChange={handleChange}
                placeholder="e.g. Arcane Coders"
                className="w-full px-3.5 py-2.5 text-sm doom-input"
              />
            </div>

            <div>
              <label className="block font-mono-tech text-[10px] uppercase tracking-[0.18em] text-[#8b9b90] mb-1.5">
                College / Institution Name *
              </label>
              <input
                type="text"
                name="college_name"
                required
                value={formData.college_name}
                onChange={handleChange}
                placeholder="e.g. Adi Shankara Institute of Engineering and Technology"
                className="w-full px-3.5 py-2.5 text-sm doom-input"
              />
            </div>
          </div>

          {/* Member 1: Team Leader */}
          <div className="doom-panel p-5 rounded-xl border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-mono-tech text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Team Leader (Member 1)
              </span>
              <span className="text-[10px] font-mono-tech text-[#8b9b90] uppercase">
                Current Account
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#8b9b90] block text-[10px] font-mono-tech uppercase">Full Name</span>
                <span className="font-semibold text-[#eef2ee]">{user?.full_name}</span>
              </div>
              <div>
                <span className="text-[#8b9b90] block text-[10px] font-mono-tech uppercase">Email Address</span>
                <span className="font-mono-tech text-emerald-300">{user?.email}</span>
              </div>
            </div>

            <div>
              <label className="block font-mono-tech text-[10px] uppercase tracking-[0.18em] text-[#8b9b90] mb-1">
                Leader Mobile Number (10 Digits) *
              </label>
              <input
                type="tel"
                name="leader_phone"
                required
                maxLength={10}
                value={formData.leader_phone}
                onChange={handleChange}
                placeholder="9876543210"
                className="w-full px-3 py-2 text-xs font-mono-tech doom-input"
              />
            </div>
          </div>

          {/* Member 2: Second Teammate */}
          <div className="doom-panel p-5 rounded-xl border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-mono-tech text-[11px] font-bold uppercase tracking-wider text-amber-200">
                Team Member 2
              </span>
              <span className="text-[10px] font-mono-tech text-[#8b9b90] uppercase">
                Required Teammate
              </span>
            </div>

            <div>
              <label className="block font-mono-tech text-[10px] uppercase tracking-[0.18em] text-[#8b9b90] mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="member2_name"
                required
                value={formData.member2_name}
                onChange={handleChange}
                placeholder="Teammate full name"
                className="w-full px-3 py-2 text-xs doom-input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-mono-tech text-[10px] uppercase tracking-[0.18em] text-[#8b9b90] mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="member2_email"
                  required
                  value={formData.member2_email}
                  onChange={handleChange}
                  placeholder="member2@college.edu"
                  className="w-full px-3 py-2 text-xs doom-input"
                />
              </div>

              <div>
                <label className="block font-mono-tech text-[10px] uppercase tracking-[0.18em] text-[#8b9b90] mb-1">
                  Mobile Number (10 Digits) *
                </label>
                <input
                  type="tel"
                  name="member2_phone"
                  required
                  maxLength={10}
                  value={formData.member2_phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 text-xs font-mono-tech doom-input"
                />
              </div>
            </div>
          </div>

          {/* Registration Fee Summary */}
          <div className="p-4 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between">
            <div>
              <span className="block font-mono-tech text-[10px] uppercase tracking-wider text-[#8b9b90]">
                Registration Fee (Per Team)
              </span>
              <span className="text-xs text-emerald-200/80">
                Covers both participants, gate pass &amp; universal amenities
              </span>
            </div>
            <span className="font-display text-2xl font-black text-arcane-gold">
              ₹500
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full doom-btn-primary py-3.5 px-4 font-mono-tech text-xs uppercase tracking-[0.18em] gap-2 disabled:opacity-50 cursor-pointer flex items-center justify-center rounded-lg"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Saving Team Registration...</span>
              </>
            ) : (
              <>
                <span>Register Team &amp; Proceed to UPI QR Payment</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

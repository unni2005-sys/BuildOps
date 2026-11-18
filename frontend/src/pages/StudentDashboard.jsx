import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE_URL } from '../api/client';
import {
  Ticket,
  CreditCard,
  CheckCircle2,
  Clock,
  Download,
  AlertCircle,
  RefreshCw,
  Users,
  Building2,
  Calendar,
  MapPin,
  Mail,
  Phone,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  QrCode,
  Zap,
} from 'lucide-react';

export const StudentDashboard = () => {
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedRegId, setCopiedRegId] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const teamRes = await api.get('/teams/my-team/');
      const fetchedTeam = teamRes.data.team;

      if (!fetchedTeam) {
        // Automatically open Team Registration if user has no team yet
        navigate('/student/register-team', { replace: true });
        return;
      }

      setTeam(fetchedTeam);
    } catch (err) {
      console.error(err);
      setError('Failed to load your team details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDownloadTicket = async () => {
    if (!team?.ticket_id) return;
    try {
      setDownloading(true);
      const response = await api.get(`/tickets/${team.ticket_id}/download/`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Ticket_${team.registration_id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download ticket error:', err);
      const token = localStorage.getItem('access_token');
      window.open(`${API_BASE_URL}/tickets/${team.ticket_id}/download/?token=${token}`, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'token') {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else if (type === 'regId') {
      setCopiedRegId(true);
      setTimeout(() => setCopiedRegId(false), 2000);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-[#06080e]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <RefreshCw size={20} className="animate-spin text-emerald-400" />
          </div>
          <span className="text-zinc-400 text-xs font-mono-tech tracking-wider uppercase">
            Loading Dashboard...
          </span>
        </div>
      </div>
    );
  }

  if (!team) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-[#06080e] relative text-zinc-100 selection:bg-emerald-500/30 selection:text-white">
      {/* Ambient Lighting Accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-500/[0.06] blur-[140px] rounded-full" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[300px] bg-blue-500/[0.04] blur-[140px] rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        {/* Error Notification */}
        {error && (
          <div className="bg-rose-950/60 border border-rose-500/40 text-rose-200 p-4 rounded-2xl text-xs flex items-center gap-3 shadow-lg">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Dashboard Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Participant Command Center</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
              Squad Portal
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>Build Ops 2026</span>
              <span className="text-zinc-600">•</span>
              <span>12-Hour Buildathon</span>
              <span className="text-zinc-600">•</span>
              <span className="text-emerald-400/90 font-medium">ASIET × TCS</span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {team.payment_status === 'SUCCESS' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Admission Confirmed</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold">
                <Clock size={13} className="text-amber-400" />
                <span>Pending Payment</span>
              </span>
            )}
          </div>
        </div>

        {/* Card 1: Team & Registration Profile */}
        <div className="clean-card rounded-3xl p-6 sm:p-8 border border-white/[0.08] shadow-2xl relative overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent">
          {/* Subtle Top Accent Glow */}
          <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />

          {/* Team Info Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-white/[0.08]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono-tech font-bold text-amber-300 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20 tracking-wider">
                  {team.registration_id}
                </span>
                <button
                  onClick={() => copyToClipboard(team.registration_id, 'regId')}
                  className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/5 transition text-xs flex items-center gap-1 cursor-pointer"
                  title="Copy Registration ID"
                >
                  {copiedRegId ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span className="text-[11px] text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
                {team.team_name}
              </h2>

              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Building2 size={13} className="text-emerald-400 shrink-0" />
                <span className="font-medium text-zinc-300">{team.college_name}</span>
              </div>
            </div>

            {/* Payment Status Block */}
            <div className="flex flex-col sm:items-end gap-2 bg-white/[0.02] sm:bg-transparent p-4 sm:p-0 rounded-2xl border border-white/[0.06] sm:border-0">
              <span className="text-[10px] font-mono-tech uppercase tracking-widest text-zinc-400 font-semibold">
                Payment Verification
              </span>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full border ${
                  team.payment_status === 'SUCCESS'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30 shadow-[0_0_16px_rgba(16,185,129,0.2)]'
                    : 'bg-amber-500/15 text-amber-200 border-amber-400/30'
                }`}
              >
                {team.payment_status === 'SUCCESS' ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>PAID (₹{team.fee_amount || 500})</span>
                  </>
                ) : (
                  <>
                    <Clock size={14} className="text-amber-400" />
                    <span>PAYMENT PENDING</span>
                  </>
                )}
              </span>

              {team.payment_status !== 'SUCCESS' && (
                <button
                  onClick={() => navigate('/student/register-team')}
                  className="mt-2 inline-flex items-center gap-2 btn-primary text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer"
                >
                  <CreditCard size={14} />
                  <span>Complete Payment ₹{team.fee_amount || 500}</span>
                </button>
              )}
            </div>
          </div>

          {/* Squad Members Section */}
          <div className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-display font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <Users size={14} className="text-emerald-400" />
                <span>Squad Operatives (2 Members)</span>
              </h3>
              <span className="text-[11px] text-zinc-400 font-mono-tech">
                Physical IDs Required
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {team.members.map((member) => (
                <div
                  key={member.id}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-emerald-500/30 transition-all duration-300 flex items-start gap-3.5"
                >
                  {/* Member Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-sm shadow-sm">
                    {getInitials(member.full_name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-white text-sm truncate">
                        {member.full_name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border shrink-0 ${
                          member.member_role === 'LEADER'
                            ? 'bg-amber-400/10 text-amber-300 border-amber-400/30'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {member.member_role}
                      </span>
                    </div>

                    <div className="space-y-0.5 text-xs text-zinc-400">
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail size={12} className="text-zinc-400 shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </p>
                      <p className="flex items-center gap-1.5 font-mono-tech text-[11px] text-zinc-400">
                        <Phone size={12} className="text-zinc-400 shrink-0" />
                        <span>{member.mobile_number}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Official E-Ticket & Gate Check-In Pass */}
        <div className="clean-card rounded-3xl p-6 sm:p-8 border border-white/[0.08] shadow-2xl relative overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent">
          {/* Subtle Top Accent Glow */}
          <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />

          {/* Ticket Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <Ticket size={22} />
              </div>
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-white">
                  Official Gate Pass & E-Ticket
                </h2>
                <p className="text-xs text-zinc-400">
                  Single verified QR pass valid for both squad members at check-in
                </p>
              </div>
            </div>

            {team.payment_status === 'SUCCESS' && team.has_ticket && (
              <button
                onClick={handleDownloadTicket}
                disabled={downloading}
                className="inline-flex items-center justify-center gap-2 btn-primary text-xs font-semibold px-5 py-2.5 rounded-xl cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {downloading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Preparing PDF...</span>
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    <span>Download Ticket (PDF)</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Ticket Body */}
          <div className="mt-6">
            {team.payment_status === 'SUCCESS' && team.ticket_id ? (
              <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-white/[0.04] via-emerald-950/[0.1] to-white/[0.02] border border-emerald-500/25 relative overflow-hidden flex flex-col md:flex-row items-center gap-8 shadow-xl">
                {/* Crisp White QR Container (Optimal Optical Camera Scanning) */}
                <div className="bg-white p-3.5 rounded-2xl border-2 border-emerald-400/40 shadow-[0_0_30px_rgba(16,185,129,0.25)] flex flex-col items-center shrink-0">
                  <img
                    src={`${API_BASE_URL}/tickets/${team.ticket_id}/qr/`}
                    alt={`QR Pass for ${team.registration_id}`}
                    className="w-40 h-40 object-contain"
                  />
                  <div className="mt-2 text-center border-t border-slate-200/80 pt-1.5 w-full">
                    <span className="text-[10px] font-mono-tech font-bold text-slate-800 tracking-wider uppercase block">
                      OFFICIAL QR PASS
                    </span>
                    <span className="text-[9px] font-mono-tech text-slate-600 block">
                      ASIET GATE CLEARANCE
                    </span>
                  </div>
                </div>

                {/* Ticket Details & Credential Metadata */}
                <div className="flex-1 space-y-4 text-center md:text-left w-full">
                  <div>
                    <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Verified Admission</span>
                    </span>
                    <h3 className="font-display text-xl sm:text-2xl font-black text-white tracking-tight">
                      BUILD OPS 2026
                    </h3>
                  </div>

                  {/* Metadata Specs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-zinc-300 pt-1">
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <Calendar size={13} className="text-emerald-400 shrink-0" />
                      <span>Dec 8, 2026 • 12-Hour Sprint</span>
                    </div>
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <Clock size={13} className="text-emerald-400 shrink-0" />
                      <span>5:00 PM – 8:00 AM IST</span>
                    </div>
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <MapPin size={13} className="text-emerald-400 shrink-0" />
                      <span>Innovation Arena, ASIET</span>
                    </div>
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <Zap size={13} className="text-emerald-400 shrink-0" />
                      <span>Wi-Fi, Meals & Power Included</span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed pt-1">
                    Present this digital QR pass on your mobile device or bring the downloaded PDF ticket to the registration desk on arrival.
                  </p>

                  {/* Encrypted Token Box */}
                  <div className="pt-2 border-t border-white/[0.08]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono-tech uppercase tracking-wider text-zinc-400 font-semibold">
                        Encrypted Security Token
                      </span>
                      <button
                        onClick={() => copyToClipboard(team.qr_token, 'token')}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-mono-tech flex items-center gap-1 transition cursor-pointer"
                      >
                        {copiedToken ? (
                          <>
                            <Check size={12} className="text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy Token</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 bg-[#04060a] p-2.5 rounded-xl border border-white/[0.08]">
                      <code className="text-xs font-mono-tech text-emerald-300 select-all flex-1 truncate">
                        {team.qr_token}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 px-4 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <Ticket size={24} />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="font-display font-bold text-white text-base">
                    E-Ticket Locked
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Your official E-Ticket and QR clearance pass will generate immediately once your registration fee of ₹{team.fee_amount || 500} is confirmed.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/student/register-team')}
                  className="inline-flex items-center gap-2 btn-primary text-xs font-semibold px-5 py-2.5 rounded-xl cursor-pointer"
                >
                  <CreditCard size={14} />
                  <span>Complete Payment ₹{team.fee_amount || 500}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

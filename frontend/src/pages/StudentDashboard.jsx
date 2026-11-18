import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE_URL } from '../api/client';
import { Tilt3D } from '../components/Tilt3D';
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
    <div className="min-h-[calc(100vh-4rem)] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-[#030504] relative text-[#eef2ee]">
      <div className="max-w-4xl mx-auto space-y-6 relative z-10 animate-fade-in-up">
        {/* Error Notification */}
        {error && (
          <div className="bg-rose-950/60 border border-rose-500/40 text-rose-200 p-4 text-xs flex items-center gap-3">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div>
            <span className="font-mono-tech text-[10px] tracking-[0.24em] text-emerald-400 uppercase block mb-2">
              BUILD OPS 2026 // ASIET × TCS
            </span>
            <h1 className="font-poster text-2xl sm:text-3xl text-[#eef2ee] tracking-tight">
              Team Registration
            </h1>
            <p className="font-mono-tech text-[11px] text-[#8b9b90] mt-1 tracking-wider uppercase">
              DEC 08, 5:00 PM – DEC 09, 9:00 AM, 2026
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {team.payment_status === 'SUCCESS' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 font-mono-tech text-[11px] tracking-wider uppercase">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Confirmed</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0b1510] border border-[#d4b46a]/40 text-[#d4b46a] font-mono-tech text-[11px] tracking-wider uppercase">
                <Clock size={13} />
                <span>Payment Pending</span>
              </span>
            )}
          </div>
        </div>

        {/* Card 1: Team & Members */}
        <div className="doom-surface p-6 sm:p-8 border border-white/[0.1] relative">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/70 via-[#d4b46a]/40 to-transparent" />

          {/* Team Info Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-white/[0.08]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono-tech font-bold text-[#d4b46a] bg-[#0b1510] px-2.5 py-1 border border-[#d4b46a]/35 tracking-wider">
                  {team.registration_id}
                </span>
                <button
                  onClick={() => copyToClipboard(team.registration_id, 'regId')}
                  className="text-[#8b9b90] hover:text-white p-1 transition text-xs flex items-center gap-1 cursor-pointer"
                  title="Copy Registration ID"
                >
                  {copiedRegId ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span className="font-mono-tech text-[10px] text-emerald-400 uppercase">Copied</span>
                    </>
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              </div>

              <h2 className="font-poster text-2xl sm:text-3xl text-[#eef2ee] tracking-tight">
                {team.team_name}
              </h2>

              <div className="flex items-center gap-1.5 text-xs text-[#8b9b90]">
                <Building2 size={13} className="text-emerald-400 shrink-0" />
                <span>{team.college_name}</span>
              </div>
            </div>

            {/* Payment Status Block */}
            <div className="flex flex-col sm:items-end gap-2 bg-[#040705] sm:bg-transparent p-4 sm:p-0 border border-white/[0.08] sm:border-0">
              <span className="text-[10px] font-mono-tech uppercase tracking-widest text-[#8b9b90]">
                Payment Status
              </span>
              <span
                className={`inline-flex items-center gap-1.5 font-mono-tech text-xs font-bold px-3 py-1.5 border ${
                  team.payment_status === 'SUCCESS'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40'
                    : 'bg-[#0b1510] text-[#d4b46a] border-[#d4b46a]/40'
                }`}
              >
                {team.payment_status === 'SUCCESS' ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>PAID • ₹{team.fee_amount || 500}</span>
                  </>
                ) : (
                  <>
                    <Clock size={14} />
                    <span>PENDING • ₹{team.fee_amount || 500}</span>
                  </>
                )}
              </span>

              {team.payment_status !== 'SUCCESS' && (
                <button
                  onClick={() => navigate('/student/register-team')}
                  className="mt-2 inline-flex items-center gap-2 doom-btn-primary font-mono-tech text-xs uppercase tracking-wider px-4 py-2 cursor-pointer"
                >
                  <CreditCard size={14} />
                  <span>Pay ₹{team.fee_amount || 500}</span>
                </button>
              )}
            </div>
          </div>

          {/* Team Members Section */}
          <div className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono-tech text-[11px] font-bold uppercase tracking-[0.18em] text-[#8b9b90] flex items-center gap-2">
                <Users size={13} className="text-emerald-400" />
                <span>Team Members (2)</span>
              </h3>
              <span className="text-[10px] text-[#5a685e] font-mono-tech uppercase tracking-wider">
                College ID Mandatory
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {team.members.map((member) => (
                <div
                  key={member.id}
                  className="p-4 bg-[#040705] border border-white/[0.08] hover:border-emerald-500/35 transition-colors flex items-start gap-3.5"
                >
                  <div className="w-10 h-10 bg-[#0b1510] border border-emerald-500/35 text-emerald-300 font-mono-tech font-bold flex items-center justify-center shrink-0 text-xs">
                    {getInitials(member.full_name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-[#eef2ee] text-sm truncate">
                        {member.full_name}
                      </span>
                      <span
                        className={`font-mono-tech text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider border shrink-0 ${
                          member.member_role === 'LEADER'
                            ? 'bg-[#0b1510] text-[#d4b46a] border-[#d4b46a]/40'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {member.member_role}
                      </span>
                    </div>

                    <div className="space-y-0.5 text-xs text-[#8b9b90]">
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail size={12} className="shrink-0 text-[#5a685e]" />
                        <span className="truncate">{member.email}</span>
                      </p>
                      <p className="flex items-center gap-1.5 font-mono-tech text-[11px] text-emerald-300/80">
                        <Phone size={12} className="shrink-0 text-[#5a685e]" />
                        <span>{member.mobile_number}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Official Doomsday Concert Gate Pass */}
        <div className="doom-surface p-6 sm:p-8 border border-white/[0.1] relative">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/70 via-[#d4b46a]/40 to-transparent" />

          {/* Ticket Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 flex items-center justify-center">
                <Ticket size={19} />
              </div>
              <div>
                <h2 className="font-poster text-lg sm:text-xl text-[#eef2ee] tracking-tight">
                  Official Gate Pass
                </h2>
                <p className="font-mono-tech text-[11px] text-[#8b9b90]">
                  Single QR pass valid for both team members at entry
                </p>
              </div>
            </div>

            {team.payment_status === 'SUCCESS' && team.has_ticket && (
              <button
                onClick={handleDownloadTicket}
                disabled={downloading}
                className="inline-flex items-center justify-center gap-2 doom-btn-primary font-mono-tech text-xs uppercase tracking-wider px-5 py-2.5 cursor-pointer disabled:opacity-50"
              >
                {downloading ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Preparing PDF</span>
                  </>
                ) : (
                  <>
                    <Download size={13} />
                    <span>Download PDF Pass</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Ticket Body — Doomsday Collector's Concert Pass (3D Interactive) */}
          <div className="mt-6">
            {team.payment_status === 'SUCCESS' && team.ticket_id ? (
              <Tilt3D maxTilt={5} perspective={1200}>
                <div className="relative bg-[#040806] border border-emerald-500/50 shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden">
                {/* Inner fine metallic gold hairline */}
                <div className="pointer-events-none absolute inset-[3px] border border-[#d4b46a]/40 z-20" />

                {/* Subtle blueprint grid texture */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, rgba(16,185,129,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,0.12) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                  }}
                />

                <div className="relative z-10 flex flex-col md:flex-row">
                  {/* Left Vertical Spine (Desktop) */}
                  <div className="hidden md:flex w-8 shrink-0 bg-[#0a1d14] border-r border-emerald-500/30 items-center justify-center py-4">
                    <span className="font-mono-tech text-[9px] font-bold tracking-[0.22em] text-[#d4b46a] uppercase whitespace-nowrap -rotate-90 select-none">
                      BUILD OPS 2026 // ASIET × TCS // {team.registration_id}
                    </span>
                  </div>

                  {/* Main Ticket Body (Left) */}
                  <div className="flex-1 p-5 sm:p-7 flex flex-col justify-between gap-5">
                    {/* Top Eyebrow + VIP Stamp */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono-tech text-[10px] font-bold tracking-[0.18em] text-[#d4b46a] uppercase">
                        Dept. of Computer Applications • ASIET × TCS
                      </span>
                      <span className="inline-flex items-center gap-1.5 bg-[#082317] border border-emerald-500/70 px-2.5 py-1 font-mono-tech text-[10px] font-bold tracking-widest text-emerald-300 uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        VIP PASS • ADMIT 02
                      </span>
                    </div>

                    {/* Monumental Poster Title */}
                    <div>
                      <h3
                        className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase leading-none"
                        style={{
                          fontFamily: "'PosterTitle', 'Arvo', serif",
                          textShadow: '2px 2px 0px #064e3b',
                        }}
                      >
                        BUILD OPS
                      </h3>
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                        <span className="font-mono-tech text-[10px] sm:text-[11px] font-bold tracking-[0.16em] text-emerald-400 uppercase">
                          Official 12-Hour Buildathon Entry Pass
                        </span>
                        <span className="font-mono-tech text-[10px] sm:text-[11px] font-bold tracking-wider text-[#f3d58d]">
                          FEE PAID: ₹{team.fee_amount || 500}
                        </span>
                      </div>
                      <div className="mt-2.5 flex h-[2px] w-full">
                        <div className="w-2/3 bg-emerald-500" />
                        <div className="w-1/3 bg-[#d4b46a]/80 ml-1" />
                      </div>
                    </div>

                    {/* Event Specs Columns */}
                    <div className="grid grid-cols-3 gap-3 py-3 border-y border-emerald-500/20 text-left">
                      <div>
                        <span className="block font-mono-tech text-[9px] tracking-widest text-[#d4b46a] uppercase">
                          Event Date
                        </span>
                        <span className="block text-xs font-bold text-white mt-0.5">
                          DEC 08 – 09, 2026
                        </span>
                      </div>
                      <div className="border-l border-emerald-500/20 pl-3">
                        <span className="block font-mono-tech text-[9px] tracking-widest text-[#d4b46a] uppercase">
                          Window
                        </span>
                        <span className="block text-xs font-bold text-white mt-0.5">
                          5:00 PM – 9:00 AM
                        </span>
                      </div>
                      <div className="border-l border-emerald-500/20 pl-3">
                        <span className="block font-mono-tech text-[9px] tracking-widest text-[#d4b46a] uppercase">
                          Venue
                        </span>
                        <span className="block text-xs font-bold text-white mt-0.5">
                          ASIET Campus
                        </span>
                      </div>
                    </div>

                    {/* Squad Name + Reg ID */}
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <span className="block font-mono-tech text-[9px] tracking-widest text-emerald-400 uppercase">
                          Registered Squad
                        </span>
                        <span
                          className="block text-lg sm:text-xl font-bold text-white uppercase tracking-tight"
                          style={{ fontFamily: "'PosterTitle', 'Arvo', serif" }}
                        >
                          {team.team_name}
                        </span>
                        <span className="block text-[11px] text-zinc-400 mt-0.5">
                          {team.college_name}
                        </span>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="block font-mono-tech text-[9px] tracking-widest text-[#d4b46a] uppercase">
                          Registration ID
                        </span>
                        <span className="block font-mono-tech text-sm sm:text-base font-bold text-[#f3d58d] tracking-wider">
                          {team.registration_id}
                        </span>
                      </div>
                    </div>

                    {/* Compact Operatives Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {team.members.map((member, idx) => (
                        <div
                          key={member.id}
                          className={`bg-[#0b1510] border border-emerald-500/20 px-3 py-2 border-l-2 ${
                            member.member_role === 'LEADER'
                              ? 'border-l-emerald-400'
                              : 'border-l-[#d4b46a]'
                          }`}
                        >
                          <span
                            className={`block font-mono-tech text-[9px] font-bold tracking-wider uppercase ${
                              member.member_role === 'LEADER'
                                ? 'text-[#f3d58d]'
                                : 'text-emerald-400'
                            }`}
                          >
                            0{idx + 1} // {member.member_role === 'LEADER' ? 'TEAM LEADER' : 'TEAM MEMBER'}
                          </span>
                          <span className="block text-xs font-bold text-white truncate mt-0.5">
                            {member.full_name}
                          </span>
                          <span className="block font-mono-tech text-[10px] text-emerald-300/80 truncate">
                            {member.mobile_number}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Status Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] font-mono-tech">
                      <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold tracking-wider uppercase">
                        <span className="w-2 h-2 bg-emerald-400 inline-block" />
                        CONFIRMED &amp; PAID
                      </span>
                      <span className="text-zinc-500 uppercase tracking-wider">
                        Carry Valid College Photo ID
                      </span>
                    </div>
                  </div>

                  {/* Perforation Tear-Off Divider with Concert Ticket Semicircular Notches */}
                  <div className="relative flex md:flex-col items-center justify-center shrink-0">
                    {/* Mobile horizontal dashed divider + left/right notches */}
                    <div className="w-full h-px border-t-2 border-dashed border-[#d4b46a]/60 md:hidden" />
                    <div className="hidden md:block h-full w-px border-l-2 border-dashed border-[#d4b46a]/60" />

                    {/* Top & Bottom Semicircular Cutouts on Desktop */}
                    <div className="hidden md:block absolute -top-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#090d16] border border-emerald-500/50 z-30" />
                    <div className="hidden md:block absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#090d16] border border-emerald-500/50 z-30" />

                    {/* Left & Right Semicircular Cutouts on Mobile */}
                    <div className="md:hidden absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#090d16] border border-emerald-500/50 z-30" />
                    <div className="md:hidden absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#090d16] border border-emerald-500/50 z-30" />
                  </div>

                  {/* Right Tear-Off QR Stub */}
                  <div className="md:w-64 shrink-0 bg-[#050a08] p-5 sm:p-6 flex flex-col items-center justify-between text-center gap-3.5">
                    <div>
                      <span className="block font-mono-tech text-[10px] font-bold tracking-[0.2em] text-[#d4b46a] uppercase">
                        Gate Scan Stub
                      </span>
                      <span className="block font-mono-tech text-[9px] text-emerald-400/90 uppercase mt-0.5">
                        Present at Entry Desk
                      </span>
                    </div>

                    {/* High-Contrast QR Code with Tactical Gold Corner Brackets */}
                    <div className="relative p-1.5">
                      <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#d4b46a]" />
                      <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#d4b46a]" />
                      <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#d4b46a]" />
                      <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#d4b46a]" />
                      <div className="bg-white p-2 border border-emerald-500">
                        <img
                          src={`${API_BASE_URL}/tickets/${team.ticket_id}/qr/`}
                          alt={`QR Pass for ${team.registration_id}`}
                          className="w-36 h-36 object-contain"
                        />
                      </div>
                    </div>

                    {/* Registration ID & Copyable Security Token */}
                    <div className="w-full space-y-2">
                      <span className="block font-mono-tech text-xs font-bold text-white tracking-widest">
                        {team.registration_id}
                      </span>

                      <div className="flex items-center gap-1.5 bg-[#030605] border border-emerald-500/25 px-2.5 py-1.5">
                        <code className="text-[10px] font-mono-tech text-emerald-300 select-all flex-1 truncate">
                          {team.qr_token}
                        </code>
                        <button
                          onClick={() => copyToClipboard(team.qr_token, 'token')}
                          className="text-emerald-400 hover:text-[#f3d58d] transition shrink-0 cursor-pointer"
                          title="Copy Security Token"
                        >
                          {copiedToken ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>

                      {/* Decorative Concert Barcode Strip */}
                      <div className="flex items-stretch justify-center gap-[2px] h-5 pt-1 opacity-75">
                        {Array.from({ length: 34 }).map((_, i) => (
                          <span
                            key={i}
                            className={`inline-block ${
                              i % 9 === 0 ? 'bg-emerald-400' : 'bg-zinc-400'
                            }`}
                            style={{
                              width: ((i * 7 + (team.registration_id?.charCodeAt(i % team.registration_id.length) || 3)) % 3 === 0) ? '3px' : '1.5px',
                            }}
                          />
                        ))}
                      </div>

                      <span className="block font-mono-tech text-[9px] font-bold tracking-[0.16em] text-[#d4b46a] uppercase">
                        Admit Two • Dec 08–09 2026
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              </Tilt3D>
            ) : (
              <div className="py-12 px-4 text-center bg-[#040705] border border-white/[0.08] space-y-4">
                <div className="w-11 h-11 bg-[#0b1510] border border-[#d4b46a]/40 text-[#d4b46a] flex items-center justify-center mx-auto">
                  <Ticket size={20} />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="font-poster text-[#eef2ee] text-base">
                    Gate Pass Locked
                  </h3>
                  <p className="text-xs text-[#8b9b90]">
                    Your official QR gate pass will unlock immediately after completing the ₹{team.fee_amount || 500} registration fee.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/student/register-team')}
                  className="inline-flex items-center gap-2 doom-btn-primary font-mono-tech text-xs uppercase tracking-wider px-5 py-2.5 cursor-pointer"
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

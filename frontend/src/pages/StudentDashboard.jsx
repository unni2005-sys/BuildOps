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
  RefreshCw
} from 'lucide-react';

export const StudentDashboard = () => {
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
        <div className="flex items-center gap-2.5 text-emerald-300 text-xs font-display tracking-widest uppercase">
          <RefreshCw size={16} className="animate-spin text-emerald-400" />
          <span>Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  if (!team) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
        {error && (
          <div className="bg-rose-950/60 border border-rose-500/40 text-rose-200 p-3 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Team Details & Payment Status Card */}
        <div className="doom-card rounded-xl p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-emerald-500/20">
            <div>
              <span className="text-[11px] font-mono-tech font-bold text-amber-200 bg-amber-400/10 px-2.5 py-1 rounded border border-amber-300/35 tracking-wider">
                {team.registration_id}
              </span>
              <h1 className="font-display text-2xl font-bold tracking-wider text-buildops uppercase mt-2.5">
                {team.team_name}
              </h1>
              <p className="text-xs text-emerald-200/70 mt-0.5">{team.college_name}</p>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <span className="text-[10px] font-display font-semibold uppercase tracking-[0.2em] text-emerald-200/55">
                Payment Status
              </span>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full border ${
                  team.payment_status === 'SUCCESS'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/45 shadow-[0_0_14px_rgba(34,255,102,0.2)]'
                    : 'bg-amber-500/15 text-amber-200 border-amber-400/40'
                }`}
              >
                {team.payment_status === 'SUCCESS' ? (
                  <>
                    <CheckCircle2 size={14} /> PAID (₹{team.fee_amount || 500})
                  </>
                ) : (
                  <>
                    <Clock size={14} /> PAYMENT PENDING
                  </>
                )}
              </span>

              {team.payment_status !== 'SUCCESS' && (
                <button
                  onClick={() => navigate('/student/register-team')}
                  className="mt-1 inline-flex items-center gap-1.5 doom-btn-primary text-xs font-display tracking-wider uppercase px-4 py-2 rounded-lg cursor-pointer"
                >
                  <CreditCard size={14} /> Confirm & Pay ₹{team.fee_amount || 500}
                </button>
              )}
            </div>
          </div>

          {/* Team Members */}
          <div className="pt-5">
            <h2 className="text-[11px] font-display font-bold uppercase tracking-[0.2em] text-amber-200/85 mb-3.5">
              Team Members
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {team.members.map((member) => (
                <div
                  key={member.id}
                  className="p-4 rounded-lg doom-panel hover:border-emerald-400/40 transition"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-emerald-50 text-sm">{member.full_name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                        member.member_role === 'LEADER'
                          ? 'bg-amber-400/15 text-amber-200 border-amber-300/35'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                      }`}
                    >
                      {member.member_role}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/75">{member.email}</p>
                  <p className="text-xs font-mono-tech text-emerald-300/80 mt-0.5">{member.mobile_number}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* E-Ticket Preview Card */}
        <div className="doom-card rounded-xl p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 flex items-center justify-center shadow-[0_0_16px_rgba(34,255,102,0.2)]">
                <Ticket size={21} />
              </div>
              <div>
                <h2 className="font-display text-base font-bold tracking-wider text-emerald-50 uppercase">
                  Official E-Ticket
                </h2>
                <p className="text-xs text-emerald-200/65">
                  Valid for both team members at Build Ops gate check-in
                </p>
              </div>
            </div>

            {team.payment_status === 'SUCCESS' && team.has_ticket && (
              <button
                onClick={handleDownloadTicket}
                className="flex items-center justify-center gap-1.5 doom-btn-primary text-xs font-display tracking-wider uppercase px-4 py-2.5 rounded-lg cursor-pointer"
              >
                <Download size={14} /> Download Ticket (PDF)
              </button>
            )}
          </div>

          <div className="mt-5">
            {team.payment_status === 'SUCCESS' && team.ticket_id ? (
              <div className="doom-panel rounded-xl p-5 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
                {/* Crisp White QR Box (100% Scannable Contrast) */}
                <div className="bg-white p-3 rounded-lg border-2 border-emerald-400/60 shadow-[0_0_25px_rgba(34,255,102,0.28)] flex flex-col items-center shrink-0">
                  <img
                    src={`${API_BASE_URL}/tickets/${team.ticket_id}/qr/`}
                    alt={`QR Code for ${team.registration_id}`}
                    className="w-40 h-40 object-contain"
                  />
                  <span className="text-[10px] font-mono-tech font-bold text-slate-800 mt-1.5 uppercase tracking-widest">
                    Entry QR Pass
                  </span>
                </div>

                {/* Ticket Summary */}
                <div className="flex-1 space-y-2.5 text-center sm:text-left">
                  <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-300 border border-emerald-400/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    <CheckCircle2 size={12} /> Confirmed Pass
                  </span>
                  <h3 className="font-display text-base font-bold tracking-wider text-arcane-gold uppercase">
                    Build Ops • Dec 8–9, 2026
                  </h3>
                  <p className="text-xs text-emerald-100/75 leading-relaxed">
                    Present this QR pass at the ASIET registration desk on event day. One pass covers both registered participants.
                  </p>
                  <div className="pt-1">
                    <span className="text-[10px] font-display uppercase tracking-widest text-emerald-200/55 block mb-1">
                      Secure Ticket Token
                    </span>
                    <code className="text-xs font-mono-tech bg-[#040a07] px-3 py-1.5 rounded-md border border-emerald-500/30 text-emerald-300 select-all inline-block break-all">
                      {team.qr_token}
                    </code>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-xs text-emerald-200/60">
                  Your E-Ticket and QR code will unlock automatically once your ₹{team.fee_amount || 500} payment is confirmed.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

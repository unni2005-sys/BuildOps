import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
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
      window.open(`/api/tickets/${team.ticket_id}/download/?token=${token}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex items-center gap-2 text-slate-600 text-sm">
          <RefreshCw size={18} className="animate-spin text-teal-600" />
          <span>Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  if (!team) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-md text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Team Details & Payment Status Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <span className="text-[11px] font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {team.registration_id}
              </span>
              <h1 className="text-xl font-bold text-slate-900 mt-2">{team.team_name}</h1>
              <p className="text-xs text-slate-500 mt-0.5">{team.college_name}</p>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Payment Status
              </span>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                  team.payment_status === 'SUCCESS'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
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
                  className="mt-1 inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-xs transition cursor-pointer"
                >
                  <CreditCard size={14} /> Confirm & Pay ₹{team.fee_amount || 500}
                </button>
              )}
            </div>
          </div>

          {/* Team Members */}
          <div className="pt-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Team Members
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {team.members.map((member) => (
                <div
                  key={member.id}
                  className="p-4 rounded-md border border-slate-200 bg-slate-50/70"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-slate-900 text-sm">{member.full_name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                      {member.member_role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{member.email}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{member.mobile_number}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* E-Ticket Preview Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                <Ticket size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Your E-Ticket</h2>
                <p className="text-xs text-slate-500">Valid for both team members at Build Ops check-in</p>
              </div>
            </div>

            {team.payment_status === 'SUCCESS' && team.has_ticket && (
              <button
                onClick={handleDownloadTicket}
                className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-xs transition cursor-pointer"
              >
                <Download size={14} /> Download Ticket (PDF)
              </button>
            )}
          </div>

          <div className="mt-5">
            {team.payment_status === 'SUCCESS' && team.ticket_id ? (
              <div className="bg-slate-50 rounded-lg p-5 border border-slate-200 flex flex-col sm:flex-row items-center gap-6">
                {/* Visual QR Code Preview */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col items-center shrink-0">
                  <img
                    src={`/api/tickets/${team.ticket_id}/qr/`}
                    alt={`QR Code for ${team.registration_id}`}
                    className="w-40 h-40 object-contain"
                  />
                  <span className="text-[10px] font-mono font-bold text-slate-500 mt-1.5 uppercase tracking-wider">
                    Entry QR Pass
                  </span>
                </div>

                {/* Ticket Summary */}
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 size={12} /> Confirmed Pass
                  </span>
                  <h3 className="text-base font-bold text-slate-900">Build Ops — December 8–9, 2026</h3>
                  <p className="text-xs text-slate-600">
                    Show this QR code at the registration desk on event day. One ticket covers both team members.
                  </p>
                  <div className="pt-1">
                    <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">
                      Ticket Token
                    </span>
                    <code className="text-xs font-mono bg-white px-2.5 py-1 rounded border border-slate-300 text-slate-800 select-all inline-block break-all">
                      {team.qr_token}
                    </code>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-xs text-slate-500">
                  Your E-Ticket and QR code will appear here automatically as soon as your ₹{team.fee_amount || 500} payment is completed.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Users,
  Ticket,
  Award,
  CreditCard,
  CheckCircle2,
  Clock,
  Download,
  AlertCircle,
  ExternalLink,
  QrCode,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [certificateData, setCertificateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentModal, setPaymentModal] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const teamRes = await api.get('/teams/my-team/');
      setTeam(teamRes.data.team);

      if (teamRes.data.team) {
        // Also check certificate status
        try {
          const certRes = await api.get('/certificates/my-certificate/');
          setCertificateData(certRes.data);
        } catch (certErr) {
          // Normal if not arrived yet
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch team details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleInitiatePayment = async () => {
    setActionLoading(true);
    setError('');
    try {
      const returnUrl = `${window.location.origin}/payment-status`;
      const res = await api.post('/payments/create-order/', { return_url: returnUrl });
      const order = res.data;

      setPaymentModal(order);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Unable to initiate payment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulatePayment = async (orderId) => {
    setActionLoading(true);
    try {
      await api.post('/payments/simulate/', { order_id: orderId });
      setPaymentModal(null);
      await fetchDashboardData();
    } catch (err) {
      console.error(err);
      setError('Payment simulation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadTicket = () => {
    if (!team?.ticket_id) return;
    window.open(`/api/tickets/${team.ticket_id}/download/`, '_blank');
  };

  const handleDownloadCertificate = () => {
    if (!certificateData?.download_url) return;
    window.open(certificateData.download_url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex items-center gap-2 text-slate-600 text-sm">
          <RefreshCw size={18} className="animate-spin text-teal-600" />
          <span>Loading student dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Welcome, {user?.full_name}</h1>
              <span className="bg-teal-100 text-teal-800 text-[11px] font-bold px-2 py-0.5 rounded uppercase">
                Student Account
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Email: <strong className="text-slate-700">{user?.email}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboardData}
              className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md border border-slate-300 font-medium transition"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-md text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* If no team registered yet */}
        {!team ? (
          <div className="bg-white rounded-lg border border-slate-200 p-10 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-4">
              <Users size={28} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">No Registered Team Found</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
              You are not registered in any team yet. Register your team of two participants to generate registration credentials, digital tickets, and enter Build Ops.
            </p>
            <Link
              to="/student/register-team"
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm px-5 py-2.5 rounded-md shadow-sm transition"
            >
              <Users size={16} /> Register Team Now
            </Link>
          </div>
        ) : (
          /* Team Dashboard Content */
          <div className="space-y-6">
            {/* Status Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Registration ID</p>
                <p className="text-lg font-mono font-bold text-slate-900">{team.registration_id}</p>
                <p className="text-xs text-slate-500 mt-1">Status: <strong className="text-slate-800">{team.registration_status}</strong></p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Payment Status</p>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-sm font-bold px-2 py-0.5 rounded ${
                      team.payment_status === 'SUCCESS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {team.payment_status === 'SUCCESS' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                    {team.payment_status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Fee: INR {team.fee_amount || 500}</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Venue Attendance</p>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-sm font-bold px-2 py-0.5 rounded ${
                      team.attendance_status === 'ARRIVED'
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {team.attendance_status === 'ARRIVED' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                    {team.attendance_status === 'ARRIVED' ? 'ARRIVED & CHECKED IN' : 'NOT YET ARRIVED'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {team.arrival_timestamp
                    ? `Checked in: ${new Date(team.arrival_timestamp).toLocaleTimeString()}`
                    : 'Check-in opens on event day'}
                </p>
              </div>
            </div>

            {/* Team Details & Members */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{team.team_name}</h2>
                  <p className="text-xs text-slate-500">{team.college_name}</p>
                </div>
                <div className="text-xs text-slate-400">
                  Registered on: {new Date(team.created_at).toLocaleDateString()}
                </div>
              </div>

              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                Team Members (2 Participants)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {team.members.map((member) => (
                  <div
                    key={member.id}
                    className="p-3.5 rounded-md border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-800 text-sm">{member.full_name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded">
                          {member.member_role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">Email: {member.email}</p>
                      <p className="text-xs text-slate-600">Mobile: {member.mobile_number}</p>
                    </div>

                    {member.has_certificate && (
                      <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-[11px] text-teal-700 font-medium">Certificate Ready</span>
                        <span className="text-[10px] font-mono text-slate-500">{member.certificate_id}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Section (If Pending) */}
            {team.payment_status === 'PENDING' && (
              <div className="bg-amber-50 rounded-lg border border-amber-200 p-6">
                <div className="flex items-start gap-3">
                  <CreditCard size={22} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-amber-900">Payment Required to Confirm Registration</h3>
                    <p className="text-xs text-amber-800 mt-1 max-w-xl">
                      A one-time registration fee of <strong>INR {team.fee_amount || 500}</strong> is required to confirm your team's entry and generate your digital E-Ticket.
                    </p>
                    <div className="mt-4">
                      <button
                        onClick={handleInitiatePayment}
                        disabled={actionLoading}
                        className="bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs px-4 py-2.5 rounded-md shadow-sm transition disabled:opacity-50"
                      >
                        {actionLoading ? 'Initiating Gateway...' : `Proceed to Pay INR ${team.fee_amount || 500}`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* E-Ticket Card */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Ticket size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Official Team E-Ticket</h3>
                    <p className="text-xs text-slate-500">One digital ticket covers both registered team members.</p>
                  </div>
                </div>

                {team.payment_status === 'SUCCESS' && team.has_ticket && (
                  <button
                    onClick={handleDownloadTicket}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-sm transition"
                  >
                    <Download size={14} /> Download Ticket (PDF)
                  </button>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200">
                {team.payment_status === 'SUCCESS' ? (
                  <div className="bg-blue-50/60 rounded-md p-4 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-blue-900">Secure QR Token:</p>
                      <code className="text-slate-800 font-mono text-xs">{team.qr_token || 'Generated'}</code>
                    </div>
                    <p className="text-blue-800 text-[11px] max-w-sm">
                      Please carry a digital or printed copy of this PDF to the entrance on December 8, 2026 for gate QR scanning.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Ticket PDF with QR code will be generated immediately once payment is completed.
                  </p>
                )}
              </div>
            </div>

            {/* Participation Certificate Card */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Award size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Individual Participation Certificate</h3>
                    <p className="text-xs text-slate-500">
                      Personalized verified participation certificate issued to each team member.
                    </p>
                  </div>
                </div>

                {certificateData?.is_available && (
                  <button
                    onClick={handleDownloadCertificate}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-sm transition"
                  >
                    <Download size={14} /> Download My Certificate (PDF)
                  </button>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 text-xs">
                {certificateData?.is_available ? (
                  <div className="bg-emerald-50/60 rounded-md p-4 border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-emerald-900">Certificate ID: {certificateData.certificate_id}</p>
                      <p className="text-slate-700 text-[11px] mt-0.5">Participant: {certificateData.participant_name}</p>
                    </div>
                    <p className="text-emerald-800 text-[11px]">
                      Verified certificate generated following confirmed event arrival.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Certificates are automatically generated and unlocked once your team completes physical check-in at the venue registration desk.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal / Simulation Dialog */}
        {paymentModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-900">Cashfree Checkout</h3>
                <button
                  onClick={() => setPaymentModal(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs mb-6">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Order ID:</span>
                  <span className="font-mono font-medium text-slate-800">{paymentModal.order_id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-bold text-slate-900 text-sm">INR {paymentModal.amount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Environment:</span>
                  <span className="font-semibold text-teal-700">{paymentModal.environment}</span>
                </div>
              </div>

              {paymentModal.is_mock ? (
                <div className="bg-teal-50 border border-teal-200 p-4 rounded-md text-xs mb-4">
                  <p className="font-bold text-teal-900 mb-1">Sandbox / Test Mode Active</p>
                  <p className="text-teal-800 mb-3">
                    Click the button below to simulate an immediate successful payment verification callback.
                  </p>
                  <button
                    onClick={() => handleSimulatePayment(paymentModal.order_id)}
                    disabled={actionLoading}
                    className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 rounded text-xs transition"
                  >
                    {actionLoading ? 'Processing...' : 'Simulate Successful Payment'}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-600 mb-4">
                  Session ID: <code className="font-mono text-[10px]">{paymentModal.payment_session_id}</code>
                </p>
              )}

              <button
                onClick={() => setPaymentModal(null)}
                className="w-full border border-slate-300 text-slate-700 hover:bg-slate-100 py-2 rounded text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

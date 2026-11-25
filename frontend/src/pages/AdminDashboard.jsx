import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { API_BASE_URL } from '../api/client';
import {
  Users,
  CreditCard,
  CheckCircle2,
  Clock,
  QrCode,
  Download,
  Search,
  Filter,
  FileSpreadsheet,
  Mail,
  RefreshCw,
  AlertCircle,
  Eye,
  ShieldCheck,
  Send,
  Trash2,
  AlertTriangle,
  UserCheck,
  UserX,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [teams, setTeams] = useState([]);
  const [payments, setPayments] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('');

  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [proofReviewTeam, setProofReviewTeam] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [proofActionLoading, setProofActionLoading] = useState(false);

  const handleApprovePayment = async (teamId) => {
    setProofActionLoading(true);
    try {
      const res = await api.post(`/payments/admin/approve/${teamId}/`);
      setActionMsg(res.data.message || 'Payment approved! Digital tickets & WhatsApp group link sent.');
      setTimeout(() => setActionMsg(''), 5000);
      setProofReviewTeam(null);
      setSelectedTeam(null);
      await Promise.all([fetchTeams(), fetchStats(), fetchPayments()]);
    } catch (err) {
      console.error(err);
      setActionMsg(err.response?.data?.error || 'Failed to approve payment.');
      setTimeout(() => setActionMsg(''), 5000);
    } finally {
      setProofActionLoading(false);
    }
  };

  const handleRejectPayment = async (teamId) => {
    setProofActionLoading(true);
    try {
      const res = await api.post(`/payments/admin/reject/${teamId}/`, {
        reason: rejectionReason.trim(),
      });
      setActionMsg(res.data.message || 'Payment proof rejected.');
      setTimeout(() => setActionMsg(''), 5000);
      setProofReviewTeam(null);
      setSelectedTeam(null);
      setRejectionReason('');
      await Promise.all([fetchTeams(), fetchStats(), fetchPayments()]);
    } catch (err) {
      console.error(err);
      setActionMsg(err.response?.data?.error || 'Failed to reject payment.');
      setTimeout(() => setActionMsg(''), 5000);
    } finally {
      setProofActionLoading(false);
    }
  };
  const [actionMsg, setActionMsg] = useState('');

  const fetchStats = async () => {
    try {
      const res = await api.get('/teams/admin/stats/');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTeams = async () => {
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (paymentFilter) params.payment_status = paymentFilter;
      if (attendanceFilter) params.attendance_status = attendanceFilter;

      const res = await api.get('/teams/admin/all/', { params });
      setTeams(res.data.teams || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch teams.');
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await api.get('/payments/admin/all/');
      setPayments(res.data.payments || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEmailLogs = async () => {
    try {
      const res = await api.get('/notifications/admin/logs/');
      setEmailLogs(res.data.logs || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const params = {};
      if (userSearchQuery) params.search = userSearchQuery;
      if (userRoleFilter) params.role = userRoleFilter;
      const res = await api.get('/accounts/admin/users/', { params });
      setUsers(res.data.users || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchTeams(), fetchPayments(), fetchEmailLogs(), fetchUsers()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [searchQuery, paymentFilter, attendanceFilter]);

  useEffect(() => {
    fetchUsers();
  }, [userSearchQuery, userRoleFilter]);

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await api.delete(`/accounts/admin/users/${userToDelete.id}/`);
      setActionMsg(res.data.message || 'User account successfully deleted from database.');
      setTimeout(() => setActionMsg(''), 4000);
      setUserToDelete(null);
      await Promise.all([fetchUsers(), fetchTeams(), fetchStats()]);
    } catch (err) {
      console.error(err);
      setActionMsg(err.response?.data?.error || 'Failed to delete user account.');
      setTimeout(() => setActionMsg(''), 4000);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownloadTicket = async (ticketId, regId) => {
    if (!ticketId) return;
    try {
      const res = await api.get(`/tickets/${ticketId}/download/`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'image/png' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BuildOps_Pass_${regId || ticketId}.png`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      const token = localStorage.getItem('access_token');
      window.open(`${API_BASE_URL}/tickets/${ticketId}/download/?token=${token}`, '_blank');
    }
  };

  const handleDownloadReport = async (endpoint, filename) => {
    try {
      const res = await api.get(endpoint, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      const token = localStorage.getItem('access_token');
      window.open(`${API_BASE_URL}${endpoint}?token=${token}`, '_blank');
    }
  };

  const handleResendTicketEmail = async (ticketId) => {
    if (!ticketId) return;
    try {
      setActionMsg('Resending ticket email...');
      const res = await api.post(`/tickets/admin/${ticketId}/resend-email/`);
      setActionMsg(res.data.message || 'Ticket email resent successfully.');
      setTimeout(() => setActionMsg(''), 4000);
      fetchEmailLogs();
    } catch (err) {
      setActionMsg('Failed to resend ticket email.');
    }
  };

  const handleRetryEmail = async (logId) => {
    try {
      setActionMsg('Retrying email delivery...');
      const res = await api.post(`/notifications/admin/retry/${logId}/`);
      setActionMsg(res.data.message || 'Retry sent.');
      setTimeout(() => setActionMsg(''), 4000);
      fetchEmailLogs();
    } catch (err) {
      setActionMsg('Email retry failed.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="doom-card rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={24} className="text-emerald-400" />
              <h1 className="font-display text-lg sm:text-xl font-bold tracking-wider text-buildops uppercase">
                Admin Command Center
              </h1>
            </div>
            <p className="text-xs text-amber-200/75 font-imperial tracking-[0.2em] uppercase mt-1">
              Build Ops • Event Management, Attendance & Verification
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/admin/scanner"
              className="flex items-center gap-1.5 doom-btn-primary font-display tracking-wider uppercase text-xs px-4 py-2 rounded-lg"
            >
              <QrCode size={15} /> Open QR Scanner
            </Link>
            <button
              onClick={loadAll}
              className="flex items-center gap-1.5 doom-btn-secondary font-semibold text-xs px-3 py-2 rounded-lg cursor-pointer"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {actionMsg && (
          <div className="bg-emerald-950/75 border border-emerald-400/40 text-emerald-200 p-3 rounded-lg text-xs font-semibold shadow-[0_0_18px_rgba(34,255,102,0.12)]">
            {actionMsg}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-emerald-500/20 flex flex-wrap gap-3 sm:gap-5 text-[11px] font-display font-bold uppercase tracking-wider text-emerald-200/55">
          {[
            { id: 'overview', label: 'Overview & Metrics' },
            { id: 'teams', label: `Teams (${teams.length})` },
            { id: 'payments', label: `Transactions (${payments.length})` },
            { id: 'users', label: `Users & Accounts (${users.length})` },
            { id: 'reports', label: 'CSV Reports' },
            { id: 'emails', label: `Email Logs (${emailLogs.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1.5 border-b-2 transition cursor-pointer ${
                activeTab === tab.id
                  ? 'border-emerald-400 text-amber-200 drop-shadow-[0_0_8px_rgba(254,243,199,0.35)]'
                  : 'border-transparent hover:text-emerald-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW & METRICS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="doom-card p-4 rounded-xl">
                <p className="text-[10px] font-display font-semibold text-emerald-200/60 uppercase tracking-wider">Total Teams</p>
                <p className="text-2xl font-display font-black text-emerald-50 mt-1">{stats?.total_teams ?? 0}</p>
              </div>

              <div className="doom-card p-4 rounded-xl">
                <p className="text-[10px] font-display font-semibold text-emerald-200/60 uppercase tracking-wider">Participants</p>
                <p className="text-2xl font-display font-black text-emerald-50 mt-1">{stats?.total_participants ?? 0}</p>
              </div>

              <div className="doom-card p-4 rounded-xl">
                <p className="text-[10px] font-display font-semibold text-emerald-400 uppercase tracking-wider">Paid Teams</p>
                <p className="text-2xl font-display font-black text-emerald-glow mt-1">{stats?.successful_payments ?? 0}</p>
              </div>

              <div
                onClick={() => { setPaymentFilter('VERIFICATION_PENDING'); setActiveTab('teams'); }}
                className="doom-card p-4 rounded-xl border border-amber-500/40 bg-amber-950/20 cursor-pointer hover:border-amber-400 transition"
              >
                <p className="text-[10px] font-display font-semibold text-amber-300 uppercase tracking-wider">Verify Proofs</p>
                <p className="text-2xl font-display font-black text-amber-200 mt-1">{stats?.verification_pending ?? 0}</p>
              </div>

              <div className="doom-card p-4 rounded-xl">
                <p className="text-[10px] font-display font-semibold text-amber-300/80 uppercase tracking-wider">Pending Pay</p>
                <p className="text-2xl font-display font-black text-amber-200/80 mt-1">{stats?.pending_payments ?? 0}</p>
              </div>

              <div className="doom-card p-4 rounded-xl">
                <p className="text-[10px] font-display font-semibold text-amber-200 uppercase tracking-wider">Revenue</p>
                <p className="text-xl font-display font-black text-arcane-gold mt-1">₹{stats?.total_revenue ?? 0}</p>
              </div>

              <div className="doom-card p-4 rounded-xl">
                <p className="text-[10px] font-display font-semibold text-emerald-300 uppercase tracking-wider">Arrived</p>
                <p className="text-2xl font-display font-black text-emerald-300 mt-1">{stats?.arrived_teams ?? 0}</p>
              </div>

              <div className="doom-card p-4 rounded-xl">
                <p className="text-[10px] font-display font-semibold text-emerald-200/55 uppercase tracking-wider">Not Arrived</p>
                <p className="text-2xl font-display font-black text-emerald-100/75 mt-1">{stats?.not_arrived_teams ?? 0}</p>
              </div>
            </div>

            {/* Quick Actions & Recent Teams */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 doom-card rounded-xl p-6">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20 mb-4">
                  <h3 className="font-display text-xs font-bold uppercase tracking-widest text-amber-200">
                    Recent Registrations
                  </h3>
                  <button
                    onClick={() => setActiveTab('teams')}
                    className="text-xs text-emerald-300 font-semibold hover:text-amber-200 hover:underline cursor-pointer"
                  >
                    View All Teams →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-emerald-500/20 text-emerald-200/60 font-semibold uppercase text-[10px] tracking-wider">
                        <th className="pb-2">Reg ID</th>
                        <th className="pb-2">Team Name</th>
                        <th className="pb-2">Payment</th>
                        <th className="pb-2">Attendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-500/10">
                      {teams.slice(0, 5).map((t) => (
                        <tr key={t.id} className="hover:bg-emerald-500/5">
                          <td className="py-2.5 font-mono-tech font-medium text-amber-200">{t.registration_id}</td>
                          <td className="py-2.5 font-semibold text-emerald-50">{t.team_name}</td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              t.payment_status === 'SUCCESS'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/35'
                                : 'bg-amber-500/15 text-amber-200 border-amber-400/35'
                            }`}>
                              {t.payment_status}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              t.attendance_status === 'ARRIVED'
                                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                                : 'bg-emerald-950/60 text-emerald-200/60 border-emerald-500/20'
                            }`}>
                              {t.attendance_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {teams.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-emerald-200/45">
                            No teams registered yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Links */}
              <div className="doom-card rounded-xl p-6 space-y-4">
                <h3 className="font-display text-xs font-bold uppercase tracking-widest text-amber-200 pb-2 border-b border-emerald-500/20">
                  Gate Management
                </h3>
                <Link
                  to="/admin/scanner"
                  className="block doom-panel rounded-lg p-4 hover:border-emerald-400/50 transition group"
                >
                  <div className="flex items-center gap-3">
                    <QrCode size={24} className="text-emerald-400 group-hover:scale-105 transition" />
                    <div>
                      <p className="text-xs font-bold text-emerald-50">Dedicated QR Scanner</p>
                      <p className="text-[11px] text-emerald-200/65">Scan student tickets or manual ID lookup</p>
                    </div>
                  </div>
                </Link>

                <div className="space-y-2 pt-2">
                  <p className="text-[10px] font-display font-semibold text-emerald-200/60 uppercase tracking-widest">
                    Export Shortcuts
                  </p>
                  <button
                    onClick={() => handleDownloadReport('/teams/admin/reports/teams-csv/', 'buildathon_teams.csv')}
                    className="w-full flex items-center justify-between text-xs p-2.5 doom-btn-secondary rounded-lg cursor-pointer"
                  >
                    <span>Teams CSV Export</span>
                    <Download size={14} className="text-emerald-400" />
                  </button>
                  <button
                    onClick={() => handleDownloadReport('/teams/admin/reports/participants-csv/', 'buildathon_participants.csv')}
                    className="w-full flex items-center justify-between text-xs p-2.5 doom-btn-secondary rounded-lg cursor-pointer"
                  >
                    <span>Participants CSV Export</span>
                    <Download size={14} className="text-emerald-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TEAMS MANAGEMENT */}
        {activeTab === 'teams' && (
          <div className="doom-card rounded-xl p-6 space-y-4">
            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3 top-2.5 text-emerald-400/60" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search team, reg ID, participant..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-xs doom-input"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="rounded-lg px-2.5 py-2 text-xs doom-input"
                >
                  <option value="">All Payments</option>
                  <option value="VERIFICATION_PENDING">Verification Pending</option>
                  <option value="SUCCESS">Confirmed / Paid</option>
                  <option value="PENDING">Pending Payment</option>
                  <option value="REJECTED">Proof Rejected</option>
                </select>

                <select
                  value={attendanceFilter}
                  onChange={(e) => setAttendanceFilter(e.target.value)}
                  className="rounded-lg px-2.5 py-2 text-xs doom-input"
                >
                  <option value="">All Attendance</option>
                  <option value="ARRIVED">Arrived</option>
                  <option value="NOT_ARRIVED">Not Arrived</option>
                </select>
              </div>
            </div>

            {/* Teams Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-emerald-500/20 bg-emerald-950/40 text-emerald-200/75 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Reg ID</th>
                    <th className="py-2.5 px-3">Team Name</th>
                    <th className="py-2.5 px-3">College</th>
                    <th className="py-2.5 px-3">Participants</th>
                    <th className="py-2.5 px-3">Payment</th>
                    <th className="py-2.5 px-3">Attendance</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-500/10">
                  {teams.map((t) => (
                    <tr key={t.id} className="hover:bg-emerald-500/5">
                      <td className="py-3 px-3 font-mono-tech font-semibold text-amber-200">{t.registration_id}</td>
                      <td className="py-3 px-3 font-bold text-emerald-50">{t.team_name}</td>
                      <td className="py-3 px-3 text-emerald-200/75">{t.college_name}</td>
                      <td className="py-3 px-3 text-emerald-100/80">
                        {t.members.map((m) => (
                          <div key={m.id} className="text-[11px]">
                            <strong className="text-emerald-50">{m.full_name}</strong>{' '}
                            <span className="text-emerald-200/60">({m.email})</span>
                          </div>
                        ))}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          t.payment_status === 'SUCCESS'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/35'
                            : t.payment_status === 'VERIFICATION_PENDING'
                            ? 'bg-amber-500/20 text-amber-200 border-amber-400/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                            : t.payment_status === 'REJECTED'
                            ? 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                            : 'bg-white/5 text-emerald-200/50 border-white/10'
                        }`}>
                          {t.payment_status === 'VERIFICATION_PENDING' ? 'VERIFY PROOF' : t.payment_status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          t.attendance_status === 'ARRIVED'
                            ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                            : 'bg-emerald-950/60 text-emerald-200/60 border-emerald-500/20'
                        }`}>
                          {t.attendance_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                        {t.payment_proof?.screenshot_url && (
                          <button
                            onClick={() => { setProofReviewTeam(t); setRejectionReason(''); }}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 border border-amber-400/40 rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition"
                            title="Review uploaded UPI screenshot"
                          >
                            <ImageIcon size={12} />
                            <span>Proof</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedTeam(t)}
                          className="px-2.5 py-1 doom-btn-secondary rounded text-[11px] font-semibold cursor-pointer"
                        >
                          Details
                        </button>
                        {t.ticket_id && (
                          <button
                            onClick={() => handleDownloadTicket(t.ticket_id, t.registration_id)}
                            className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 rounded text-[11px] font-semibold inline-block cursor-pointer transition"
                            title="Download Official Ticket PDF"
                          >
                            Ticket PDF
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {teams.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-emerald-200/45">
                        No teams match the current criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PAYMENTS TRACKING */}
        {activeTab === 'payments' && (
          <div className="doom-card rounded-xl p-6 space-y-4">
            <h3 className="font-display text-xs font-bold uppercase tracking-widest text-amber-200">
              UPI &amp; Payments Audit Log
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-emerald-500/20 bg-emerald-950/40 text-emerald-200/75 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Order / Submission ID</th>
                    <th className="py-2.5 px-3">Team Name</th>
                    <th className="py-2.5 px-3">Reg ID</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">UTR / Reference</th>
                    <th className="py-2.5 px-3">Screenshot Proof</th>
                    <th className="py-2.5 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-500/10">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-emerald-500/5">
                      <td className="py-3 px-3 font-mono-tech font-medium text-emerald-200">{p.order_id}</td>
                      <td className="py-3 px-3 font-semibold text-emerald-50">{p.team_name}</td>
                      <td className="py-3 px-3 font-mono-tech text-amber-200">{p.registration_id}</td>
                      <td className="py-3 px-3 font-bold text-emerald-glow">₹{p.amount}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          p.payment_status === 'SUCCESS'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/35'
                            : p.payment_status === 'VERIFICATION_PENDING'
                            ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                            : p.payment_status === 'REJECTED'
                            ? 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                            : 'bg-white/5 text-emerald-200/50 border-white/10'
                        }`}>
                          {p.payment_status === 'VERIFICATION_PENDING' ? 'VERIFY PROOF' : p.payment_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono-tech text-emerald-200/80 text-[11px]">{p.payment_reference || 'N/A'}</td>
                      <td className="py-3 px-3">
                        {p.screenshot_url ? (
                          <a
                            href={p.screenshot_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 underline font-semibold"
                          >
                            <ImageIcon size={12} />
                            <span>View Proof</span>
                            <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="text-emerald-200/40 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-emerald-200/60 text-[11px]">{new Date(p.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-emerald-200/45">
                        No payment records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CSV REPORTS */}
        {activeTab === 'reports' && (
          <div className="doom-card rounded-xl p-6 sm:p-8">
            <h3 className="font-display text-sm font-bold uppercase tracking-widest text-amber-200 mb-2">
              Export Operational & Audit Data
            </h3>
            <p className="text-xs text-emerald-200/65 mb-6 max-w-xl">
              Generate real-time CSV reports for event check-in desks, accounting, and academic documentation.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => handleDownloadReport('/teams/admin/reports/teams-csv/', 'buildathon_teams.csv')}
                className="p-5 rounded-xl doom-panel hover:border-emerald-400/50 transition flex flex-col justify-between text-left cursor-pointer group"
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 flex items-center justify-center mb-3">
                    <FileSpreadsheet size={18} />
                  </div>
                  <h4 className="text-sm font-bold text-emerald-50 mb-1">Teams Master Data</h4>
                  <p className="text-[11px] text-emerald-200/65">
                    All registered teams, leader and member contacts, college names, and status.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300 group-hover:text-amber-200 font-semibold mt-4 transition">
                  <Download size={14} /> Download CSV
                </span>
              </button>

              <button
                onClick={() => handleDownloadReport('/teams/admin/reports/participants-csv/', 'buildathon_participants.csv')}
                className="p-5 rounded-xl doom-panel hover:border-emerald-400/50 transition flex flex-col justify-between text-left cursor-pointer group"
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 flex items-center justify-center mb-3">
                    <Users size={18} />
                  </div>
                  <h4 className="text-sm font-bold text-emerald-50 mb-1">Participants Master Data</h4>
                  <p className="text-[11px] text-emerald-200/65">
                    Individual participant records, roles, phone numbers, and attendance status.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300 group-hover:text-amber-200 font-semibold mt-4 transition">
                  <Download size={14} /> Download CSV
                </span>
              </button>

              <button
                onClick={() => handleDownloadReport('/teams/admin/reports/payments-csv/', 'buildathon_payments.csv')}
                className="p-5 rounded-xl doom-panel hover:border-emerald-400/50 transition flex flex-col justify-between text-left cursor-pointer group"
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-amber-400/15 border border-amber-300/30 text-amber-200 flex items-center justify-center mb-3">
                    <CreditCard size={18} />
                  </div>
                  <h4 className="text-sm font-bold text-emerald-50 mb-1">Payments Audit Report</h4>
                  <p className="text-[11px] text-emerald-200/65">
                    All UPI submission IDs, UTR references, screenshots, timestamps, and amounts.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-200 group-hover:text-emerald-300 font-semibold mt-4 transition">
                  <Download size={14} /> Download CSV
                </span>
              </button>

              <button
                onClick={() => handleDownloadReport('/teams/admin/reports/attendance-csv/', 'buildathon_attendance.csv')}
                className="p-5 rounded-xl doom-panel hover:border-emerald-400/50 transition flex flex-col justify-between text-left cursor-pointer group"
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 flex items-center justify-center mb-3">
                    <CheckCircle2 size={18} />
                  </div>
                  <h4 className="text-sm font-bold text-emerald-50 mb-1">Attendance Check-in Logs</h4>
                  <p className="text-[11px] text-emerald-200/65">
                    Timestamped check-in records, gate scanning methods, and verifying admin credentials.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300 group-hover:text-amber-200 font-semibold mt-4 transition">
                  <Download size={14} /> Download CSV
                </span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: EMAIL LOGS */}
        {activeTab === 'emails' && (
          <div className="doom-card rounded-xl p-6 space-y-4">
            <h3 className="font-display text-xs font-bold uppercase tracking-widest text-amber-200">
              Email Delivery & Dispatch Logs
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-emerald-500/20 bg-emerald-950/40 text-emerald-200/75 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Recipient</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Sent / Attempted</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-500/10">
                  {emailLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-emerald-500/5">
                      <td className="py-2.5 px-3 font-semibold text-amber-200">{l.email_type}</td>
                      <td className="py-2.5 px-3 font-mono-tech text-emerald-100">{l.recipient_email}</td>
                      <td className="py-2.5 px-3 text-emerald-200/75">{l.subject}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          l.status === 'SENT'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/35'
                            : 'bg-rose-950/70 text-rose-300 border-rose-500/40'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-emerald-200/60 text-[11px]">
                        {new Date(l.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {l.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetryEmail(l.id)}
                            className="px-2.5 py-1 bg-amber-500/15 text-amber-200 border border-amber-400/35 hover:bg-amber-500/25 rounded text-[10px] font-semibold cursor-pointer"
                          >
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {emailLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-emerald-200/45">
                        No email activity recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users & Accounts Tab */}
        {activeTab === 'users' && (
          <div className="doom-card rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-xs font-bold uppercase tracking-widest text-amber-200">
                  User Accounts Management
                </h3>
                <p className="text-xs text-emerald-200/65 mt-0.5">
                  View registered students and admins, or permanently remove accounts.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-emerald-400/60" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search name or email..."
                    className="pl-8 pr-3 py-1.5 rounded-lg text-xs w-48 sm:w-60 doom-input"
                  />
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="rounded-lg px-2.5 py-1.5 text-xs doom-input"
                >
                  <option value="">All Roles</option>
                  <option value="STUDENT">Students</option>
                  <option value="ADMIN">Admins</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-emerald-500/20 bg-emerald-950/40 text-emerald-200/75 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Full Name</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Verification</th>
                    <th className="py-2.5 px-3">Associated Team</th>
                    <th className="py-2.5 px-3">Registered Date</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-500/10">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-emerald-500/5">
                      <td className="py-2.5 px-3 font-semibold text-emerald-50">{u.full_name}</td>
                      <td className="py-2.5 px-3 text-emerald-200/80 font-mono-tech text-[11px]">{u.email}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          u.role === 'ADMIN'
                            ? 'bg-amber-400/15 text-amber-200 border-amber-300/35'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                          u.is_verified
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                            : 'bg-amber-500/15 text-amber-200 border-amber-400/30'
                        }`}>
                          {u.is_verified ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                          {u.is_verified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-emerald-200/75">
                        {u.team_info ? (
                          <div>
                            <span className="font-semibold text-emerald-50">{u.team_info.team_name}</span>{' '}
                            <span className="text-[10px] text-amber-200/80 font-mono-tech">({u.team_info.registration_id})</span>
                            <span className="block text-[10px] text-emerald-300 font-semibold">{u.team_info.role}</span>
                          </div>
                        ) : (
                          <span className="text-emerald-200/40 italic">No team</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-200/60 text-[11px]">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setUserToDelete(u)}
                          className="inline-flex items-center gap-1 text-xs bg-rose-950/60 hover:bg-rose-900/70 text-rose-200 border border-rose-500/40 px-2.5 py-1 rounded-md transition font-medium cursor-pointer"
                          title="Delete user account and all data"
                        >
                          <Trash2 size={12} /> Delete Account
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-emerald-200/45">
                        No user accounts found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Team Details Modal */}
        {selectedTeam && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="doom-card rounded-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3 mb-4">
                <div>
                  <h3 className="font-display text-base font-bold text-buildops uppercase">{selectedTeam.team_name}</h3>
                  <p className="text-xs text-amber-200/80 font-mono-tech mt-0.5">
                    {selectedTeam.registration_id} • {selectedTeam.college_name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="text-emerald-200/60 hover:text-amber-200 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs mb-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="doom-panel p-3 rounded-lg">
                    <span className="text-emerald-200/55 block mb-0.5 uppercase text-[10px]">Payment Status:</span>
                    <span className="font-bold text-emerald-300">{selectedTeam.payment_status}</span>
                  </div>
                  <div className="doom-panel p-3 rounded-lg">
                    <span className="text-emerald-200/55 block mb-0.5 uppercase text-[10px]">Attendance Status:</span>
                    <span className="font-bold text-amber-200">{selectedTeam.attendance_status}</span>
                  </div>
                </div>

                <div>
                  <p className="font-display font-bold text-emerald-200/80 text-[10px] uppercase tracking-widest mb-2">
                    Team Participants:
                  </p>
                  <div className="space-y-2">
                    {selectedTeam.members.map((m) => (
                      <div key={m.id} className="p-2.5 doom-panel rounded-lg">
                        <div className="flex justify-between font-semibold">
                          <span className="text-emerald-50">{m.full_name}</span>
                          <span className="text-[10px] text-amber-200 uppercase">{m.member_role}</span>
                        </div>
                        <p className="text-emerald-200/70 text-[11px] font-mono-tech mt-0.5">{m.email} • {m.mobile_number}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedTeam.payment_proof?.screenshot_url && (
                  <div className="doom-panel p-3 rounded-lg space-y-2 border border-emerald-500/30">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-emerald-200/90 text-[10px] uppercase tracking-widest">
                        UPI Payment Proof:
                      </span>
                      <button
                        type="button"
                        onClick={() => setProofReviewTeam(selectedTeam)}
                        className="text-[11px] text-amber-300 hover:text-amber-200 inline-flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <ImageIcon size={12} />
                        <span>Inspect Full Proof</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedTeam.payment_proof.screenshot_url}
                        alt="Proof thumbnail"
                        className="w-14 h-14 object-cover rounded border border-emerald-500/30 bg-black cursor-pointer"
                        onClick={() => setProofReviewTeam(selectedTeam)}
                      />
                      <div className="text-[11px]">
                        <p className="font-mono-tech text-emerald-200">
                          UTR: {selectedTeam.payment_proof.payment_reference || selectedTeam.payment_proof.transaction_reference || 'Not provided'}
                          {selectedTeam.payment_proof.auto_fetched && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                              Auto-Fetched
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-emerald-200/60 mt-0.5">
                          Status: <span className="font-semibold text-amber-300">{selectedTeam.payment_status}</span>
                        </p>
                      </div>
                    </div>
                    {selectedTeam.payment_status !== 'SUCCESS' && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          disabled={proofActionLoading}
                          onClick={() => handleApprovePayment(selectedTeam.id)}
                          className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-[11px] rounded transition cursor-pointer"
                        >
                          {proofActionLoading ? 'Processing...' : 'Approve Payment'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setProofReviewTeam(selectedTeam)}
                          className="px-3 py-1.5 bg-rose-950/60 text-rose-300 border border-rose-500/40 text-[11px] rounded hover:bg-rose-900/60 transition cursor-pointer"
                        >
                          Reject...
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {selectedTeam.ticket_id && (
                  <div className="pt-3 border-t border-emerald-500/20 space-y-3">
                    <div className="flex items-center gap-3 p-2.5 doom-panel rounded-lg">
                      <img
                        src={`${API_BASE_URL}/tickets/${selectedTeam.ticket_id}/qr/`}
                        alt="Ticket QR"
                        className="w-14 h-14 bg-white p-1 rounded border border-emerald-400/50"
                      />
                      <div>
                        <p className="font-bold text-emerald-100 text-xs">Digital Ticket & Gate QR Pass</p>
                        <p className="text-[10px] font-mono-tech text-emerald-300/80 mt-0.5">
                          Token: {selectedTeam.qr_token || 'Active'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleDownloadTicket(selectedTeam.ticket_id, selectedTeam.registration_id)}
                        className="flex items-center gap-1.5 doom-btn-primary px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                      >
                        <Download size={12} /> Download Ticket (PDF)
                      </button>
                      <button
                        onClick={() => handleResendTicketEmail(selectedTeam.ticket_id)}
                        className="flex items-center gap-1.5 doom-btn-secondary px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                      >
                        <Send size={12} /> Resend Ticket Email
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedTeam(null)}
                className="w-full doom-btn-secondary py-2 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Dedicated Payment Proof Review Modal */}
        {proofReviewTeam && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="doom-card rounded-2xl max-w-xl w-full p-6 max-h-[92vh] overflow-y-auto border border-emerald-500/40">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold text-emerald-100 uppercase tracking-wide">
                      Review UPI Payment Proof
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      proofReviewTeam.payment_status === 'SUCCESS'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/35'
                        : proofReviewTeam.payment_status === 'VERIFICATION_PENDING'
                        ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                        : 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                    }`}>
                      {proofReviewTeam.payment_status}
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/80 font-mono-tech mt-0.5">
                    Team: <span className="text-emerald-300 font-semibold">{proofReviewTeam.team_name}</span> ({proofReviewTeam.registration_id}) • {proofReviewTeam.college_name}
                  </p>
                </div>
                <button
                  onClick={() => { setProofReviewTeam(null); setRejectionReason(''); }}
                  className="text-emerald-200/60 hover:text-amber-200 text-sm font-bold cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Payment Metadata */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="doom-panel p-3 rounded-lg">
                    <span className="text-emerald-200/55 block mb-0.5 uppercase text-[10px]">Submitted UTR / Transaction Ref:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono-tech font-bold text-emerald-200 text-xs">
                        {proofReviewTeam.payment_proof?.payment_reference || proofReviewTeam.payment_proof?.transaction_reference || 'Not provided'}
                      </span>
                      {proofReviewTeam.payment_proof?.auto_fetched && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          Auto-Fetched
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="doom-panel p-3 rounded-lg">
                    <span className="text-emerald-200/55 block mb-0.5 uppercase text-[10px]">Required Registration Fee:</span>
                    <span className="font-display font-black text-amber-300 text-sm">₹500.00</span>
                  </div>
                </div>

                {proofReviewTeam.payment_proof?.rejection_reason && (
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-200">
                    <p className="font-semibold text-[11px] uppercase tracking-wider text-rose-300 mb-1">Previous Rejection Note:</p>
                    <p className="text-xs">{proofReviewTeam.payment_proof.rejection_reason}</p>
                  </div>
                )}

                {/* Screenshot Image Preview */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-emerald-200/70 font-semibold uppercase text-[10px] tracking-wider">
                      Transaction Screenshot
                    </span>
                    {proofReviewTeam.payment_proof?.screenshot_url && (
                      <a
                        href={proofReviewTeam.payment_proof.screenshot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 font-semibold"
                      >
                        <span>Open full size</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>

                  {proofReviewTeam.payment_proof?.screenshot_url ? (
                    <div className="rounded-xl overflow-hidden border border-emerald-500/30 bg-black/60 flex items-center justify-center p-2 max-h-[380px]">
                      <img
                        src={proofReviewTeam.payment_proof.screenshot_url}
                        alt={`Payment proof for ${proofReviewTeam.team_name}`}
                        className="max-h-[360px] w-auto max-w-full object-contain rounded-lg shadow-lg cursor-pointer hover:opacity-95 transition"
                        onClick={() => window.open(proofReviewTeam.payment_proof.screenshot_url, '_blank')}
                        title="Click to view full resolution"
                      />
                    </div>
                  ) : (
                    <div className="p-8 text-center text-emerald-200/40 doom-panel rounded-xl">
                      No screenshot uploaded for this team.
                    </div>
                  )}
                </div>

                {/* Action Controls */}
                <div className="pt-2 border-t border-emerald-500/20 space-y-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={proofActionLoading || proofReviewTeam.payment_status === 'SUCCESS'}
                      onClick={() => handleApprovePayment(proofReviewTeam.id)}
                      className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-display font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={15} />
                      <span>{proofActionLoading ? 'Processing...' : proofReviewTeam.payment_status === 'SUCCESS' ? 'Already Approved' : 'Approve Payment & Issue Digital Pass'}</span>
                    </button>
                  </div>

                  {/* Rejection Option */}
                  {proofReviewTeam.payment_status !== 'SUCCESS' && (
                    <div className="pt-2">
                      <label className="block text-[11px] text-rose-300 font-semibold mb-1">
                        Reject with Note (Optional explanation for student):
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="e.g., UTR mismatch, blur screenshot, amount incorrect"
                          className="flex-1 px-3 py-1.5 rounded-lg text-xs doom-input"
                        />
                        <button
                          type="button"
                          disabled={proofActionLoading}
                          onClick={() => handleRejectPayment(proofReviewTeam.id)}
                          className="px-4 py-1.5 bg-rose-950/70 hover:bg-rose-900/80 text-rose-200 border border-rose-500/40 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 transition"
                        >
                          Reject Proof
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete User Account Confirmation Modal */}
        {userToDelete && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="doom-card rounded-xl max-w-md w-full p-6 border-rose-500/40">
              <div className="flex items-center gap-3 text-rose-400 mb-3">
                <div className="w-10 h-10 rounded-full bg-rose-950/80 border border-rose-500/40 flex items-center justify-center shrink-0">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-rose-100 uppercase">Delete User Account</h3>
                  <p className="text-xs text-rose-400 font-semibold">Irreversible Database Deletion</p>
                </div>
              </div>

              <p className="text-xs text-emerald-100/75 mb-4 leading-relaxed">
                Are you sure you want to permanently delete the account for{' '}
                <strong className="text-emerald-50">{userToDelete.full_name} ({userToDelete.email})</strong>?
              </p>

              <div className="bg-rose-950/50 border border-rose-500/35 p-3.5 rounded-lg text-xs text-rose-200 space-y-1.5 mb-5">
                <p className="font-bold">This operation will permanently erase:</p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-200/85">
                  <li>User profile, authentication credentials and tokens</li>
                  <li>Any teams registered or led by this user</li>
                  <li>Associated payments, tickets, and check-in attendance records</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 doom-btn-secondary rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={confirmDeleteUser}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-[0_0_16px_rgba(225,29,72,0.4)]"
                >
                  <Trash2 size={14} />
                  {deleteLoading ? 'Deleting Account...' : 'Permanently Delete User'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

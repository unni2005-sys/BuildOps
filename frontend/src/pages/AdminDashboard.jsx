import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
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
  Send
} from 'lucide-react';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [teams, setTeams] = useState([]);
  const [payments, setPayments] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
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

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchTeams(), fetchPayments(), fetchEmailLogs()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [searchQuery, paymentFilter, attendanceFilter]);

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

  const handleRegenerateCerts = async (teamId) => {
    try {
      setActionMsg('Regenerating certificates...');
      const res = await api.post(`/certificates/admin/regenerate/${teamId}/`);
      setActionMsg(res.data.message || 'Certificates regenerated.');
      setTimeout(() => setActionMsg(''), 4000);
      fetchTeams();
    } catch (err) {
      setActionMsg('Certificate regeneration failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={24} className="text-teal-600" />
              <h1 className="text-xl font-bold text-slate-900">Admin Control Panel</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Build Ops • Event Management, Attendance & Verification
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/scanner"
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs px-4 py-2 rounded-md shadow-sm transition"
            >
              <QrCode size={16} /> Open QR Scanner
            </Link>
            <button
              onClick={loadAll}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs px-3 py-2 rounded-md border border-slate-300 transition"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {actionMsg && (
          <div className="bg-teal-50 border border-teal-200 text-teal-800 p-3 rounded-md text-xs font-semibold">
            {actionMsg}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 flex gap-4 text-xs font-bold uppercase tracking-wider text-slate-500">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-2 border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent hover:text-slate-800'
            }`}
          >
            Overview & Metrics
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`pb-3 px-2 border-b-2 transition ${
              activeTab === 'teams'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent hover:text-slate-800'
            }`}
          >
            Teams ({teams.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-3 px-2 border-b-2 transition ${
              activeTab === 'payments'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent hover:text-slate-800'
            }`}
          >
            Transactions ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`pb-3 px-2 border-b-2 transition ${
              activeTab === 'reports'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent hover:text-slate-800'
            }`}
          >
            CSV Reports
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`pb-3 px-2 border-b-2 transition ${
              activeTab === 'emails'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent hover:text-slate-800'
            }`}
          >
            Email Logs ({emailLogs.length})
          </button>
        </div>

        {/* TAB 1: OVERVIEW & METRICS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Teams</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{stats?.total_teams ?? 0}</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Participants</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{stats?.total_participants ?? 0}</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <p className="text-[11px] font-semibold text-emerald-600 uppercase">Paid Teams</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">{stats?.successful_payments ?? 0}</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <p className="text-[11px] font-semibold text-amber-600 uppercase">Pending Pay</p>
                <p className="text-2xl font-black text-amber-700 mt-1">{stats?.pending_payments ?? 0}</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <p className="text-[11px] font-semibold text-teal-600 uppercase">Total Revenue</p>
                <p className="text-xl font-black text-teal-700 mt-1">₹{stats?.total_revenue ?? 0}</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <p className="text-[11px] font-semibold text-blue-600 uppercase">Arrived Teams</p>
                <p className="text-2xl font-black text-blue-700 mt-1">{stats?.arrived_teams ?? 0}</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Not Arrived</p>
                <p className="text-2xl font-black text-slate-700 mt-1">{stats?.not_arrived_teams ?? 0}</p>
              </div>
            </div>

            {/* Quick Actions & Recent Teams */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Recent Registrations</h3>
                  <button
                    onClick={() => setActiveTab('teams')}
                    className="text-xs text-teal-600 font-semibold hover:underline"
                  >
                    View All Teams →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="pb-2">Reg ID</th>
                        <th className="pb-2">Team Name</th>
                        <th className="pb-2">Payment</th>
                        <th className="pb-2">Attendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {teams.slice(0, 5).map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="py-2.5 font-mono font-medium text-slate-800">{t.registration_id}</td>
                          <td className="py-2.5 font-semibold text-slate-900">{t.team_name}</td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.payment_status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {t.payment_status}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.attendance_status === 'ARRIVED' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {t.attendance_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                  Gate Management
                </h3>
                <Link
                  to="/admin/scanner"
                  className="block bg-teal-50 border border-teal-200 rounded-lg p-4 hover:bg-teal-100/70 transition"
                >
                  <div className="flex items-center gap-3">
                    <QrCode size={24} className="text-teal-700" />
                    <div>
                      <p className="text-xs font-bold text-teal-900">Dedicated QR Scanner</p>
                      <p className="text-[11px] text-teal-700">Scan student tickets or manual registration lookup</p>
                    </div>
                  </div>
                </Link>

                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold text-slate-600 uppercase">Export Shortcuts</p>
                  <a
                    href="/api/teams/admin/reports/teams-csv/"
                    className="flex items-center justify-between text-xs p-2 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-slate-700"
                  >
                    <span>Teams CSV Export</span>
                    <Download size={14} />
                  </a>
                  <a
                    href="/api/teams/admin/reports/participants-csv/"
                    className="flex items-center justify-between text-xs p-2 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-slate-700"
                  >
                    <span>Participants CSV Export</span>
                    <Download size={14} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TEAMS MANAGEMENT */}
        {activeTab === 'teams' && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search team, reg ID, participant..."
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="border border-slate-300 rounded-md px-2.5 py-1.5 text-xs focus:outline-none text-slate-700"
                >
                  <option value="">All Payments</option>
                  <option value="SUCCESS">Success</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                </select>

                <select
                  value={attendanceFilter}
                  onChange={(e) => setAttendanceFilter(e.target.value)}
                  className="border border-slate-300 rounded-md px-2.5 py-1.5 text-xs focus:outline-none text-slate-700"
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
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Reg ID</th>
                    <th className="py-2.5 px-3">Team Name</th>
                    <th className="py-2.5 px-3">College</th>
                    <th className="py-2.5 px-3">Participants</th>
                    <th className="py-2.5 px-3">Payment</th>
                    <th className="py-2.5 px-3">Attendance</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teams.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-800">{t.registration_id}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{t.team_name}</td>
                      <td className="py-3 px-3 text-slate-600">{t.college_name}</td>
                      <td className="py-3 px-3 text-slate-700">
                        {t.members.map((m) => (
                          <div key={m.id} className="text-[11px]">
                            <strong>{m.full_name}</strong> ({m.email})
                          </div>
                        ))}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.payment_status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.payment_status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.attendance_status === 'ARRIVED' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {t.attendance_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1">
                        <button
                          onClick={() => setSelectedTeam(t)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold"
                        >
                          Details
                        </button>
                        {t.ticket_id && (
                          <a
                            href={`/api/tickets/${t.ticket_id}/download/`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-semibold inline-block"
                          >
                            Ticket
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                  {teams.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
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
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Cashfree Transactions Log</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Team Name</th>
                    <th className="py-2.5 px-3">Reg ID</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Payment Reference</th>
                    <th className="py-2.5 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono font-medium text-slate-800">{p.order_id}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{p.team_name}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{p.registration_id}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">₹{p.amount}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.payment_status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {p.payment_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">{p.payment_reference || 'N/A'}</td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">{new Date(p.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
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
          <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-2">Export Operational & Audit Data</h3>
            <p className="text-xs text-slate-500 mb-6 max-w-xl">
              Generate real-time CSV reports for event check-in desks, accounting, certificates verification, and academic documentation.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <a
                href="/api/teams/admin/reports/teams-csv/"
                className="p-5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded bg-teal-100 text-teal-700 flex items-center justify-center mb-3">
                    <FileSpreadsheet size={18} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Teams Master Data</h4>
                  <p className="text-[11px] text-slate-500">
                    All registered teams, leader and member contacts, college names, and status.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-teal-700 font-semibold mt-4">
                  <Download size={14} /> Download CSV
                </span>
              </a>

              <a
                href="/api/teams/admin/reports/participants-csv/"
                className="p-5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                    <Users size={18} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Participants Master Data</h4>
                  <p className="text-[11px] text-slate-500">
                    Individual participant records, roles, phone numbers, and certificate issuance status.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-blue-700 font-semibold mt-4">
                  <Download size={14} /> Download CSV
                </span>
              </a>

              <a
                href="/api/teams/admin/reports/payments-csv/"
                className="p-5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                    <CreditCard size={18} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Payments Audit Report</h4>
                  <p className="text-[11px] text-slate-500">
                    All Cashfree order IDs, gateway reference codes, timestamps, and amounts.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold mt-4">
                  <Download size={14} /> Download CSV
                </span>
              </a>

              <a
                href="/api/teams/admin/reports/attendance-csv/"
                className="p-5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                    <CheckCircle2 size={18} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Attendance Check-in Logs</h4>
                  <p className="text-[11px] text-slate-500">
                    Timestamped check-in records, gate scanning methods, and verifying admin credentials.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-semibold mt-4">
                  <Download size={14} /> Download CSV
                </span>
              </a>
            </div>
          </div>
        )}

        {/* TAB 5: EMAIL LOGS */}
        {activeTab === 'emails' && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Email Delivery & Dispatch Logs</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Recipient</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Sent / Attempted</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {emailLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{l.email_type}</td>
                      <td className="py-2.5 px-3 text-slate-700">{l.recipient_email}</td>
                      <td className="py-2.5 px-3 text-slate-600">{l.subject}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.status === 'SENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {new Date(l.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {l.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetryEmail(l.id)}
                            className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-[10px] font-semibold"
                          >
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {emailLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No email activity recorded yet.
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedTeam.team_name}</h3>
                  <p className="text-xs text-slate-500">{selectedTeam.registration_id} • {selectedTeam.college_name}</p>
                </div>
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs mb-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded border border-slate-100">
                    <span className="text-slate-500 block mb-0.5">Payment Status:</span>
                    <span className="font-bold text-slate-900">{selectedTeam.payment_status}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border border-slate-100">
                    <span className="text-slate-500 block mb-0.5">Attendance Status:</span>
                    <span className="font-bold text-slate-900">{selectedTeam.attendance_status}</span>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-slate-800 mb-2">Team Participants:</p>
                  <div className="space-y-2">
                    {selectedTeam.members.map((m) => (
                      <div key={m.id} className="p-2.5 bg-slate-50 rounded border border-slate-200">
                        <div className="flex justify-between font-semibold">
                          <span>{m.full_name}</span>
                          <span className="text-[10px] text-slate-500">{m.member_role}</span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{m.email} • {m.mobile_number}</p>
                        {m.has_certificate && (
                          <p className="text-teal-700 font-mono text-[10px] mt-1">Cert ID: {m.certificate_id}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedTeam.ticket_id && (
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleResendTicketEmail(selectedTeam.ticket_id)}
                      className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded text-xs"
                    >
                      <Send size={12} /> Resend Ticket Email
                    </button>
                    {selectedTeam.attendance_status === 'ARRIVED' && (
                      <button
                        onClick={() => handleRegenerateCerts(selectedTeam.id)}
                        className="flex items-center gap-1 bg-teal-700 hover:bg-teal-600 text-white px-3 py-1.5 rounded text-xs"
                      >
                        <RefreshCw size={12} /> Regenerate Certificates
                      </button>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedTeam(null)}
                className="w-full border border-slate-300 text-slate-700 hover:bg-slate-100 py-2 rounded text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

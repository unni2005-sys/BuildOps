import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { QRScanner } from '../components/QRScanner';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  ArrowLeft,
  Users,
  Award,
  RefreshCw
} from 'lucide-react';

export const AdminScanner = () => {
  const [manualInput, setManualInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [statusAlert, setStatusAlert] = useState(null);

  const handleValidate = async (tokenOrId) => {
    const query = tokenOrId?.trim() || manualInput.trim();
    if (!query) {
      setStatusAlert({ type: 'error', message: 'Please provide a QR token or Registration ID.' });
      return;
    }

    setLoading(true);
    setStatusAlert(null);
    setScanResult(null);

    try {
      const res = await api.post('/attendance/validate/', { token: query });
      setScanResult(res.data);
      if (res.data.already_arrived) {
        setStatusAlert({
          type: 'warning',
          message: res.data.message || 'Already Arrived! This team has already checked in.'
        });
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Validation failed. Invalid or unpaid ticket.';
      setStatusAlert({ type: 'error', message: msg });
      if (err.response?.data?.team) {
        setScanResult(err.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!scanResult?.team) return;

    setCheckinLoading(true);
    setStatusAlert(null);

    try {
      const res = await api.post('/attendance/check-in/', {
        team_id: scanResult.team.id,
        action_details: 'Admin Camera Gate Scanner'
      });
      setStatusAlert({
        type: 'success',
        message: res.data.message || 'Team successfully checked in! Participation certificates generated.'
      });
      setScanResult((prev) => ({
        ...prev,
        already_arrived: true,
        ready_for_checkin: false,
        team: res.data.team
      }));
    } catch (err) {
      console.error(err);
      setStatusAlert({
        type: 'error',
        message: err.response?.data?.error || 'Failed to mark team as arrived.'
      });
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleReset = () => {
    setScanResult(null);
    setStatusAlert(null);
    setManualInput('');
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <Link
              to="/admin/dashboard"
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-900">Gate Attendance & QR Scanner</h1>
              <p className="text-[11px] text-slate-500">Scan tickets or enter registration ID for instant gate arrival check-in</p>
            </div>
          </div>

          {scanResult && (
            <button
              onClick={handleReset}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded border border-slate-300 font-medium flex items-center gap-1"
            >
              <RefreshCw size={12} /> Scan Another
            </button>
          )}
        </div>

        {/* Status Alerts */}
        {statusAlert && (
          <div
            className={`p-4 rounded-lg text-xs font-semibold flex items-center gap-2.5 border ${
              statusAlert.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : statusAlert.type === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            {statusAlert.type === 'success' ? (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            ) : statusAlert.type === 'warning' ? (
              <Clock size={18} className="shrink-0 text-amber-600" />
            ) : (
              <AlertCircle size={18} className="shrink-0 text-rose-600" />
            )}
            <span>{statusAlert.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Scanner Viewport Card */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Camera Scanner</h2>
            <QRScanner
              onScanSuccess={(code) => {
                if (!loading && !checkinLoading) {
                  setManualInput(code);
                  handleValidate(code);
                }
              }}
              isScanningActive={!scanResult}
            />

            {/* Manual Lookup Fallback */}
            <div className="pt-4 border-t border-slate-200">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Manual Fallback: Registration ID or QR Token
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="e.g. BUILD-ALPHA01 or TKT-..."
                  className="flex-1 border border-slate-300 rounded-md px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500 uppercase"
                />
                <button
                  onClick={() => handleValidate()}
                  disabled={loading}
                  className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-4 py-1.5 rounded-md transition shadow-sm disabled:opacity-50 flex items-center gap-1"
                >
                  <Search size={14} /> Validate
                </button>
              </div>
            </div>
          </div>

          {/* Validation & Team Details Card */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Verification Details</h2>

              {loading ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-teal-600" />
                  <p className="text-xs">Validating ticket in database...</p>
                </div>
              ) : scanResult?.team ? (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{scanResult.team.team_name}</h3>
                        <p className="text-slate-500 text-[11px]">{scanResult.team.college_name}</p>
                      </div>
                      <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-300">
                        {scanResult.team.registration_id}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Payment:</span>
                        <span className={`font-bold ${scanResult.team.payment_status === 'SUCCESS' ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {scanResult.team.payment_status}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Attendance:</span>
                        <span className={`font-bold ${scanResult.team.attendance_status === 'ARRIVED' ? 'text-teal-700' : 'text-slate-700'}`}>
                          {scanResult.team.attendance_status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="font-bold text-slate-800 mb-2">Registered Participants:</p>
                    <div className="space-y-2">
                      {scanResult.team.members.map((m) => (
                        <div key={m.id} className="p-2.5 bg-slate-50 rounded border border-slate-200">
                          <div className="flex justify-between font-semibold">
                            <span>{m.full_name}</span>
                            <span className="text-[10px] text-slate-500">{m.member_role}</span>
                          </div>
                          <p className="text-slate-600 text-[11px]">{m.email} • {m.mobile_number}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {scanResult.already_arrived && (
                    <div className="p-3 bg-amber-50 rounded border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                      <Clock size={16} className="shrink-0 text-amber-700" />
                      <span>
                        This team has already been checked in. Duplicate entry is not permitted.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No ticket currently loaded.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Scan a ticket QR code or type a registration ID to begin.</p>
                </div>
              )}
            </div>

            {/* Check In Action Button */}
            {scanResult?.team && (
              <div className="pt-6 border-t border-slate-200 mt-4">
                {scanResult.ready_for_checkin ? (
                  <button
                    onClick={handleCheckIn}
                    disabled={checkinLoading}
                    className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-4 rounded-md text-sm transition shadow flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 size={18} />
                    {checkinLoading ? 'Recording Check-in & Generating Certificates...' : 'Mark as Arrived (Check-in Team)'}
                  </button>
                ) : scanResult.already_arrived ? (
                  <button
                    disabled
                    className="w-full bg-slate-200 text-slate-500 font-semibold py-2.5 px-4 rounded-md text-xs cursor-not-allowed"
                  >
                    Already Arrived & Checked In
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full bg-rose-100 text-rose-700 font-semibold py-2.5 px-4 rounded-md text-xs cursor-not-allowed"
                  >
                    Cannot Check In: Unpaid or Incomplete Registration
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

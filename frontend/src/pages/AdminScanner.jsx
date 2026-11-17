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
  RefreshCw,
  Sparkles
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
        message: res.data.message || 'Team successfully checked in!'
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
    <div className="min-h-screen bg-slate-100 py-4 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Compact Header */}
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/dashboard"
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
              title="Back to Admin Dashboard"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">Gate Attendance Scanner</h1>
              <p className="text-[11px] text-slate-500">Live ticket verification & arrival check-in desk</p>
            </div>
          </div>

          {scanResult && (
            <button
              onClick={handleReset}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded border border-slate-300 font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw size={12} /> Scan Next Ticket
            </button>
          )}
        </div>

        {/* Status Alerts */}
        {statusAlert && (
          <div
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 border ${
              statusAlert.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : statusAlert.type === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            {statusAlert.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            ) : statusAlert.type === 'warning' ? (
              <Clock size={16} className="shrink-0 text-amber-600" />
            ) : (
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
            )}
            <span>{statusAlert.message}</span>
          </div>
        )}

        {/* Balanced 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Scanner & Manual Input */}
          <div className="lg:col-span-5 bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Live Camera</span>
              <span className="text-[10px] text-slate-400 font-medium">Automatic Detection</span>
            </div>

            <QRScanner
              onScanSuccess={(code) => {
                if (!loading && !checkinLoading) {
                  setManualInput(code);
                  handleValidate(code);
                }
              }}
              isScanningActive={!scanResult}
            />

            {/* Manual Lookup Row */}
            <div className="pt-3 border-t border-slate-200 space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700">
                Manual Fallback Lookup
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                  placeholder="Registration ID or TKT-..."
                  className="flex-1 border border-slate-300 rounded-md px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500 uppercase placeholder:normal-case"
                />
                <button
                  onClick={() => handleValidate()}
                  disabled={loading}
                  className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-md transition shadow-xs disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  <Search size={13} /> Verify
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Verification & Check-in Details */}
          <div className="lg:col-span-7 bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between min-h-[340px]">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Verification Result</h2>
                {scanResult?.team && (
                  <span className="text-[10px] font-mono text-slate-500">ID: {scanResult.team.registration_id}</span>
                )}
              </div>

              {loading ? (
                <div className="py-16 text-center text-slate-400">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-teal-600" />
                  <p className="text-xs font-medium">Validating ticket against database...</p>
                </div>
              ) : scanResult?.team ? (
                <div className="space-y-3 text-xs">
                  {/* Team Card */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-tight">{scanResult.team.team_name}</h3>
                        <p className="text-slate-600 text-[11px] mt-0.5">{scanResult.team.college_name}</p>
                      </div>
                      <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-300 text-[11px]">
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
                        <span className="text-slate-500 block text-[10px]">Arrival:</span>
                        <span className={`font-bold ${scanResult.team.attendance_status === 'ARRIVED' ? 'text-teal-700' : 'text-slate-700'}`}>
                          {scanResult.team.attendance_status === 'ARRIVED' ? 'ARRIVED & CHECKED IN' : 'NOT ARRIVED'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Registered Participants */}
                  <div>
                    <p className="font-bold text-slate-700 text-[11px] mb-1.5 uppercase tracking-wider">Participants</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {scanResult.team.members.map((m) => (
                        <div key={m.id} className="p-2.5 bg-slate-50 rounded border border-slate-200">
                          <div className="flex justify-between items-center font-semibold">
                            <span className="text-slate-900 truncate">{m.full_name}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded ml-1">
                              {m.member_role}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[10px] mt-0.5">{m.email}</p>
                          <p className="text-slate-500 text-[10px]">{m.mobile_number}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {scanResult.already_arrived && (
                    <div className="p-2.5 bg-amber-50 rounded border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                      <Clock size={16} className="shrink-0 text-amber-700" />
                      <span className="text-[11px]">
                        This team has already been checked in. Duplicate gate entry is not permitted.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-14 text-center text-slate-400">
                  <Users size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold text-slate-600">No ticket loaded</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs mx-auto">
                    Point the camera at an attendee's E-Ticket QR code or enter their registration ID on the left.
                  </p>
                </div>
              )}
            </div>

            {/* Check In Action Button */}
            {scanResult?.team && (
              <div className="pt-3 border-t border-slate-200 mt-4">
                {scanResult.ready_for_checkin ? (
                  <button
                    onClick={handleCheckIn}
                    disabled={checkinLoading}
                    className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 px-4 rounded-md text-xs transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 size={16} />
                    {checkinLoading ? 'Recording Check-in...' : 'Mark as Arrived (Confirm Gate Entry)'}
                  </button>
                ) : scanResult.already_arrived ? (
                  <button
                    disabled
                    className="w-full bg-slate-100 text-slate-500 font-semibold py-2 px-4 rounded-md text-xs cursor-not-allowed border border-slate-200"
                  >
                    Already Checked In
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full bg-rose-100 text-rose-700 font-semibold py-2 px-4 rounded-md text-xs cursor-not-allowed border border-rose-200"
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

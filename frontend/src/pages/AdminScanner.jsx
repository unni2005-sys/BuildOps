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
    <div className="min-h-[calc(100vh-4rem)] py-4 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-4 animate-fade-in-up">
        {/* Compact Header */}
        <div className="flex items-center justify-between doom-card px-4 py-3 rounded-xl">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/dashboard"
              className="p-1.5 text-emerald-300/75 hover:text-amber-200 hover:bg-emerald-500/10 rounded-md transition"
              title="Back to Admin Dashboard"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="font-display text-sm font-bold tracking-wider text-buildops uppercase leading-tight">
                Gate Attendance Scanner
              </h1>
              <p className="text-[11px] text-emerald-200/60">
                Live ticket verification & arrival check-in desk
              </p>
            </div>
          </div>

          {scanResult && (
            <button
              onClick={handleReset}
              className="text-xs doom-btn-secondary px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
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
                ? 'bg-emerald-950/75 border-emerald-400/45 text-emerald-200'
                : statusAlert.type === 'warning'
                ? 'bg-amber-950/70 border-amber-400/45 text-amber-200'
                : 'bg-rose-950/70 border-rose-500/45 text-rose-200'
            }`}
          >
            {statusAlert.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            ) : statusAlert.type === 'warning' ? (
              <Clock size={16} className="shrink-0 text-amber-300" />
            ) : (
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
            )}
            <span>{statusAlert.message}</span>
          </div>
        )}

        {/* Balanced 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Scanner & Manual Input */}
          <div className="lg:col-span-5 doom-card p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
              <span className="text-[11px] font-display font-bold text-emerald-300 uppercase tracking-widest">
                Live Camera
              </span>
              <span className="text-[10px] text-amber-200/75 font-mono-tech uppercase">
                Auto Detect
              </span>
            </div>

            <QRScanner
              onScanSuccess={(code) => {
                if (!loading && !checkinLoading) {
                  setManualInput(code);
                  handleValidate(code);
                }
              }}
              isScanningActive={!scanResult && !loading && !checkinLoading}
            />

            {/* Manual Lookup Row */}
            <div className="pt-3 border-t border-emerald-500/20 space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-200/75">
                Manual Fallback Lookup
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                  placeholder="Registration ID or TKT-..."
                  className="flex-1 rounded-lg px-3 py-1.5 text-xs font-mono-tech uppercase placeholder:normal-case doom-input"
                />
                <button
                  onClick={() => handleValidate()}
                  disabled={loading}
                  className="doom-btn-primary text-xs font-display tracking-wider uppercase px-3.5 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  <Search size={13} /> Verify
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Verification & Check-in Details */}
          <div className="lg:col-span-7 doom-card p-4 rounded-xl flex flex-col justify-between min-h-[340px]">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20 mb-3">
                <h2 className="text-[11px] font-display font-bold text-amber-200/90 uppercase tracking-widest">
                  Verification Result
                </h2>
                {scanResult?.team && (
                  <span className="text-[10px] font-mono-tech text-emerald-300">
                    ID: {scanResult.team.registration_id}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="py-16 text-center text-emerald-300/70">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-400" />
                  <p className="text-xs font-display tracking-wider uppercase">Validating ticket...</p>
                </div>
              ) : scanResult?.team ? (
                <div className="space-y-3 text-xs">
                  {/* Team Card */}
                  <div className="p-3.5 doom-panel rounded-lg space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-display text-sm font-bold text-emerald-50 uppercase leading-tight">
                          {scanResult.team.team_name}
                        </h3>
                        <p className="text-emerald-200/65 text-[11px] mt-0.5">{scanResult.team.college_name}</p>
                      </div>
                      <span className="font-mono-tech font-bold text-amber-200 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-300/35 text-[11px]">
                        {scanResult.team.registration_id}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/15">
                      <div>
                        <span className="text-emerald-200/55 block text-[10px] uppercase">Payment:</span>
                        <span className={`font-bold ${scanResult.team.payment_status === 'SUCCESS' ? 'text-emerald-glow' : 'text-amber-300'}`}>
                          {scanResult.team.payment_status}
                        </span>
                      </div>
                      <div>
                        <span className="text-emerald-200/55 block text-[10px] uppercase">Arrival:</span>
                        <span className={`font-bold ${scanResult.team.attendance_status === 'ARRIVED' ? 'text-emerald-300' : 'text-emerald-200/70'}`}>
                          {scanResult.team.attendance_status === 'ARRIVED' ? 'ARRIVED & CHECKED IN' : 'NOT ARRIVED'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Registered Participants */}
                  <div>
                    <p className="font-display font-bold text-emerald-200/80 text-[10px] mb-1.5 uppercase tracking-widest">
                      Participants
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {scanResult.team.members.map((m) => (
                        <div key={m.id} className="p-2.5 doom-panel rounded-lg">
                          <div className="flex justify-between items-center font-semibold">
                            <span className="text-emerald-50 truncate">{m.full_name}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 rounded ml-1 uppercase">
                              {m.member_role}
                            </span>
                          </div>
                          <p className="text-emerald-200/70 text-[10px] mt-0.5">{m.email}</p>
                          <p className="text-emerald-300/75 font-mono-tech text-[10px]">{m.mobile_number}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {scanResult.already_arrived && (
                    <div className="p-2.5 bg-amber-950/60 rounded-lg border border-amber-400/35 text-amber-200 text-xs flex items-center gap-2">
                      <Clock size={16} className="shrink-0 text-amber-300" />
                      <span className="text-[11px]">
                        This team has already been checked in. Duplicate gate entry is not permitted.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-14 text-center text-emerald-200/50">
                  <Users size={32} className="mx-auto mb-2 opacity-40 text-emerald-400" />
                  <p className="text-xs font-display font-semibold text-emerald-100/80 uppercase tracking-wider">
                    No Ticket Loaded
                  </p>
                  <p className="text-[11px] text-emerald-200/55 mt-1 max-w-xs mx-auto">
                    Point the camera at an attendee's E-Ticket QR code or enter their registration ID on the left.
                  </p>
                </div>
              )}
            </div>

            {/* Check In Action Button */}
            {scanResult?.team && (
              <div className="pt-3 border-t border-emerald-500/20 mt-4">
                {scanResult.ready_for_checkin ? (
                  <button
                    onClick={handleCheckIn}
                    disabled={checkinLoading}
                    className="w-full doom-btn-primary font-display tracking-wider uppercase py-2.5 px-4 rounded-lg text-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 size={16} />
                    {checkinLoading ? 'Recording Check-in...' : 'Mark as Arrived (Confirm Gate Entry)'}
                  </button>
                ) : scanResult.already_arrived ? (
                  <button
                    disabled
                    className="w-full bg-emerald-950/50 text-emerald-200/50 font-semibold py-2 px-4 rounded-lg text-xs cursor-not-allowed border border-emerald-500/20"
                  >
                    Already Checked In
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full bg-rose-950/60 text-rose-300 font-semibold py-2 px-4 rounded-lg text-xs cursor-not-allowed border border-rose-500/35"
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

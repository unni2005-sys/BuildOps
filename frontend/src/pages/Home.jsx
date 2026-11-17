import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, Ticket, Award, QrCode, CheckCircle2, ArrowRight } from 'lucide-react';

export const Home = () => {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="bg-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-teal-900/50 text-teal-300 border border-teal-700/60 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
            Official Registration & Management Portal
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            National Buildathon 2026
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            Compete in teams of two, showcase technical innovation, receive digital tickets, and earn verified individual participation certificates.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {isAuthenticated ? (
              <Link
                to={isAdmin ? "/admin/dashboard" : "/student/dashboard"}
                className="bg-teal-600 hover:bg-teal-500 text-white font-semibold px-6 py-3 rounded-md shadow flex items-center gap-2 transition"
              >
                Go to {isAdmin ? "Admin Panel" : "My Dashboard"}
                <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="bg-teal-600 hover:bg-teal-500 text-white font-semibold px-6 py-3 rounded-md shadow flex items-center gap-2 transition"
                >
                  Register Team of Two
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/login"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold px-6 py-3 rounded-md transition"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Highlights / Features Grid */}
      <main className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-md bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
              <Users size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Teams of Two</h3>
            <p className="text-sm text-slate-600">
              Form a two-member team with your peer. Both participants are registered under a unified team registration ID.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Ticket size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Digital E-Ticket</h3>
            <p className="text-sm text-slate-600">
              Instant PDF ticket generation with an embedded secure QR token sent directly to both members' emails.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <QrCode size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">QR Gate Check-in</h3>
            <p className="text-sm text-slate-600">
              Fast, camera-based arrival verification at the venue gate with automatic prevention of duplicate check-ins.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Award size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Individual Certificates</h3>
            <p className="text-sm text-slate-600">
              Personalized ReportLab PDF certificates generated automatically for each participant upon arrival verification.
            </p>
          </div>
        </div>

        {/* Event Schedule Info */}
        <div className="mt-12 bg-white rounded-lg border border-slate-200 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Event Details & Guidelines</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-xs uppercase text-slate-500 font-bold mb-1">Date & Time</p>
              <p className="font-semibold text-slate-800">November 28 - 29, 2026</p>
              <p className="text-slate-600 text-xs mt-0.5">36-Hour Hackathon & Build Event</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 font-bold mb-1">Venue Location</p>
              <p className="font-semibold text-slate-800">Innovation & Technology Hub</p>
              <p className="text-slate-600 text-xs mt-0.5">Campus Main Hall, Block C</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 font-bold mb-1">Registration Fee</p>
              <p className="font-semibold text-slate-800">INR 499 per team</p>
              <p className="text-slate-600 text-xs mt-0.5">Includes food, kit, entry pass & certificates</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-6 text-center text-xs border-t border-slate-800">
        <p>&copy; 2026 National Buildathon Committee. All rights reserved.</p>
        <p className="mt-1 text-slate-500">Authorized Personnel: <Link to="/login" className="underline hover:text-slate-300">Staff / Admin Access</Link></p>
      </footer>
    </div>
  );
};

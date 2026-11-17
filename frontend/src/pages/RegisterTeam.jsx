import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Users, AlertCircle, ShieldAlert } from 'lucide-react';

export const RegisterTeam = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    team_name: '',
    college_name: '',
    leader_phone: '',
    member2_name: '',
    member2_email: '',
    member2_phone: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.member2_email.trim().toLowerCase() === user.email.toLowerCase()) {
      setError('Member 2 email must be different from your Team Leader email.');
      return;
    }

    if (formData.member2_phone.trim() === formData.leader_phone.trim()) {
      setError('Member 2 mobile number must be different from Leader mobile number.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/teams/register/', formData);
      navigate('/student/dashboard');
    } catch (err) {
      console.error(err);
      if (err.response?.data) {
        const msg = typeof err.response.data === 'string'
          ? err.response.data
          : Object.values(err.response.data).flat().join(' ');
        setError(msg || 'Team registration failed. Please check the values entered.');
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-6">
          <div className="w-10 h-10 rounded-md bg-teal-50 text-teal-600 flex items-center justify-center">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Register Your Buildathon Team</h1>
            <p className="text-xs text-slate-500">Every team must consist of exactly two participants.</p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-md text-xs flex items-center gap-2 mb-6">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Team Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-l-2 border-teal-600 pl-2">
              Team & Institution Details
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Team Name</label>
              <input
                type="text"
                name="team_name"
                required
                value={formData.team_name}
                onChange={handleChange}
                placeholder="e.g. Neural Ninjas"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">College / Institution Name</label>
              <input
                type="text"
                name="college_name"
                required
                value={formData.college_name}
                onChange={handleChange}
                placeholder="e.g. National Institute of Technology"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Member 1 (Team Leader) */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-900 border-l-2 border-teal-600 pl-2">
              Participant 1 (Team Leader - Logged In)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Leader Name</label>
                <input
                  type="text"
                  disabled
                  value={user?.full_name || ''}
                  className="w-full bg-slate-100 border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Leader Email</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full bg-slate-100 border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Leader Mobile Number</label>
              <input
                type="tel"
                name="leader_phone"
                required
                value={formData.leader_phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Member 2 */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-900 border-l-2 border-teal-600 pl-2">
              Participant 2 (Team Member)
            </h3>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Member 2 Full Name</label>
              <input
                type="text"
                name="member2_name"
                required
                value={formData.member2_name}
                onChange={handleChange}
                placeholder="Full name of second member"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Member 2 Email</label>
                <input
                  type="email"
                  name="member2_email"
                  required
                  value={formData.member2_email}
                  onChange={handleChange}
                  placeholder="member2@college.edu"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Member 2 Mobile Number</label>
                <input
                  type="tel"
                  name="member2_phone"
                  required
                  value={formData.member2_phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-2.5 px-4 rounded-md text-sm transition shadow-sm disabled:opacity-50"
            >
              {loading ? 'Creating Team Registration...' : 'Complete Team Registration'}
            </button>
            <p className="text-center text-xs text-slate-500 mt-2">
              Registration fee of INR 499 is payable after team creation.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

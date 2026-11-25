import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { API_BASE_URL } from './api/client';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DoomsdayAtmosphere } from './components/DoomsdayAtmosphere';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { VerifyEmail } from './pages/VerifyEmail';
import { Home } from './pages/Home';
import { StudentDashboard } from './pages/StudentDashboard';
import { RegisterTeam } from './pages/RegisterTeam';
import { PaymentStatus } from './pages/PaymentStatus';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminScanner } from './pages/AdminScanner';

export function App() {
  // Keep backend warm on load and every 10 minutes while any user/admin tab is open
  useEffect(() => {
    const pingHealth = () => {
      fetch(`${API_BASE_URL}/health/`, { method: 'GET', keepalive: true }).catch(() => {});
    };

    pingHealth();
    const intervalId = setInterval(pingHealth, 10 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-[#030504] text-[#eef2ee] relative">
          <DoomsdayAtmosphere />
          <Navbar />
          <div className="flex-1 relative z-10">
            <Routes>
              {/* Entry & Auth Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />

              {/* Student Routes */}
              <Route
                path="/student/dashboard"
                element={
                  <ProtectedRoute requireStudent={false}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/register-team"
                element={
                  <ProtectedRoute requireStudent={false}>
                    <RegisterTeam />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payment-status"
                element={
                  <ProtectedRoute requireStudent={false}>
                    <PaymentStatus />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/scanner"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminScanner />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

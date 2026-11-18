import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { VerifyEmail } from './pages/VerifyEmail';
import { Home } from './pages/Home';
import { StudentDashboard } from './pages/StudentDashboard';
import { RegisterTeam } from './pages/RegisterTeam';
import { PaymentStatus } from './pages/PaymentStatus';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminScanner } from './pages/AdminScanner';

const RootEntry = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-doom-canvas">
        <p className="text-emerald-300 text-sm font-display tracking-widest uppercase animate-pulse">Initializing...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/admin/dashboard' : '/student/dashboard'} replace />;
  }

  // Directly open the Sign In / Sign Up window (intro video will precede this later)
  return <Navigate to="/login" replace />;
};

export function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-doom-canvas bg-arcane-grid text-emerald-50 relative">
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

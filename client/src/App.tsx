import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { ReportIssue } from './pages/ReportIssue';
import { UserLogin } from './pages/UserLogin';
import { UserSignup } from './pages/UserSignup';
import { AdminLogin } from './pages/AdminLogin';
import { SuperAdminLogin } from './pages/SuperAdminLogin';
import { UserDashboard } from './pages/UserDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';

export const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/report" element={<ReportIssue />} />
            <Route path="/login" element={<UserLogin />} />
            <Route path="/signup" element={<UserSignup />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/superadmin/login" element={<SuperAdminLogin />} />
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

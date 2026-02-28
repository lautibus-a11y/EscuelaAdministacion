import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import DashboardLayout from './components/Layout/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Institutions from './pages/Institutions';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Positions from './pages/Positions';
import Visits from './pages/Visits';
import Stats from './pages/Stats';
import Login from './pages/Login';
import Courses from './pages/Courses';
import Substitutions from './pages/Substitutions';
import ActivityLog from './pages/ActivityLog';
import InstitutionDetail from './pages/InstitutionDetail';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route path="/" element={<Dashboard />} />
            <Route path="/institutions" element={<Institutions />} />
            <Route path="/students" element={<Students />} />
            <Route path="/teachers" element={<Teachers />} />
            <Route path="/positions" element={<Positions />} />
            <Route path="/visits" element={<Visits />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/substitutions" element={<Substitutions />} />
            <Route path="/activity" element={<ActivityLog />} />
            <Route path="/institutions/:id" element={<InstitutionDetail />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

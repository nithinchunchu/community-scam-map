import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { LicenceExpiredModal } from './components/LicenceExpiredModal';

// Pages
import { Home } from './pages/Home';
import { FastReport } from './pages/FastReport';
import { Result } from './pages/Result';
import { MapPage } from './pages/MapPage';
import { AlertsPage } from './pages/AlertsPage';
import { DisputePage } from './pages/DisputePage';
import { PrivacyPage } from './pages/PrivacyPage';
import { AdminPage } from './pages/AdminPage';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-teal selection:text-white">
      {/* Top App Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<FastReport />} />
          <Route path="/result" element={<Result />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/dispute" element={<DisputePage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Global License Expiry Overlay Modal */}
      <LicenceExpiredModal />

      {/* Bottom Sticky Navigation */}
      <Navigation />
    </div>
  );
};

export default App;

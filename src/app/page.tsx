'use client';

import { useAppStore } from '@/store/useAppStore';
import { LoginPage } from '@/components/login/LoginPage';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';

// Lazy load everything except login to minimize initial bundle
const AppShell = dynamic(() => import('@/components/layout/AppShell').then(m => ({ default: m.AppShell })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-screen bg-slate-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>,
});
const DashboardPage = dynamic(() => import('@/components/dashboard/DashboardPage'), {
  ssr: false,
  loading: () => <PageLoader />,
});
const PatientsPage = dynamic(() => import('@/components/patients/PatientsPage').then(m => ({ default: m.PatientsPage })), { ssr: false, loading: () => <PageLoader /> });
const PatientDetailPage = dynamic(() => import('@/components/patients/PatientDetailPage').then(m => ({ default: m.PatientDetailPage })), { ssr: false, loading: () => <PageLoader /> });
const NewObservationPage = dynamic(() => import('@/components/observations/NewObservationPage').then(m => ({ default: m.NewObservationPage })), { ssr: false, loading: () => <PageLoader /> });
const AlertsPage = dynamic(() => import('@/components/alerts/AlertsPage').then(m => ({ default: m.AlertsPage })), { ssr: false, loading: () => <PageLoader /> });
const MonitoringPage = dynamic(() => import('@/components/monitoring/MonitoringPage').then(m => ({ default: m.MonitoringPage })), { ssr: false, loading: () => <PageLoader /> });
const CareAdherencePage = dynamic(() => import('@/components/care/CareAdherencePage').then(m => ({ default: m.CareAdherencePage })), { ssr: false, loading: () => <PageLoader /> });
const SettingsPage = dynamic(() => import('@/components/settings/SettingsPage').then(m => ({ default: m.SettingsPage })), { ssr: false, loading: () => <PageLoader /> });
const AddPatientDialog = dynamic(() => import('@/components/patients/AddPatientDialog').then(m => ({ default: m.AddPatientDialog })), { ssr: false, loading: () => <PageLoader /> });
const AIAssistantPanel = dynamic(() => import('@/components/ai/AIAssistantPanel').then(m => ({ default: m.AIAssistantPanel })), { ssr: false });

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
    </div>
  );
}

function PageRouter() {
  const currentPage = useAppStore((s) => s.currentPage);

  switch (currentPage) {
    case 'dashboard':
      return <DashboardPage />;
    case 'patients':
      return <PatientsPage />;
    case 'patient-detail':
      return <PatientDetailPage />;
    case 'new-observation':
      return <NewObservationPage />;
    case 'risk-analysis':
      return <PatientDetailPage />;
    case 'alerts':
      return <AlertsPage />;
    case 'monitoring':
      return <MonitoringPage />;
    case 'care-adherence':
      return <CareAdherencePage />;
    case 'settings':
      return <SettingsPage />;
    case 'add-patient':
      return <AddPatientDialog />;
    default:
      return <DashboardPage />;
  }
}

export default function Home() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const selectedPatient = useAppStore((s) => s.selectedPatient);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <AppShell>
      <div className="relative">
        <PageRouter />
        {selectedPatient && (
          <>
            <button
              onClick={() => setAiPanelOpen(true)}
              className="fixed bottom-6 right-6 z-50 bg-teal-600 hover:bg-teal-700 text-white rounded-full p-3.5 shadow-lg transition-colors"
              aria-label="Open AI Assistant"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            <AIAssistantPanel
              open={aiPanelOpen}
              onOpenChange={setAiPanelOpen}
              patientId={selectedPatient.id}
              patientName={selectedPatient.name}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}
'use client';

import { useAppStore } from '@/store/useAppStore';
import { LoginPage } from '@/components/login/LoginPage';
import { AppShell } from '@/components/layout/AppShell';
import DashboardPage from '@/components/dashboard/DashboardPage';
import { PatientsPage } from '@/components/patients/PatientsPage';
import { PatientDetailPage } from '@/components/patients/PatientDetailPage';
import { NewObservationPage } from '@/components/observations/NewObservationPage';
import { AlertsPage } from '@/components/alerts/AlertsPage';
import { MonitoringPage } from '@/components/monitoring/MonitoringPage';
import { CareAdherencePage } from '@/components/care/CareAdherencePage';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { AddPatientDialog } from '@/components/patients/AddPatientDialog';
import { useState } from 'react';
import { AIAssistantPanel } from '@/components/ai/AIAssistantPanel';
import { Sparkles } from 'lucide-react';

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
        {/* AI Assistant floating button - visible when a patient is selected */}
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
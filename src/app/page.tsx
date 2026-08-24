'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Shield, Mail, Lock, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/useAppStore';
import type { User } from '@/types';

/* ------------------------------------------------------------------ */
/*  Error Boundary                                                     */
/* ------------------------------------------------------------------ */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white p-8">
          <div className="max-w-lg w-full bg-red-50 border border-red-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Rendering Error</h2>
            <pre className="text-sm text-red-700 whitespace-pre-wrap break-words">
              {this.state.error?.message}
            </pre>
            <pre className="text-xs text-red-500 mt-2 whitespace-pre-wrap break-words max-h-40 overflow-auto">
              {this.state.error?.stack}
            </pre>
            <Button
              className="mt-4"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Retry
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/*  Loading Spinner                                                    */
/* ------------------------------------------------------------------ */
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Login Page (inline – no dynamic import)                            */
/* ------------------------------------------------------------------ */
function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const login = useAppStore((s) => s.login);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      alert('Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      // Auto-seed if database is empty
      try {
        const patientsRes = await fetch('/api/patients');
        const patients = await patientsRes.json();
        if (!Array.isArray(patients) || patients.length === 0) {
          await fetch('/api/seed', { method: 'POST' });
        }
      } catch { /* ignore */ }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Invalid credentials');
      }
      const data = (await res.json()) as { user: User };
      login(data.user);
      setCurrentPage('dashboard');
    } catch (err: any) {
      alert(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      try {
        const patientsRes = await fetch('/api/patients');
        const patients = await patientsRes.json();
        if (!Array.isArray(patients) || patients.length === 0) {
          await fetch('/api/seed', { method: 'POST' });
        }
      } catch {
        /* ignore seed failure */
      }

      const res = await fetch('/api/auth/demo', { method: 'POST' });
      if (!res.ok) {
        if (res.status === 404) {
          await fetch('/api/seed', { method: 'POST' });
          const retryRes = await fetch('/api/auth/demo', { method: 'POST' });
          if (!retryRes.ok) throw new Error('Demo setup failed');
          const user = (await retryRes.json()) as { user: User };
          login(user.user);
          setCurrentPage('dashboard');
          return;
        }
        throw new Error('Demo login failed');
      }
      const data = (await res.json()) as { user: User };
      login(data.user);
      setCurrentPage('dashboard');
    } catch (err: any) {
      alert(err.message || 'Demo login failed.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left branding panel (desktop) */}
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 relative overflow-hidden flex-col justify-between p-10 lg:p-16">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute top-20 left-10 w-64 h-64 border-2 border-white rounded-full" />
          <div className="absolute top-40 right-20 w-48 h-48 border-2 border-white rounded-full" />
          <div className="absolute bottom-32 left-1/4 w-32 h-32 border-2 border-white rounded-lg rotate-45" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-white rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border border-white rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white rounded-full" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              AeroGuard <span className="font-light text-teal-200">AI</span>
            </h1>
          </div>
          <p className="text-lg text-teal-100/90 max-w-md leading-relaxed font-light">
            Prevent complications before they become serious.
          </p>
        </div>

        <div className="relative z-10">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 max-w-lg">
            <p className="text-xs text-teal-100/70 leading-relaxed">
              AeroGuard AI is a preventive-care support and early-warning prototype. It does not
              diagnose medical conditions or replace healthcare professionals.
            </p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full md:w-1/2 lg:w-[45%] flex items-center justify-center p-6 sm:p-10 lg:p-16 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="md:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              AeroGuard <span className="font-light text-teal-600">AI</span>
            </h1>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Welcome back</h2>
              <p className="text-sm text-slate-500 mt-1.5">Sign in to your account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="doctor@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-slate-50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 bg-slate-50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Signing in...</> : 'Sign In'}
              </Button>
            </form>

            <div className="relative my-6">
              <Separator className="bg-slate-200" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-slate-400 uppercase tracking-wider">
                or
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleDemoLogin}
              disabled={demoLoading}
              className="w-full h-11 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium rounded-lg"
            >
              {demoLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Loading demo...</> : 'Demo Login (Doctor)'}
            </Button>
          </div>

          {/* Demo credentials hint */}
          <div className="mt-5 bg-slate-50 rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Demo Credentials</p>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => { setEmail('doctor@demo.com'); setPassword('demo123'); }}
                className="flex items-center gap-2 w-full text-left group"
              >
                <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-teal-700">D</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700 group-hover:text-teal-700 transition-colors">doctor@demo.com</p>
                  <p className="text-[11px] text-slate-400">Doctor · any password</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('caregiver@demo.com'); setPassword('demo123'); }}
                className="flex items-center gap-2 w-full text-left group"
              >
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-amber-700">C</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700 group-hover:text-teal-700 transition-colors">caregiver@demo.com</p>
                  <p className="text-[11px] text-slate-400">Caregiver · any password</p>
                </div>
              </button>
            </div>
          </div>

          <div className="md:hidden mt-6">
            <p className="text-[11px] text-slate-400 text-center leading-relaxed px-4">
              AeroGuard AI is a preventive-care support prototype.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App View – loads heavy components after authentication              */
/* ------------------------------------------------------------------ */
function AppView() {
  const [ready, setReady] = useState(false);
  const [Shell, setShell] = useState<React.ComponentType<{ children: React.ReactNode }> | null>(null);
  const [pages, setPages] = useState<Record<string, React.ComponentType<any>> | null>(null);
  const currentPage = useAppStore((s) => s.currentPage);
  const selectedPatient = useAppStore((s) => s.selectedPatient);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      import('@/components/layout/AppShell').then(m => ({ k: 'Shell', c: m.AppShell })),
      import('@/components/dashboard/DashboardPage').then(m => ({ k: 'Dashboard', c: m.default })),
      import('@/components/patients/PatientsPage').then(m => ({ k: 'Patients', c: m.PatientsPage })),
      import('@/components/patients/PatientDetailPage').then(m => ({ k: 'PatientDetail', c: m.PatientDetailPage })),
      import('@/components/observations/NewObservationPage').then(m => ({ k: 'NewObs', c: m.NewObservationPage })),
      import('@/components/alerts/AlertsPage').then(m => ({ k: 'Alerts', c: m.AlertsPage })),
      import('@/components/monitoring/MonitoringPage').then(m => ({ k: 'Monitoring', c: m.MonitoringPage })),
      import('@/components/care/CareAdherencePage').then(m => ({ k: 'Care', c: m.CareAdherencePage })),
      import('@/components/settings/SettingsPage').then(m => ({ k: 'Settings', c: m.SettingsPage })),
      import('@/components/ai/AIAssistantPanel').then(m => ({ k: 'AI', c: m.AIAssistantPanel })),
    ]).then(mods => {
      let shell: any = null;
      const p: Record<string, any> = {};
      for (const m of mods) {
        if (m.k === 'Shell') shell = m.c;
        else p[m.k] = m.c;
      }
      setShell(() => shell);
      setPages(p);
      setReady(true);
    }).catch(err => {
      console.error('Failed to load app modules:', err);
    });
  }, []);

  if (!ready || !Shell || !pages) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mx-auto mb-4" />
          <p className="text-sm text-slate-500">Loading AeroGuard AI…</p>
        </div>
      </div>
    );
  }

  const map: Record<string, React.ComponentType<any>> = {
    dashboard: pages.Dashboard,
    patients: pages.Patients,
    'patient-detail': pages.PatientDetail,
    'new-observation': pages.NewObs,
    'risk-analysis': pages.PatientDetail,
    alerts: pages.Alerts,
    monitoring: pages.Monitoring,
    'care-adherence': pages.Care,
    settings: pages.Settings,
  };

  const Page = map[currentPage] || pages.Dashboard;

  return (
    <Shell>
      <Suspense fallback={<PageLoader />}>
        <Page />
      </Suspense>
      {selectedPatient && (
        <>
          <button
            onClick={() => setAiOpen(true)}
            className="fixed bottom-6 right-6 z-50 bg-teal-600 hover:bg-teal-700 text-white rounded-full p-3.5 shadow-lg transition-colors"
            aria-label="Open AI Assistant"
          >
            <Sparkles className="w-5 h-5" />
          </button>
          {React.createElement(pages.AI, {
            open: aiOpen,
            onOpenChange: setAiOpen,
            patientId: selectedPatient.id,
            patientName: selectedPatient.name,
          })}
        </>
      )}
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function Home() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  return (
    <ErrorBoundary>
      {isAuthenticated ? <AppView /> : <LoginPage />}
    </ErrorBoundary>
  );
}

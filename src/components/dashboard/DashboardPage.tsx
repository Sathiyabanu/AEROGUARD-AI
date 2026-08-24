'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  AlertTriangle,
  Shield,
  TrendingUp,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Minus,
  Activity,
  Bell,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { PatientWithLatest, Alert } from '@/types';

type RiskTrend = 'stable' | 'increasing' | 'decreasing';

// ── Helper: Relative date ────────────────────────────────────────
function relativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ── Helper: Greeting ─────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Helper: Risk sort order ──────────────────────────────────────
function riskSortOrder(level: string | null | undefined): number {
  if (level === 'HIGH') return 0;
  if (level === 'ELEVATED') return 1;
  return 2;
}

// ── Trend icon ───────────────────────────────────────────────────
function TrendIcon({ trend }: { trend: RiskTrend | undefined }) {
  if (trend === 'increasing') {
    return <ChevronUp className="h-4 w-4 text-red-500" />;
  }
  if (trend === 'decreasing') {
    return <ChevronDown className="h-4 w-4 text-emerald-500" />;
  }
  return <Minus className="h-4 w-4 text-slate-400" />;
}

function TrendLabel({ trend }: { trend: RiskTrend | undefined }) {
  if (trend === 'increasing') return <span className="text-red-600 text-xs font-medium">Rising</span>;
  if (trend === 'decreasing') return <span className="text-emerald-600 text-xs font-medium">Falling</span>;
  return <span className="text-slate-500 text-xs font-medium">Stable</span>;
}

// ── Risk bar (small colored bar based on score) ──────────────────
function RiskScoreBar({ score }: { score: number | null | undefined }) {
  const s = score ?? 0;
  const clamped = Math.min(100, Math.max(0, s));
  const barColor =
    clamped >= 70 ? 'bg-red-500' : clamped >= 40 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-slate-700 tabular-nums w-8">{score != null ? Math.round(s) : '—'}</span>
      <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

// ── Loading skeleton ─────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="space-y-1">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      {/* Attention section */}
      <Skeleton className="h-48 rounded-xl" />
      {/* Table */}
      <Skeleton className="h-72 rounded-xl" />
      {/* Chart */}
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────
export default function DashboardPage() {
  const { currentUser, selectPatient, setCurrentPage } = useAppStore();
  const [patients, setPatients] = useState<PatientWithLatest[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<{ date: string; avgRisk: number }[]>([]);

  // ── Fetch data on mount ───────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      try {
        const [patientsRes, alertsRes] = await Promise.all([
          fetch('/api/patients'),
          fetch('/api/alerts'),
        ]);
        if (!patientsRes.ok || !alertsRes.ok) throw new Error('Failed to fetch');
        const patientsData = await patientsRes.json();
        const alertsData = await alertsRes.json();
        setPatients(Array.isArray(patientsData) ? patientsData : []);
        setAlerts(Array.isArray(alertsData) ? alertsData : []);

        // Build chart data: fetch monitoring history for trend
        // We use patient risk data to build a simple aggregate trend
        const riskRes = await fetch('/api/risk');
        if (riskRes.ok) {
          const riskData = await riskRes.json();
          buildChartData(riskData);
        }
      } catch {
        // Silently handle — dashboard shows empty state
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function buildChartData(riskData: any[]) {
    if (!Array.isArray(riskData) || riskData.length === 0) return;

    // Group by date and compute average
    const dateMap = new Map<string, number[]>();
    for (const r of riskData) {
      const d = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown';
      if (!dateMap.has(d)) dateMap.set(d, []);
      dateMap.get(d)!.push(r.riskScore);
    }

    const entries = Array.from(dateMap.entries())
      .map(([date, scores]) => ({
        date,
        avgRisk: Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10,
      }))
      .slice(-14); // Last 14 data points

    setChartData(entries);
  }

  // ── Computed values ───────────────────────────────────────────
  const totalPatients = patients.length;
  const lowRiskCount = patients.filter((p) => p.latestRiskLevel === 'LOW').length;
  const elevatedRiskCount = patients.filter((p) => p.latestRiskLevel === 'ELEVATED').length;
  const highRiskCount = patients.filter((p) => p.latestRiskLevel === 'HIGH').length;
  const activeAlertCount = alerts.filter((a) => a.status === 'active').length;

  const patientsNeedingAttention = useMemo(
    () =>
      patients
        .filter((p) => p.latestRiskLevel === 'ELEVATED' || p.latestRiskLevel === 'HIGH')
        .sort((a, b) => riskSortOrder(a.latestRiskLevel) - riskSortOrder(b.latestRiskLevel)),
    [patients],
  );

  const sortedPatients = useMemo(
    () => [...patients].sort((a, b) => riskSortOrder(a.latestRiskLevel) - riskSortOrder(b.latestRiskLevel)),
    [patients],
  );

  // ── Handlers ──────────────────────────────────────────────────
  function handleViewPatient(patient: PatientWithLatest) {
    selectPatient(patient as any);
    setCurrentPage('patient-detail');
  }

  // ── Render ────────────────────────────────────────────────────
  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {/* ── Greeting ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {getGreeting()}, {currentUser?.name ?? 'Doctor'}
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Here is your patient&apos;s preventive monitoring overview.
        </p>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Patients */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-slate-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Total Patients</p>
              <p className="text-xl font-bold text-slate-900 tabular-nums">{totalPatients}</p>
            </div>
          </CardContent>
        </Card>

        {/* Low Risk */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Low Risk</p>
              <p className="text-xl font-bold text-emerald-700 tabular-nums">{lowRiskCount}</p>
            </div>
          </CardContent>
        </Card>

        {/* Elevated Risk */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Elevated Risk</p>
              <p className="text-xl font-bold text-amber-700 tabular-nums">{elevatedRiskCount}</p>
            </div>
          </CardContent>
        </Card>

        {/* High Risk */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">High Risk</p>
              <p className="text-xl font-bold text-red-700 tabular-nums">{highRiskCount}</p>
            </div>
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0 relative">
              <Bell className="h-5 w-5 text-red-600" />
              {activeAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeAlertCount > 9 ? '9+' : activeAlertCount}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Active Alerts</p>
              <p className="text-xl font-bold text-red-700 tabular-nums">{activeAlertCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Patients Requiring Attention ──────────────────────── */}
      {patientsNeedingAttention.length > 0 ? (
        <Card
          className={cn(
            'border-l-4 bg-white shadow-sm',
            patientsNeedingAttention.some((p) => p.latestRiskLevel === 'HIGH')
              ? 'border-l-red-500'
              : 'border-l-amber-400',
          )}
        >
          <CardHeader className="pb-0">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-red-500" />
              <CardTitle className="text-base text-slate-900">
                Patients Requiring Attention
              </CardTitle>
              <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs font-semibold">
                {patientsNeedingAttention.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {patientsNeedingAttention.map((patient) => (
                <div
                  key={patient.id}
                  className={cn(
                    'flex items-center justify-between gap-4 p-3 rounded-lg border',
                    patient.latestRiskLevel === 'HIGH'
                      ? 'bg-red-50/50 border-red-100'
                      : 'bg-amber-50/50 border-amber-100',
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0',
                        patient.latestRiskLevel === 'HIGH' ? 'bg-red-500' : 'bg-amber-500',
                      )}
                    >
                      {patient.name?.charAt(0) ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{patient.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">
                          Score: {patient.latestRiskScore != null ? Math.round(patient.latestRiskScore) : '—'}
                        </span>
                        <RiskBadge level={patient.latestRiskLevel as any} size="sm" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1">
                      <TrendIcon trend={patient.riskTrend as RiskTrend} />
                      <TrendLabel trend={patient.riskTrend as RiskTrend} />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-3 border-slate-200 hover:bg-slate-50"
                      onClick={() => handleViewPatient(patient)}
                    >
                      View
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : totalPatients > 0 ? (
        <Card className="border-emerald-200 bg-emerald-50/30 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Shield className="h-5 w-5 text-emerald-500 shrink-0" />
            <p className="text-sm text-emerald-700 font-medium">
              All patients are within normal parameters. Continue routine monitoring.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Patient Risk Overview Table ────────────────────────── */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-slate-600" />
            <CardTitle className="text-base text-slate-900">Patient Risk Overview</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {sortedPatients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No patients yet.</p>
              <p className="text-slate-400 text-xs mt-1">
                Add patients to start monitoring their risk levels.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Patient ID
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Name
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Risk Score
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Risk Level
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Risk Trend
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Last Observation
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Alert Status
                    </th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sortedPatients.map((patient) => {
                    const patientAlerts = alerts.filter(
                      (a) => a.patientId === patient.id && a.status === 'active',
                    );
                    return (
                      <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-2 text-slate-500 font-mono text-xs whitespace-nowrap">
                          {patient.patientId}
                        </td>
                        <td className="py-3 px-2 font-medium text-slate-900 whitespace-nowrap">
                          {patient.name}
                        </td>
                        <td className="py-3 px-2 whitespace-nowrap">
                          <RiskScoreBar score={patient.latestRiskScore} />
                        </td>
                        <td className="py-3 px-2 whitespace-nowrap">
                          <RiskBadge level={(patient.latestRiskLevel as any) ?? 'LOW'} size="sm" />
                        </td>
                        <td className="py-3 px-2 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <TrendIcon trend={patient.riskTrend as RiskTrend} />
                            <TrendLabel trend={patient.riskTrend as RiskTrend} />
                          </div>
                        </td>
                        <td className="py-3 px-2 text-slate-500 text-xs whitespace-nowrap">
                          {relativeDate(patient.lastObservationDate)}
                        </td>
                        <td className="py-3 px-2 whitespace-nowrap">
                          {patientAlerts.length > 0 ? (
                            <Badge
                              variant="outline"
                              className="bg-red-50 text-red-600 border-red-200 text-xs font-semibold"
                            >
                              {patientAlerts.length} active
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-600 border-emerald-200 text-xs"
                            >
                              Clear
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 px-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            onClick={() => handleViewPatient(patient)}
                          >
                            View
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Risk Trend Chart ──────────────────────────────────── */}
      {chartData.length > 0 && (
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-slate-600" />
              <CardTitle className="text-base text-slate-900">Risk Trend Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                      fontSize: '12px',
                      color: '#334155',
                    }}
                    labelStyle={{ color: '#64748b', fontWeight: 600 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgRisk"
                    name="Average Risk Score"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

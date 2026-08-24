'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Shield,
  ClipboardList,
  ArrowRight,
  Clock,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useAppStore } from '@/store/useAppStore';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { StatusIndicator } from '@/components/shared/StatusIndicator';
import { getRiskMessage, getPreventiveGuidance } from '@/lib/risk-engine';
import type {
  PatientWithLatest,
  RiskAssessment,
  RiskContributor,
  RiskReason,
  ObservationWithRisk,
  CareActivity,
  RiskLevel,
} from '@/types';

// ─── Helpers ───────────────────────────────────────────────────────────────

function relativeDate(dateStr: string): string {
  if (!dateStr) return 'Never';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function riskColor(level: RiskLevel): string {
  switch (level) {
    case 'HIGH':
      return '#dc2626';
    case 'ELEVATED':
      return '#d97706';
    case 'LOW':
      return '#059669';
  }
}

function riskTextColor(level: RiskLevel): string {
  switch (level) {
    case 'HIGH':
      return 'text-red-600';
    case 'ELEVATED':
      return 'text-amber-600';
    case 'LOW':
      return 'text-emerald-600';
  }
}

// ─── Circular Gauge ────────────────────────────────────────────────────────

function RiskGauge({
  score,
  level,
}: {
  score: number;
  level: RiskLevel;
}) {
  const radius = 80;
  const strokeWidth = 14;
  const center = 100;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = riskColor(level);

  return (
    <div className="flex items-center justify-center">
      <svg width="200" height="200" viewBox="0 0 200 200">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        {/* Foreground arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        {/* Score text */}
        <text
          x={center}
          y={center - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          className="font-bold"
          style={{
            fontSize: '42px',
            fill: color,
            fontFamily: 'inherit',
          }}
        >
          {score}
        </text>
        <text
          x={center}
          y={center + 20}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: '13px',
            fill: '#64748b',
            fontFamily: 'inherit',
          }}
        >
          out of 100
        </text>
      </svg>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export function PatientDetailPage() {
  const { selectedPatient, setCurrentPage } = useAppStore();
  const patient = selectedPatient as PatientWithLatest | null;

  // Data states
  const [latestRisk, setLatestRisk] = useState<RiskAssessment | null>(null);
  const [riskHistory, setRiskHistory] = useState<RiskAssessment[]>([]);
  const [monitoringHistory, setMonitoringHistory] = useState<
    ObservationWithRisk[]
  >([]);
  const [careActivities, setCareActivities] = useState<CareActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendDays, setTrendDays] = useState(30);

  // Parsed contributors & reasons from latest risk
  const contributors = useMemo<RiskContributor[]>(() => {
    if (!latestRisk?.contributors) return [];
    try {
      return JSON.parse(latestRisk.contributors);
    } catch {
      return [];
    }
  }, [latestRisk]);

  const reasons = useMemo<RiskReason[]>(() => {
    if (!latestRisk?.reasons) return [];
    try {
      return JSON.parse(latestRisk.reasons);
    } catch {
      return [];
    }
  }, [latestRisk]);

  // Latest observation
  const latestObservation = monitoringHistory[0] ?? null;

  // Risk trend chart data
  const chartData = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - trendDays);

    return riskHistory
      .filter((r) => new Date(r.createdAt) >= cutoff)
      .map((r) => ({
        date: formatDate(r.createdAt),
        score: r.riskScore,
      }));
  }, [riskHistory, trendDays]);

  // Trend detection
  const trendDirection = useMemo(() => {
    if (chartData.length < 2) return 'stable';
    const first = chartData[0].score;
    const last = chartData[chartData.length - 1].score;
    if (last > first + 5) return 'increasing';
    if (last < first - 5) return 'decreasing';
    return 'stable';
  }, [chartData]);

  // Care adherence summary for today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayActivities = careActivities.filter((a) => a.date === todayStr);
  const completedToday = todayActivities.filter(
    (a) => a.status === 'completed'
  ).length;
  const missedToday = todayActivities.filter(
    (a) => a.status === 'missed'
  ).length;
  const todayAdherence =
    todayActivities.length > 0
      ? Math.round((completedToday / todayActivities.length) * 100)
      : null;

  // ─── Data fetching ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!patient) return;

    async function fetchAll() {
      setLoading(true);
      const params = new URLSearchParams({ patientId: patient.id });

      try {
        const [riskRes, latestRes, historyRes, careRes] = await Promise.all([
          fetch(`/api/risk?${params}`),
          fetch(`/api/risk/latest?${params}`),
          fetch(`/api/monitoring-history?${params}`),
          fetch(`/api/care-activities?${params}`),
        ]);

        if (riskRes.ok) setRiskHistory(await riskRes.json());
        if (latestRes.ok) {
          const data = await latestRes.json();
          setLatestRisk(data);
        }
        if (historyRes.ok) setMonitoringHistory(await historyRes.json());
        if (careRes.ok) setCareActivities(await careRes.json());
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [patient]);

  // ─── No patient guard ──────────────────────────────────────────────────

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-slate-500">No patient selected.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => setCurrentPage('patients')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patients
        </Button>
      </div>
    );
  }

  const riskScore = latestRisk?.riskScore ?? 0;
  const riskLevel = (latestRisk?.riskLevel ?? 'LOW') as RiskLevel;

  // Baseline comparison data
  const baselineComparison = latestObservation
    ? [
        {
          label: 'Pressure',
          baseline: patient.baselinePressure,
          current: latestObservation.pressure,
          unit: '',
          higherIsWorse: true,
        },
        {
          label: 'Redness',
          baseline: patient.baselineRedness,
          current: latestObservation.redness,
          unit: '',
          higherIsWorse: true,
        },
        {
          label: 'Discharge',
          baseline: patient.baselineDischarge,
          current: latestObservation.discharge,
          unit: '',
          higherIsWorse: true,
        },
        {
          label: 'Care Adherence',
          baseline: patient.baselineAdherence,
          current: latestObservation.careAdherence,
          unit: '%',
          higherIsWorse: false,
        },
      ]
    : [];

  // ─── Loading skeleton ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        className="text-slate-600 hover:text-slate-900 -ml-2 px-2"
        onClick={() => setCurrentPage('patients')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Patients
      </Button>

      {/* Patient header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                variant="outline"
                className="bg-slate-100 text-slate-600 border-slate-200 font-mono text-xs"
              >
                {patient.patientId}
              </Badge>
              <Badge
                className={
                  patient.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }
                variant="outline"
              >
                {patient.status === 'active' ? '● Active' : '● Inactive'}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">
              {patient.name}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
              <span>Age: {patient.age}</span>
              <span>{patient.tracheostomyInfo}</span>
            </div>
          </div>
          <div className="text-sm text-slate-500 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            Last observation:{' '}
            {latestObservation
              ? relativeDate(latestObservation.createdAt)
              : 'Never'}
          </div>
        </div>
      </div>

      {/* ── CURRENT RISK SECTION ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row items-center gap-6">
          {/* Left: Text info */}
          <div className="flex-1 text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Prevention Risk Score
            </p>
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
              <span className={`text-5xl font-bold ${riskTextColor(riskLevel)}`}>
                {riskScore}
              </span>
              <span className="text-xl text-slate-400 font-light">/ 100</span>
              <RiskBadge level={riskLevel} size="lg" />
            </div>
            <p className="text-sm text-slate-600 max-w-md">
              {getRiskMessage(riskLevel)}
            </p>
          </div>

          {/* Right: Circular gauge */}
          <RiskGauge score={riskScore} level={riskLevel} />
        </div>
      </div>

      {/* ── RISK CONTRIBUTORS ────────────────────────────────────────────── */}
      {contributors.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            Risk Contributors
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {contributors.map((c) => (
              <div
                key={c.factor}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-2"
              >
                <StatusIndicator status={c.status} label={c.factor} />
                {c.points > 0 && (
                  <span className="text-sm font-semibold text-red-600">
                    +{c.points} pts
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PERSONALIZED BASELINE COMPARISON ──────────────────────────────── */}
      {baselineComparison.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Personalized Baseline Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-slate-500 font-medium pb-3 pr-4">
                    Metric
                  </th>
                  <th className="text-right text-slate-500 font-medium pb-3 px-4">
                    Baseline
                  </th>
                  <th className="text-right text-slate-500 font-medium pb-3 px-4">
                    Current
                  </th>
                  <th className="text-right text-slate-500 font-medium pb-3 pl-4">
                    Change
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {baselineComparison.map((row) => {
                  const change =
                    Math.round((row.current - row.baseline) * 100) / 100;
                  const isWorse = row.higherIsWorse
                    ? change > 0
                    : change < 0;
                  const isSignificant =
                    row.label === 'Care Adherence'
                      ? Math.abs(change) >= 10
                      : Math.abs(change) >= 0.3;

                  return (
                    <tr key={row.label}>
                      <td className="py-3 pr-4 font-medium text-slate-700">
                        {row.label}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {row.baseline}
                        {row.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        {row.current}
                        {row.unit}
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            isWorse && isSignificant
                              ? 'text-red-600'
                              : isWorse
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                          }`}
                        >
                          {change > 0 ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : change < 0 ? (
                            <TrendingDown className="w-3.5 h-3.5" />
                          ) : (
                            <Minus className="w-3.5 h-3.5" />
                          )}
                          {change > 0 ? '+' : ''}
                          {change}
                          {row.unit}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── EXPLAINABLE RISK ANALYSIS ────────────────────────────────────── */}
      {reasons.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <Accordion type="single" collapsible>
            <AccordionItem value="risk-analysis" className="border-none">
              <AccordionTrigger className="py-0 hover:no-underline">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <span className="font-semibold text-slate-900">
                    Why did the risk increase?
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {/* Reasons list */}
                  <ul className="space-y-2">
                    {reasons.map((r, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-slate-700"
                      >
                        <CheckCircle2 className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <span>
                          <span className="font-medium">{r.factor}:</span>{' '}
                          {r.description}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Points breakdown */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Points Breakdown
                    </p>
                    <div className="space-y-1.5">
                      {contributors
                        .filter((c) => c.points > 0)
                        .map((c) => (
                          <div
                            key={c.factor}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-slate-600">{c.factor}</span>
                            <span className="font-semibold text-red-600">
                              +{c.points}
                            </span>
                          </div>
                        ))}
                      <div className="flex items-center justify-between text-sm font-bold pt-2 border-t border-slate-200">
                        <span className="text-slate-900">Total Score</span>
                        <span className={riskTextColor(riskLevel)}>
                          {riskScore} / 100
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      {/* ── RISK TREND CHART ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Risk Trend</h2>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {([7, 30, 90] as const).map((days) => (
              <button
                key={days}
                onClick={() => setTrendDays(days)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  trendDays === days
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>

        {chartData.length >= 2 ? (
          <>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      fontSize: '13px',
                    }}
                    formatter={(value: number) => [value, 'Risk Score']}
                  />
                  <ReferenceLine
                    y={30}
                    stroke="#d97706"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                  <ReferenceLine
                    y={60}
                    stroke="#dc2626"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={riskColor(riskLevel)}
                    strokeWidth={2.5}
                    dot={{ fill: riskColor(riskLevel), r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Trend warning */}
            {trendDirection === 'increasing' && (
              <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Risk has increased from {chartData[0].score} to{' '}
                  {chartData[chartData.length - 1].score} over the selected
                  period.
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-48 text-sm text-slate-400">
            {chartData.length === 0
              ? 'No risk data available for this period.'
              : 'Need at least 2 data points to show a trend.'}
          </div>
        )}
      </div>

      {/* ── PREVENTIVE GUIDANCE ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-teal-50 rounded-lg">
            <Shield className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Preventive Guidance
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {getPreventiveGuidance(riskLevel)}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => setCurrentPage('new-observation')}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Activity className="w-4 h-4 mr-2" />
            New Observation
          </Button>
          <Button
            variant="outline"
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
            onClick={() => setCurrentPage('monitoring')}
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            View Full History
          </Button>
        </div>
      </div>

      {/* ── CARE ADHERENCE SUMMARY ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Care Adherence Summary
          </h2>
          {todayAdherence !== null && (
            <Badge
              className={
                todayAdherence >= 80
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : todayAdherence >= 50
                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                    : 'bg-red-100 text-red-700 border-red-200'
              }
              variant="outline"
            >
              {todayAdherence}% today
            </Badge>
          )}
        </div>

        {todayActivities.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">
                {todayActivities.length}
              </p>
              <p className="text-xs text-slate-500">Total Activities</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <p className="text-2xl font-bold text-emerald-600">
                {completedToday}
              </p>
              <p className="text-xs text-slate-500">Completed</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {missedToday}
              </p>
              <p className="text-xs text-slate-500">Missed</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400 mb-4">
            No care activities recorded for today.
          </p>
        )}

        <Button
          variant="ghost"
          className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 -ml-2 px-2"
          onClick={() => setCurrentPage('care-adherence')}
        >
          View Details
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

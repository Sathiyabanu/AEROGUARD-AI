'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  CalendarDays,
  BarChart3,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/types';

type DateRange = 7 | 30 | 90;

interface ObservationWithRisk {
  id: string;
  patientId: string;
  pressure: number;
  redness: number;
  discharge: number;
  secretionLevel: string;
  careAdherence: number;
  symptoms: string;
  swelling: number;
  createdAt: string;
  riskAssessment?: {
    id: string;
    riskScore: number;
    riskLevel: string;
    createdAt: string;
  } | null;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function riskScoreColor(score: number): string {
  if (score >= 60) return 'text-red-600 font-bold';
  if (score >= 30) return 'text-amber-600 font-semibold';
  return 'text-emerald-600 font-semibold';
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 text-red-500" />;
  if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />;
  return <Minus className="h-3.5 w-3.5 text-slate-400" />;
}

function MonitoringSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <Skeleton className="h-10 w-full mb-2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full mb-1" />
        ))}
      </div>
    </div>
  );
}

export function MonitoringPage() {
  const { selectPatient, setCurrentPage } = useAppStore();
  const [allPatients, setAllPatients] = useState<Array<{ id: string; patientId: string; name: string }>>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [observations, setObservations] = useState<ObservationWithRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>(30);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch('/api/patients');
      if (res.ok) {
        const data = await res.json();
        setAllPatients(data);
        if (data.length > 0 && !selectedPatientId) {
          setSelectedPatientId(data[0].id);
        }
      }
    } catch {
      // silent
    }
  }, [selectedPatientId]);

  const fetchHistory = useCallback(async () => {
    if (!selectedPatientId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/monitoring-history?patientId=${selectedPatientId}`);
      if (res.ok) {
        const data = await res.json();
        setObservations(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    if (selectedPatientId) {
      fetchHistory();
    }
  }, [selectedPatientId, fetchHistory]);

  const filteredByDate = observations.filter((obs) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - dateRange);
    return new Date(obs.createdAt) >= cutoff;
  });

  const riskScores = filteredByDate
    .map((o) => o.riskAssessment?.riskScore)
    .filter((s): s is number => s != null);

  const avgRisk = riskScores.length > 0
    ? Math.round(riskScores.reduce((a, b) => a + b, 0) / riskScores.length)
    : 0;

  const highestRisk = riskScores.length > 0
    ? Math.max(...riskScores)
    : 0;

  const getTrend = (): 'up' | 'down' | 'stable' => {
    if (riskScores.length < 2) return 'stable';
    const recent = riskScores.slice(0, Math.min(3, riskScores.length));
    const older = riskScores.slice(Math.min(3, riskScores.length), 6);
    if (older.length === 0) return 'stable';
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    if (recentAvg > olderAvg + 3) return 'up';
    if (recentAvg < olderAvg - 3) return 'down';
    return 'stable';
  };

  const trend = getTrend();

  const handleViewPatient = (obs: ObservationWithRisk) => {
    const patient = allPatients.find((p) => p.id === obs.patientId);
    if (patient) {
      selectPatient(patient);
      setCurrentPage('patient-detail');
    }
  };

  const dateRangeButtons: { label: string; value: DateRange }[] = [
    { label: '7 Days', value: 7 },
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Monitoring History</h1>
          <p className="text-slate-500 mt-1">View patient observation timeline and risk trends.</p>
        </div>
        <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
          <SelectTrigger className="w-full sm:w-[240px]">
            <SelectValue placeholder="Select Patient" />
          </SelectTrigger>
          <SelectContent>
            {allPatients.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.patientId})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!loading && selectedPatientId && filteredByDate.length > 0 && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <CalendarDays className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Total Observations</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{filteredByDate.length}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Avg Risk Score</span>
              </div>
              <p className={cn('text-2xl', riskScoreColor(avgRisk))}>{avgRisk}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                {highestRisk >= 60 ? (
                  <ArrowUpRight className="h-4 w-4 text-red-500" />
                ) : highestRisk >= 30 ? (
                  <ArrowUpRight className="h-4 w-4 text-amber-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-emerald-500" />
                )}
                <span className="text-xs font-medium uppercase tracking-wide">Highest Risk</span>
              </div>
              <p className={cn('text-2xl', riskScoreColor(highestRisk))}>{highestRisk}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <TrendIcon trend={trend} />
                <span className="text-xs font-medium uppercase tracking-wide">Latest Trend</span>
              </div>
              <p className={cn(
                'text-2xl font-bold capitalize',
                trend === 'up' ? 'text-red-600' : trend === 'down' ? 'text-emerald-600' : 'text-slate-600'
              )}>
                {trend}
              </p>
            </div>
          </div>

          {/* Date range filter */}
          <div className="flex gap-2">
            {dateRangeButtons.map((btn) => (
              <Button
                key={btn.value}
                variant={dateRange === btn.value ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  dateRange === btn.value
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
                onClick={() => setDateRange(btn.value)}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        </>
      )}

      {/* Content */}
      {loading ? (
        <MonitoringSkeleton />
      ) : !selectedPatientId ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
            <Activity className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">Select a Patient</h3>
          <p className="text-slate-500 mt-1">Choose a patient to view their monitoring history.</p>
        </div>
      ) : filteredByDate.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
            <CalendarDays className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">No observations recorded yet.</h3>
          <p className="text-slate-500 mt-1">No monitoring data available for the selected period.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">Date</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">Pressure</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">Redness</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">Discharge</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">Secretions</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">Adherence</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">Risk Score</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">Risk Level</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredByDate.map((obs) => {
                  const isExpanded = expandedRow === obs.id;
                  const score = obs.riskAssessment?.riskScore;
                  const level = obs.riskAssessment?.riskLevel as RiskLevel | undefined;

                  return (
                    <React.Fragment key={obs.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => setExpandedRow(isExpanded ? null : obs.id)}
                      >
                        <TableCell className="text-sm text-slate-700">
                          {formatDate(obs.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className={cn(
                            obs.pressure > 7 ? 'text-red-600 font-medium' :
                            obs.pressure > 4 ? 'text-amber-600 font-medium' :
                            'text-slate-700'
                          )}>
                            {obs.pressure}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className={cn(
                            obs.redness > 70 ? 'text-red-600 font-medium' :
                            obs.redness > 40 ? 'text-amber-600 font-medium' :
                            'text-slate-700'
                          )}>
                            {obs.redness}%
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className={cn(
                            obs.discharge > 70 ? 'text-red-600 font-medium' :
                            obs.discharge > 40 ? 'text-amber-600 font-medium' :
                            'text-slate-700'
                          )}>
                            {obs.discharge}%
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-xs capitalize',
                              obs.secretionLevel === 'high' ? 'bg-red-100 text-red-700' :
                              obs.secretionLevel === 'moderate' ? 'bg-amber-100 text-amber-700' :
                              'bg-emerald-100 text-emerald-700'
                            )}
                          >
                            {obs.secretionLevel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className={cn(
                            obs.careAdherence < 50 ? 'text-red-600 font-medium' :
                            obs.careAdherence < 75 ? 'text-amber-600 font-medium' :
                            'text-emerald-600 font-medium'
                          )}>
                            {obs.careAdherence}%
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {score != null ? (
                            <span className={cn('text-base font-bold', riskScoreColor(score))}>
                              {score}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {level ? <RiskBadge level={level} size="sm" /> : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewPatient(obs);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                      {/* Expanded detail row */}
                      {isExpanded && (
                        <TableRow key={`${obs.id}-detail`} className="bg-slate-50 hover:bg-slate-50">
                          <TableCell colSpan={9} className="p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-slate-500 text-xs font-medium uppercase">Swelling</span>
                                <p className={cn(
                                  obs.swelling > 70 ? 'text-red-600 font-medium' :
                                  obs.swelling > 40 ? 'text-amber-600 font-medium' :
                                  'text-slate-700'
                                )}>
                                  {obs.swelling}%
                                </p>
                              </div>
                              <div className="sm:col-span-2">
                                <span className="text-slate-500 text-xs font-medium uppercase">Symptoms / Notes</span>
                                <p className="text-slate-700 mt-0.5">
                                  {obs.symptoms || 'No symptoms or notes recorded.'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCircle2, Eye, Clock, ArrowRight, ShieldAlert, XCircle } from 'lucide-react';
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
import { RiskBadge } from '@/components/shared/RiskBadge';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import type { Patient, RiskLevel, AlertStatus } from '@/types';

type StatusFilter = 'all' | AlertStatus;
type LevelFilter = 'all' | 'HIGH' | 'ELEVATED';

interface AlertItem {
  id: string;
  patientId: string;
  alertLevel: string;
  message: string;
  previousScore: number | null;
  newScore: number | null;
  mainContributors: string;
  recommendedAction: string;
  status: string;
  createdAt: string;
  patientName: string;
}

function relativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function AlertSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-3" />
      <div className="bg-slate-50 rounded-lg p-3 mb-3">
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-32 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}

export function AlertsPage() {
  const { selectPatient, setCurrentPage } = useAppStore();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [patientFilter, setPatientFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch {
      // silent fail
    }
  }, []);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch('/api/patients');
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchAlerts(), fetchPatients()]).finally(() => setLoading(false));
  }, [fetchAlerts, fetchPatients]);

  const handleUpdateStatus = async (alertId: string, status: 'reviewed' | 'dismissed') => {
    setUpdating(alertId);
    try {
      const res = await fetch(`/api/alerts?id=${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, status } : a)));
      }
    } catch {
      // silent fail
    } finally {
      setUpdating(null);
    }
  };

  const handleViewPatient = (alert: AlertItem) => {
    const patient = patients.find((p) => p.id === alert.patientId);
    if (patient) {
      selectPatient(patient);
      setCurrentPage('patient-detail');
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (patientFilter !== 'all' && alert.patientId !== patientFilter) return false;
    if (statusFilter !== 'all' && alert.status !== statusFilter) return false;
    if (levelFilter !== 'all' && alert.alertLevel !== levelFilter) return false;
    return true;
  });

  const activeCount = alerts.filter((a) => a.status === 'active').length;

  const statusBadgeStyles: Record<string, string> = {
    active: 'bg-red-100 text-red-700 border-red-200',
    reviewed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dismissed: 'bg-slate-100 text-slate-500 border-slate-200',
  };

  const borderColorMap: Record<string, string> = {
    HIGH: 'border-l-red-500',
    ELEVATED: 'border-l-amber-500',
    LOW: 'border-l-emerald-500',
  };

  const parsedContributors = (jsonStr: string): string[] => {
    try {
      return JSON.parse(jsonStr);
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Alerts</h1>
        <p className="text-slate-500 mt-1">Review and manage preventive alerts for your patients.</p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={patientFilter} onValueChange={setPatientFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Patients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Patients</SelectItem>
            {patients.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active{activeCount > 0 ? ` (${activeCount})` : ''}</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as LevelFilter)}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="ELEVATED">Elevated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <AlertSkeleton key={i} />
          ))}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">No active alerts</h3>
          <p className="text-slate-500 mt-1">All patients are within normal parameters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const contributors = parsedContributors(alert.mainContributors);
            const isUpdating = updating === alert.id;

            return (
              <div
                key={alert.id}
                className={cn(
                  'bg-white rounded-xl border border-slate-200 shadow-sm p-5 border-l-[3px]',
                  borderColorMap[alert.alertLevel] || 'border-l-slate-300'
                )}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <RiskBadge level={alert.alertLevel as RiskLevel} />
                    <button
                      onClick={() => handleViewPatient(alert)}
                      className="text-sm font-semibold text-slate-800 hover:text-teal-600 transition-colors"
                    >
                      {alert.patientName}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={cn('text-xs font-medium', statusBadgeStyles[alert.status])}
                    >
                      {alert.status === 'active' && <Bell className="h-3 w-3 mr-1" />}
                      {alert.status === 'reviewed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {alert.status === 'dismissed' && <XCircle className="h-3 w-3 mr-1" />}
                      {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                    </Badge>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {relativeTime(alert.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Message */}
                <p className="text-sm text-slate-700 mb-2">{alert.message}</p>

                {/* Score change */}
                {alert.previousScore != null && alert.newScore != null && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-slate-500">Risk increased:</span>
                    <span className="text-sm font-semibold text-slate-700">
                      {alert.previousScore}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-red-500" />
                    <span className={cn(
                      'text-sm font-bold',
                      alert.newScore >= 60 ? 'text-red-600' : 'text-amber-600'
                    )}>
                      {alert.newScore}
                    </span>
                  </div>
                )}

                {/* Main contributors */}
                {contributors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {contributors.map((c, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-100"
                      >
                        {c}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Recommended action */}
                <div className="bg-slate-50 rounded-lg p-3 mb-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Recommended Action
                  </p>
                  <p className="text-sm text-slate-700">{alert.recommendedAction}</p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {alert.status === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus(alert.id, 'reviewed')}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Mark as Reviewed
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-teal-700 border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                    onClick={() => handleViewPatient(alert)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    View Patient
                  </Button>
                  {alert.status === 'active' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus(alert.id, 'dismissed')}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1.5" />
                      Dismiss
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

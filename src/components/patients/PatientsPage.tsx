'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Bell,
  Eye,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/store/useAppStore';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { PatientWithLatest, RiskLevel } from '@/types';

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

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'increasing')
    return <TrendingUp className="w-4 h-4 text-red-500" />;
  if (trend === 'decreasing')
    return <TrendingDown className="w-4 h-4 text-emerald-500" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
}

function TrendLabel({ trend }: { trend: string }) {
  if (trend === 'increasing') return 'Increasing';
  if (trend === 'decreasing') return 'Decreasing';
  return 'Stable';
}

export function PatientsPage() {
  const { setCurrentPage, selectPatient } = useAppStore();
  const [patients, setPatients] = useState<PatientWithLatest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchPatients() {
      try {
        const res = await fetch('/api/patients');
        if (res.ok) {
          const data = await res.json();
          setPatients(data);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchPatients();
  }, []);

  const filtered = useMemo(() => {
    let result = patients;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.patientId.toLowerCase().includes(q)
      );
    }

    if (riskFilter !== 'all') {
      result = result.filter(
        (p) => p.latestRiskLevel === riskFilter
      );
    }

    return result;
  }, [patients, search, riskFilter]);

  function handleViewDetails(patient: PatientWithLatest) {
    selectPatient(patient);
    setCurrentPage('patient-detail');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage and monitor your patients&apos; preventive care status.
        </p>
      </div>

      {/* Top bar: Search + Filter + Add */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name or patient ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Risk Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="LOW">Low Risk</SelectItem>
            <SelectItem value="ELEVATED">Elevated Risk</SelectItem>
            <SelectItem value="HIGH">High Risk</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={() => setCurrentPage('add-patient')}
          className="bg-teal-600 hover:bg-teal-700 text-white w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Patient
        </Button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <Users className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No patients found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            {search || riskFilter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by adding your first patient.'}
          </p>
          {!search && riskFilter === 'all' && (
            <Button
              onClick={() => setCurrentPage('add-patient')}
              className="bg-teal-600 hover:bg-teal-700 text-white mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Patient
            </Button>
          )}
        </div>
      )}

      {/* Patient cards grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((patient) => (
            <div
              key={patient.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col hover:shadow-md transition-shadow"
            >
              {/* Top row: ID badge + Status */}
              <div className="flex items-center justify-between mb-3">
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

              {/* Name */}
              <h3 className="font-semibold text-lg text-slate-900">
                {patient.name}
              </h3>

              {/* Age + tracheostomy info */}
              <p className="text-sm text-slate-500 mt-1">
                Age {patient.age} &middot;{' '}
                <span className="truncate inline-block max-w-[200px] align-bottom">
                  {patient.tracheostomyInfo}
                </span>
              </p>

              {/* Risk score + badge + trend */}
              <div className="flex items-center gap-3 mt-4">
                <span
                  className={`text-3xl font-bold ${
                    (patient.latestRiskLevel as RiskLevel) === 'HIGH'
                      ? 'text-red-600'
                      : (patient.latestRiskLevel as RiskLevel) === 'ELEVATED'
                        ? 'text-amber-600'
                        : patient.latestRiskScore != null
                          ? 'text-emerald-600'
                          : 'text-slate-300'
                  }`}
                >
                  {patient.latestRiskScore != null
                    ? patient.latestRiskScore
                    : '—'}
                </span>
                {patient.latestRiskLevel && (
                  <RiskBadge
                    level={patient.latestRiskLevel as RiskLevel}
                    size="sm"
                  />
                )}
                {patient.riskTrend && (
                  <div className="flex items-center gap-1 ml-auto">
                    <TrendIcon trend={patient.riskTrend} />
                    <span className="text-xs text-slate-500">
                      <TrendLabel trend={patient.riskTrend} />
                    </span>
                  </div>
                )}
              </div>

              {/* Last observation + alerts */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                <span>
                  Last:{' '}
                  {patient.lastObservationDate
                    ? relativeDate(patient.lastObservationDate)
                    : 'Never'}
                </span>
                {(patient.activeAlertCount ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-red-600 font-medium">
                    <Bell className="w-3.5 h-3.5" />
                    {patient.activeAlertCount} alert
                    {patient.activeAlertCount! > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* View details button */}
              <Button
                variant="outline"
                className="mt-4 w-full border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                onClick={() => handleViewDetails(patient)}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

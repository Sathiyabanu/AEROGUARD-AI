'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ClipboardCheck,
  Heart,
  Sparkles,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Stethoscope,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface CareActivity {
  id: string;
  patientId: string;
  activityName: string;
  status: string;
  date: string;
  createdAt: string;
}

interface AdherenceDay {
  date: string;
  total: number;
  completed: number;
  missed: number;
  adherencePercent: number;
}

const ACTIVITY_META: Record<string, { icon: React.ReactNode; label: string }> = {
  'Stoma Care': { icon: <Heart className="h-4 w-4" />, label: 'Stoma Care' },
  'Tube Care': { icon: <Stethoscope className="h-4 w-4" />, label: 'Tube Care' },
  'Cleaning': { icon: <Sparkles className="h-4 w-4" />, label: 'Cleaning' },
  'Observation': { icon: <Eye className="h-4 w-4" />, label: 'Observation' },
};

const ALL_ACTIVITIES = ['Stoma Care', 'Tube Care', 'Cleaning', 'Observation'];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function barColor(percent: number): string {
  if (percent >= 80) return '#059669'; // emerald-600
  if (percent >= 50) return '#d97706'; // amber-600
  return '#dc2626'; // red-600
}

function adherenceBadgeStyle(percent: number): string {
  if (percent >= 80) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (percent >= 50) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: AdherenceDay }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-slate-700 mb-1">{formatDate(data.date)}</p>
      <p className="text-slate-500">Completed: <span className="text-emerald-600 font-medium">{data.completed}</span></p>
      <p className="text-slate-500">Missed: <span className="text-red-600 font-medium">{data.missed}</span></p>
      <p className="text-slate-500">Total: <span className="text-slate-700 font-medium">{data.total}</span></p>
      <p className="mt-1 font-semibold" style={{ color: barColor(data.adherencePercent) }}>
        Adherence: {data.adherencePercent}%
      </p>
    </div>
  );
}

function AdherenceSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-4 w-full mt-4" />
          <Skeleton className="h-10 w-32 mt-2" />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-10 w-full mb-2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full mb-1" />
        ))}
      </div>
    </div>
  );
}

export function CareAdherencePage() {
  const [patients, setPatients] = useState<Array<{ id: string; patientId: string; name: string }>>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [todayActivities, setTodayActivities] = useState<CareActivity[]>([]);
  const [adherenceData, setAdherenceData] = useState<AdherenceDay[]>([]);
  const [allActivities, setAllActivities] = useState<CareActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch('/api/patients');
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
        if (data.length > 0 && !selectedPatientId) {
          setSelectedPatientId(data[0].id);
        }
      }
    } catch {
      // silent
    }
  }, [selectedPatientId]);

  const fetchCareData = useCallback(async () => {
    if (!selectedPatientId) return;
    setLoading(true);
    try {
      const today = getTodayStr();
      const [todayRes, adherenceRes, allRes] = await Promise.all([
        fetch(`/api/care-activities?patientId=${selectedPatientId}&date=${today}`),
        fetch(`/api/care-activities/adherence?patientId=${selectedPatientId}`),
        fetch(`/api/care-activities?patientId=${selectedPatientId}`),
      ]);

      if (todayRes.ok) setTodayActivities(await todayRes.json());
      if (adherenceRes.ok) setAdherenceData(await adherenceRes.json());
      if (allRes.ok) setAllActivities(await allRes.json());
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
      fetchCareData();
    }
  }, [selectedPatientId, fetchCareData]);

  // Compute today's adherence
  const todayCompleted = todayActivities.filter((a) => a.status === 'completed').length;
  const todayTotal = todayActivities.length;
  const todayPercent = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 100;
  const showWarning = todayTotal > 0 && todayPercent < 75;

  // Ensure all 4 activities shown even if missing
  const displayActivities = ALL_ACTIVITIES.map((name) => {
    const found = todayActivities.find((a) => a.activityName === name);
    if (found) return found;
    return {
      id: `missing-${name}`,
      patientId: selectedPatientId,
      activityName: name,
      status: 'pending',
      date: getTodayStr(),
      createdAt: new Date().toISOString(),
    };
  });

  // Filter history
  const filteredHistory = allActivities.filter((a) => {
    if (activityFilter !== 'all' && a.activityName !== activityFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    return true;
  });

  // Chart data with day label
  const chartData = adherenceData.map((d) => ({
    ...d,
    day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Care Adherence</h1>
          <p className="text-slate-500 mt-1">Track and manage care activity completion.</p>
        </div>
        <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
          <SelectTrigger className="w-full sm:w-[240px]">
            <SelectValue placeholder="Select Patient" />
          </SelectTrigger>
          <SelectContent>
            {patients.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.patientId})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <AdherenceSkeleton />
      ) : !selectedPatientId ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
            <ClipboardCheck className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">Select a Patient</h3>
          <p className="text-slate-500 mt-1">Choose a patient to view their care adherence.</p>
        </div>
      ) : (
        <>
          {/* Warning card */}
          {showWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Adherence Below Target</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Care adherence has decreased. Increased monitoring may be appropriate.
                </p>
              </div>
            </div>
          )}

          {/* Top section: Today's Activities + Weekly Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Care Activities */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-slate-900">Today&apos;s Activities</h2>
                <Badge
                  variant="outline"
                  className={cn('text-sm font-semibold px-3 py-1', adherenceBadgeStyle(todayPercent))}
                >
                  {todayPercent}%
                </Badge>
              </div>

              <div className="space-y-3 mb-5">
                {displayActivities.map((activity) => {
                  const meta = ACTIVITY_META[activity.activityName] || {
                    icon: <ClipboardCheck className="h-4 w-4" />,
                    label: activity.activityName,
                  };
                  const isCompleted = activity.status === 'completed';
                  const isMissed = activity.status === 'missed';

                  return (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'h-9 w-9 rounded-lg flex items-center justify-center',
                          isCompleted ? 'bg-emerald-100 text-emerald-600' :
                          isMissed ? 'bg-red-100 text-red-600' :
                          'bg-slate-100 text-slate-400'
                        )}>
                          {meta.icon}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{meta.label}</p>
                          {activity.status !== 'pending' && activity.createdAt && (
                            <p className="text-xs text-slate-400">{formatTime(activity.createdAt)}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCompleted && (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Completed
                          </span>
                        )}
                        {isMissed && (
                          <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                            <XCircle className="h-3.5 w-3.5" />
                            Missed
                          </span>
                        )}
                        {activity.status === 'pending' && (
                          <span className="text-xs text-slate-400">Pending</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Daily Adherence</span>
                  <span className={cn(
                    'text-2xl font-bold',
                    todayPercent >= 80 ? 'text-emerald-600' :
                    todayPercent >= 50 ? 'text-amber-600' :
                    'text-red-600'
                  )}>
                    {todayPercent}%
                  </span>
                </div>
                <div className="relative h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      todayPercent >= 80 ? 'bg-emerald-500' :
                      todayPercent >= 50 ? 'bg-amber-500' :
                      'bg-red-500'
                    )}
                    style={{ width: `${todayPercent}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400">
                  {todayCompleted} of {todayTotal} activities completed
                </p>
              </div>
            </div>

            {/* Weekly Adherence Chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-5">Weekly Adherence</h2>
              {chartData.length > 0 ? (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => `${v}%`}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="adherencePercent" radius={[6, 6, 0, 0]} maxBarSize={48}>
                        {chartData.map((entry, index) => (
                          <Cell key={index} fill={barColor(entry.adherencePercent)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">
                  No adherence data for the past 7 days.
                </div>
              )}
            </div>
          </div>

          {/* Activity History */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Activity History</h2>
              <div className="flex gap-2">
                <Select value={activityFilter} onValueChange={setActivityFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Activities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    {ALL_ACTIVITIES.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No care activities recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase">Date</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase">Activity</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((activity) => {
                      const meta = ACTIVITY_META[activity.activityName];
                      return (
                        <TableRow key={activity.id}>
                          <TableCell className="text-sm text-slate-700">
                            {formatDate(activity.date)}
                          </TableCell>
                          <TableCell className="text-sm text-slate-700">
                            <div className="flex items-center gap-2">
                              {meta && (
                                <span className={cn(
                                  'h-6 w-6 rounded flex items-center justify-center',
                                  activity.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                                  'bg-red-100 text-red-600'
                                )}>
                                  {meta.icon}
                                </span>
                              )}
                              {activity.activityName}
                            </div>
                          </TableCell>
                          <TableCell>
                            {activity.status === 'completed' ? (
                              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
                                <XCircle className="h-3 w-3 mr-1" />
                                Missed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {formatTime(activity.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

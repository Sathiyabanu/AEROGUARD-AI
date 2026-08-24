'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  Bell,
  Database,
  Download,
  RotateCcw,
  User,
  Info,
  AlertTriangle,
  Mail,
  BarChart3,
  ClipboardCheck,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Notification toggle item ─────────────────────────────────────
interface NotificationToggle {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const notificationToggles: NotificationToggle[] = [
  {
    id: 'high-risk-alerts',
    label: 'Email alerts for high-risk patients',
    description: 'Receive an email notification when a patient\'s risk level reaches ELEVATED or HIGH.',
    icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
  },
  {
    id: 'daily-summary',
    label: 'Daily monitoring summary',
    description: 'Get a daily digest of all patient observations and risk changes at the end of each day.',
    icon: <BarChart3 className="h-4 w-4 text-slate-500" />,
  },
  {
    id: 'care-adherence',
    label: 'Care adherence reminders',
    description: 'Be reminded when scheduled care activities are missed or not recorded.',
    icon: <ClipboardCheck className="h-4 w-4 text-amber-500" />,
  },
  {
    id: 'weekly-trends',
    label: 'Weekly trend reports',
    description: 'Receive a weekly summary of risk trends and patient progress across all monitored patients.',
    icon: <TrendingUp className="h-4 w-4 text-teal-500" />,
  },
];

// ── Component ────────────────────────────────────────────────────
export function SettingsPage() {
  const { currentUser } = useAppStore();

  // Edit profile dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');

  // Notification preferences (local state only)
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    'high-risk-alerts': true,
    'daily-summary': true,
    'care-adherence': false,
    'weekly-trends': true,
  });

  // Seed loading
  const [seeding, setSeeding] = useState(false);

  const userInitials = currentUser?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? 'U';

  function handleOpenEditDialog() {
    setEditName(currentUser?.name ?? '');
    setEditDialogOpen(true);
  }

  function handleSaveProfile() {
    if (!editName.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }
    toast.success('Profile updated successfully (demo).');
    setEditDialogOpen(false);
  }

  function handleToggleNotification(id: string, checked: boolean) {
    setNotifications((prev) => ({ ...prev, [id]: checked }));
    toast.success(
      `${notificationToggles.find((n) => n.id === id)?.label ?? id} ${checked ? 'enabled' : 'disabled'}.`
    );
  }

  async function handleSeedData() {
    setSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      if (!res.ok) throw new Error('Seed failed');
      toast.success('Demo data seeded successfully!');
    } catch {
      toast.error('Failed to seed demo data. Please try again.');
    } finally {
      setSeeding(false);
    }
  }

  function handleExportData() {
    toast.info('Export feature coming soon.');
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your account preferences and system configuration.
        </p>
      </div>

      {/* ── Profile Section ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-slate-500" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar className="h-16 w-16 text-lg font-semibold">
              <AvatarFallback className="bg-teal-100 text-teal-700">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <h3 className="text-lg font-semibold text-slate-900">
                {currentUser?.name}
              </h3>
              <p className="text-sm text-slate-500">{currentUser?.email}</p>
              <Badge
                variant="outline"
                className="mt-1 capitalize text-xs"
              >
                {currentUser?.role ?? '—'}
              </Badge>
            </div>
            <Button
              variant="outline"
              className="self-start sm:self-center"
              onClick={handleOpenEditDialog}
            >
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Notification Preferences ────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-slate-500" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {notificationToggles.map((item, index) => (
            <div key={item.id}>
              <div className="flex items-start gap-3 py-4">
                <div className="mt-0.5 shrink-0">{item.icon}</div>
                <div className="flex-1 space-y-1">
                  <label
                    htmlFor={item.id}
                    className="text-sm font-medium text-slate-900 cursor-pointer"
                  >
                    {item.label}
                  </label>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <Switch
                  id={item.id}
                  checked={notifications[item.id] ?? false}
                  onCheckedChange={(checked) =>
                    handleToggleNotification(item.id, checked)
                  }
                />
              </div>
              {index < notificationToggles.length - 1 && (
                <Separator />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── System Information ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5 text-slate-500" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  App Version
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  AeroGuard AI v1.0.0 (Prototype)
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Database Status
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Local SQLite via Prisma ORM
                </p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
                Connected
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Risk Engine Version
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Deterministic threshold-based scoring
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                v1.0
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Data Management ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-slate-500" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Button
              variant="outline"
              onClick={handleSeedData}
              disabled={seeding}
              className="w-full sm:w-auto"
            >
              {seeding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              {seeding ? 'Seeding...' : 'Seed Demo Data'}
            </Button>
            <p className="text-xs text-amber-600 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              This will reset all existing data.
            </p>
          </div>
          <Separator />
          <div>
            <Button
              variant="outline"
              onClick={handleExportData}
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── About ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Info className="h-5 w-5 text-slate-500" />
            About AeroGuard AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Shield className="h-10 w-10 text-teal-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm text-slate-700 leading-relaxed">
                AeroGuard AI is a preventive care decision-support platform
                designed for tracheostomy patient monitoring. It provides
                real-time risk assessment, care adherence tracking, and
                explainable AI-powered guidance to healthcare professionals.
              </p>
              <p className="text-sm font-medium text-teal-700">
                Built for preventive care, not diagnosis.
              </p>
            </div>
          </div>
          <Separator />
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800">
                  Medical Disclaimer
                </p>
                <p className="text-xs text-amber-700 leading-relaxed mt-1">
                  AeroGuard AI is a decision-support tool for informational
                  purposes only. It does not provide medical diagnoses or
                  replace professional clinical judgment. Always consult
                  qualified healthcare professionals for clinical decisions.
                  All risk assessments are based on deterministic threshold
                  models and should be interpreted as preliminary indicators,
                  not definitive diagnoses.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Edit Profile Dialog ──────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                value={currentUser?.email ?? ''}
                disabled
                className="bg-slate-50"
              />
              <p className="text-xs text-slate-500">
                Email cannot be changed in this demo.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveProfile}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

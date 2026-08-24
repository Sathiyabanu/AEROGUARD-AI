'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  Shield,
  LayoutDashboard,
  Users,
  Bell,
  Activity,
  ClipboardCheck,
  Settings,
  LogOut,
  Menu,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Disclaimer } from '@/components/shared/Disclaimer';
import { useAppStore } from '@/store/useAppStore';
import type { PageView } from '@/types';

// --- Navigation Config ---

interface NavItem {
  label: string;
  page: PageView;
  icon: ReactNode;
  showBadge?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', page: 'dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Patients', page: 'patients', icon: <Users className="w-5 h-5" /> },
  { label: 'Alerts', page: 'alerts', icon: <Bell className="w-5 h-5" />, showBadge: true },
  { label: 'Monitoring', page: 'monitoring', icon: <Activity className="w-5 h-5" /> },
  { label: 'Care Adherence', page: 'care-adherence', icon: <ClipboardCheck className="w-5 h-5" /> },
  { label: 'Settings', page: 'settings', icon: <Settings className="w-5 h-5" /> },
];

// --- Breadcrumb Config ---

const breadcrumbMap: Record<PageView, { parent?: string; current: string }> = {
  dashboard: { current: 'Dashboard' },
  patients: { current: 'Patients' },
  'patient-detail': { parent: 'Patients', current: 'Patient Detail' },
  'new-observation': { parent: 'Patients', current: 'New Observation' },
  'risk-analysis': { parent: 'Patients', current: 'Risk Analysis' },
  alerts: { current: 'Alerts' },
  monitoring: { current: 'Monitoring' },
  'care-adherence': { current: 'Care Adherence' },
  settings: { current: 'Settings' },
  'add-patient': { parent: 'Patients', current: 'Add Patient' },
  login: { current: 'Login' },
};

// --- Sidebar Nav Component ---

function SidebarNav({
  currentPage,
  setCurrentPage,
  alertCount,
  onNavigate,
}: {
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;
  alertCount: number;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Main navigation">
      {navItems.map((item) => {
        const isActive = currentPage === item.page;
        return (
          <button
            key={item.page}
            onClick={() => {
              setCurrentPage(item.page);
              onNavigate?.();
            }}
            className={
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ' +
              (isActive
                ? 'bg-slate-100 text-slate-900 font-medium'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')
            }
          >
            <span className={isActive ? 'text-teal-700' : 'text-slate-400'}>{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.showBadge && alertCount > 0 && (
              <Badge className="bg-red-500 text-white border-0 text-[10px] px-1.5 py-0 min-w-[20px] justify-center h-5">
                {alertCount}
              </Badge>
            )}
          </button>
        );
      })}
    </nav>
  );
}

// --- Sidebar User Section ---

function SidebarUser({
  userName,
  userRole,
  onLogout,
}: {
  userName: string;
  userRole: string;
  onLogout: () => void;
}) {
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1);

  return (
    <div className="px-3 py-4 border-t border-slate-200">
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="w-9 h-9">
          <AvatarFallback className="bg-teal-100 text-teal-700 text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{userName}</p>
          <p className="text-xs text-slate-500 truncate">{roleLabel}</p>
        </div>
      </div>
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign out</span>
      </button>
    </div>
  );
}

// --- Desktop Sidebar ---

function DesktopSidebar({
  currentPage,
  setCurrentPage,
  alertCount,
  userName,
  userRole,
  onLogout,
}: {
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;
  alertCount: number;
  userName: string;
  userRole: string;
  onLogout: () => void;
}) {
  return (
    <aside className="hidden md:flex md:w-[280px] md:flex-col md:fixed md:inset-y-0 bg-white border-r border-slate-200 z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-100 shrink-0">
        <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-semibold text-slate-900 tracking-tight">
          AeroGuard <span className="font-light text-teal-600">AI</span>
        </span>
      </div>

      {/* Nav */}
      <SidebarNav
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        alertCount={alertCount}
      />

      {/* User section */}
      <SidebarUser userName={userName} userRole={userRole} onLogout={onLogout} />
    </aside>
  );
}

// --- Mobile Sidebar (Sheet) ---

function MobileSidebar({
  currentPage,
  setCurrentPage,
  alertCount,
  userName,
  userRole,
  onLogout,
  open,
  onOpenChange,
}: {
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;
  alertCount: number;
  userName: string;
  userRole: string;
  onLogout: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="flex flex-row items-center gap-2.5 px-5 h-16 border-b border-slate-100 shrink-0 space-y-0">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <SheetTitle className="text-lg font-semibold text-slate-900 tracking-tight">
            AeroGuard <span className="font-light text-teal-600">AI</span>
          </SheetTitle>
        </SheetHeader>

        <SidebarNav
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          alertCount={alertCount}
          onNavigate={() => onOpenChange(false)}
        />

        <SidebarUser userName={userName} userRole={userRole} onLogout={onLogout} />
      </SheetContent>
    </Sheet>
  );
}

// --- Header ---

function AppHeader({
  currentPage,
  setCurrentPage,
  alertCount,
  userName,
  userRole,
  onMenuClick,
}: {
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;
  alertCount: number;
  userName: string;
  userRole: string;
  onMenuClick: () => void;
}) {
  const crumbs = breadcrumbMap[currentPage] || { current: 'Dashboard' };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0">
      {/* Left: menu + breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </Button>

        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.parent && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    className="cursor-pointer"
                    onClick={() =>
                      setCurrentPage(
                        (crumbs.parent === 'Patients' ? 'patients' : 'dashboard') as PageView
                      )
                    }
                  >
                    {crumbs.parent}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <ChevronRight />
                </BreadcrumbSeparator>
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-slate-900">
                {crumbs.current}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right: notification bell + user dropdown */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative shrink-0"
          onClick={() => setCurrentPage('alerts')}
          aria-label="View alerts"
        >
          <Bell className="w-5 h-5 text-slate-500" />
          {alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center border-2 border-white">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-teal-100 text-teal-700 text-sm font-medium">
                  {userName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-slate-900">{userName}</p>
                <p className="text-xs text-slate-500">
                  {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setCurrentPage('settings')}
              className="cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer text-red-600 focus:text-red-600"
              onClick={() => {
                const logout = useAppStore.getState().logout;
                logout();
                toast.success('Signed out successfully.');
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

// --- Main AppShell Component ---

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const currentPage = useAppStore((s) => s.currentPage);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const currentUser = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  const [alertCount, setAlertCount] = useState(0);

  const fetchAlertCount = useCallback(() => {
    fetch('/api/alerts')
      .then((r) => r.json())
      .then((data) => {
        setAlertCount(data.filter((a: any) => a.status === 'active').length);
      })
      .catch(() => {
        // Silently fail - alerts are supplementary
      });
  }, []);

  useEffect(() => {
    fetchAlertCount();
  }, [fetchAlertCount]);

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully.');
  };

  const userName = currentUser?.name || 'User';
  const userRole = currentUser?.role || 'doctor';

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <DesktopSidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        alertCount={alertCount}
        userName={userName}
        userRole={userRole}
        onLogout={handleLogout}
      />

      {/* Mobile Sidebar */}
      <MobileSidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        alertCount={alertCount}
        userName={userName}
        userRole={userRole}
        onLogout={handleLogout}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-[280px]">
        {/* Header */}
        <AppHeader
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          alertCount={alertCount}
          userName={userName}
          userRole={userRole}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>

        {/* Footer (sticky to bottom) */}
        <footer className="mt-auto border-t border-slate-200 bg-white px-4 md:px-6 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <Disclaimer />
            <p className="text-xs text-slate-400 shrink-0">&copy; 2024 AeroGuard AI</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

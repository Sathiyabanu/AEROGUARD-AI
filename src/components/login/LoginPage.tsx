'use client';

import { useState } from 'react';
import { Shield, Mail, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/useAppStore';
import type { User } from '@/types';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const login = useAppStore((s) => s.login);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
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
      toast.success(`Welcome back, ${data.user.name}!`);
    } catch (err: any) {
      toast.error(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      // Check if we need to seed data
      try {
        const patientsRes = await fetch('/api/patients');
        const patients = await patientsRes.json();
        if (!Array.isArray(patients) || patients.length === 0) {
          // Need to seed
          await fetch('/api/seed', { method: 'POST' });
        }
      } catch {
        // Seed failed, try login anyway
      }

      const res = await fetch('/api/auth/demo', { method: 'POST' });
      if (!res.ok) {
        // If no doctor found, try seeding and retry
        if (res.status === 404) {
          await fetch('/api/seed', { method: 'POST' });
          const retryRes = await fetch('/api/auth/demo', { method: 'POST' });
          if (!retryRes.ok) throw new Error('Demo setup failed');
          const user = (await retryRes.json()) as { user: User };
          login(user.user);
          setCurrentPage('dashboard');
          toast.success(`Welcome, ${user.user.name}! Demo mode active.`);
          return;
        }
        throw new Error('Demo login failed');
      }
      const data = (await res.json()) as { user: User };
      login(data.user);
      setCurrentPage('dashboard');
      toast.success(`Welcome, ${data.user.name}! Demo mode active.`);
    } catch (err: any) {
      toast.error(err.message || 'Demo login failed. Please try again.');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleForgotPassword = () => {
    toast.info('Password reset is not available in this prototype.');
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Panel - Branding (hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 relative overflow-hidden flex-col justify-between p-10 lg:p-16">
        {/* Abstract geometric pattern background */}
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute top-20 left-10 w-64 h-64 border-2 border-white rounded-full" />
          <div className="absolute top-40 right-20 w-48 h-48 border-2 border-white rounded-full" />
          <div className="absolute bottom-32 left-1/4 w-32 h-32 border-2 border-white rounded-lg rotate-45" />
          <div className="absolute bottom-16 right-10 w-40 h-40 border-2 border-white rounded-full" />
          <div className="absolute top-1/3 left-1/3 w-20 h-20 bg-white rounded-full" />
          <div className="absolute bottom-1/3 right-1/3 w-12 h-12 bg-white rounded-lg rotate-12" />
          <div className="absolute top-16 right-1/4 w-16 h-16 border-2 border-white rounded-full" />
          {/* Pulse rings - medical monitoring feel */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-white rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border border-white rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white rounded-full" />
          {/* Heartbeat line */}
          <svg className="absolute bottom-40 left-0 w-full h-12 text-white/10" viewBox="0 0 800 50" fill="none" preserveAspectRatio="none">
            <path d="M0,25 L150,25 L170,25 L190,5 L210,45 L230,10 L250,40 L270,25 L350,25 L370,25 L390,5 L410,45 L430,10 L450,40 L470,25 L650,25 L670,25 L690,5 L710,45 L730,10 L750,40 L770,25 L800,25" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* Logo + Tagline */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                AeroGuard <span className="font-light text-teal-200">AI</span>
              </h1>
            </div>
          </div>
          <p className="text-lg text-teal-100/90 max-w-md leading-relaxed font-light">
            Prevent complications before they become serious.
          </p>
        </div>

        {/* Medical disclaimer at bottom */}
        <div className="relative z-10">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 max-w-lg">
            <p className="text-xs text-teal-100/70 leading-relaxed">
              AeroGuard AI is a preventive-care support and early-warning prototype. It does not
              diagnose medical conditions or replace healthcare professionals.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full md:w-1/2 lg:w-[45%] flex items-center justify-center p-6 sm:p-10 lg:p-16 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              AeroGuard <span className="font-light text-teal-600">AI</span>
            </h1>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Welcome back</h2>
              <p className="text-sm text-slate-500 mt-1.5">Sign in to your account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="doctor@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-slate-50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 bg-slate-50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Remember me + Forgot password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                  />
                  <span className="text-sm text-slate-600">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <Separator className="bg-slate-200" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-slate-400 uppercase tracking-wider">
                or
              </span>
            </div>

            {/* Demo Login Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleDemoLogin}
              disabled={demoLoading}
              className="w-full h-11 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium rounded-lg transition-colors"
            >
              {demoLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading demo...
                </>
              ) : (
                'Demo Login (Doctor)'
              )}
            </Button>
          </div>

          {/* Mobile disclaimer */}
          <div className="md:hidden mt-6">
            <p className="text-[11px] text-slate-400 text-center leading-relaxed px-4">
              AeroGuard AI is a preventive-care support prototype. It does not diagnose medical conditions or replace healthcare professionals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

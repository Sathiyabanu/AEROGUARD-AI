'use client';

import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
  status: 'normal' | 'increased' | 'high' | 'moderate' | 'poor';
  label?: string;
  className?: string;
}

const statusColors: Record<string, string> = {
  normal: 'bg-emerald-400',
  increased: 'bg-amber-400',
  high: 'bg-red-400',
  moderate: 'bg-amber-300',
  poor: 'bg-red-400',
};

const statusLabels: Record<string, string> = {
  normal: 'Normal',
  increased: 'Increased',
  high: 'High',
  moderate: 'Moderate',
  poor: 'Poor',
};

export function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className={cn('w-2 h-2 rounded-full', statusColors[status])} />
      <span className="text-sm text-slate-600">{label || statusLabels[status]}</span>
    </div>
  );
}

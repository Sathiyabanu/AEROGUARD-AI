'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RiskLevel } from '@/types';

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const levelStyles: Record<RiskLevel, string> = {
  HIGH: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100',
  ELEVATED: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100',
  LOW: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
};

const levelLabels: Record<RiskLevel, string> = {
  HIGH: 'HIGH',
  ELEVATED: 'ELEVATED',
  LOW: 'LOW',
};

const sizeStyles = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-0.5',
  lg: 'text-sm px-3 py-1',
};

export function RiskBadge({ level, className, size = 'md' }: RiskBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(levelStyles[level], sizeStyles[size], 'font-semibold border', className)}
    >
      {levelLabels[level]}
    </Badge>
  );
}

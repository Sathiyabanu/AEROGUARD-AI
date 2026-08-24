'use client';

import { AlertTriangle } from 'lucide-react';

export function Disclaimer() {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 flex items-start gap-2.5 text-xs text-slate-500 leading-relaxed">
      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
      <span>
        AeroGuard AI is a preventive-care support and early-warning prototype. It does not
        diagnose medical conditions, replace healthcare professionals, or provide emergency medical advice.
      </span>
    </div>
  );
}

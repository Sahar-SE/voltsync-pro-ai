'use client';

import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

export default function AlertsPanel({ alerts }: { alerts: string[] }) {
  const [dismissed, setDismissed] = useState<number[]>([]);
  const visible = alerts.filter((_, i) => !dismissed.includes(i));
  if (visible.length === 0) return null;
  return (
    <div className="mb-3 space-y-1.5">
      {visible.map((alert, i) => (
        <div
          key={alert + i}
          className="flex items-center gap-3 px-4 py-2.5"
          style={{
            background: 'var(--accent-red)11',
            border: '1px solid var(--accent-red)44',
            borderLeft: '3px solid var(--accent-red)',
          }}
        >
          <AlertTriangle size={14} style={{ color: 'var(--accent-red)', flexShrink: 0 }} />
          <span className="font-mono-tech text-xs flex-1" style={{ color: 'var(--accent-red)' }}>
            ⚡ {alert}
          </span>
          <button
            onClick={() => setDismissed(prev => [...prev, i])}
            className="opacity-50 hover:opacity-100 transition-opacity"
          >
            <X size={12} style={{ color: 'var(--accent-red)' }} />
          </button>
        </div>
      ))}
    </div>
  );
}

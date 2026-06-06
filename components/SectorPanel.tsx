'use client';

import { useState } from 'react';
import type { Sector } from '@/lib/gridData';
import { TrendingUp, TrendingDown, Minus, Power, Edit2, Check, X } from 'lucide-react';

type Props = {
  sectors: Sector[];
  onToggle: (id: string) => void;
  onDemandChange: (id: string, demand: number) => void;
};

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'P1', color: 'var(--accent-red)' },
  2: { label: 'P2', color: 'var(--accent-amber)' },
  3: { label: 'P3', color: 'var(--text-muted)' },
};

export default function SectorPanel({ sectors, onToggle, onDemandChange }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');

  const startEdit = (s: Sector) => {
    setEditing(s.id);
    setEditVal(String(s.demand));
  };

  const commitEdit = (id: string) => {
    const val = parseInt(editVal);
    if (!isNaN(val) && val > 0 && val < 9999) onDemandChange(id, val);
    setEditing(null);
  };

  const onlineSectors = sectors.filter(s => s.online);
  const totalDemand = onlineSectors.reduce((a, s) => a + s.demand, 0);
  const totalAllocated = onlineSectors.reduce((a, s) => a + s.allocated, 0);

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="pulse-dot" />
        SECTOR ALLOCATION
        <span className="ml-auto font-mono-tech" style={{ color: 'var(--accent-blue)' }}>
          {totalAllocated.toLocaleString()} / {totalDemand.toLocaleString()} MW
        </span>
      </div>

      <div className="p-3 space-y-1.5">
        {sectors.map(sector => {
          const allocPct = sector.online ? (sector.allocated / Math.max(sector.demand, 1)) * 100 : 0;
          const isDeficit = sector.allocated < sector.demand;
          const pri = PRIORITY_LABELS[sector.priority];
          const TrendIcon = sector.trend === 'up' ? TrendingUp : sector.trend === 'down' ? TrendingDown : Minus;
          const trendColor = sector.trend === 'up' ? 'var(--accent-red)' : sector.trend === 'down' ? 'var(--accent-green)' : 'var(--text-muted)';

          return (
            <div
              key={sector.id}
              className="p-2.5 rounded-sm transition-all"
              style={{
                background: sector.online ? 'var(--bg-elevated)' : 'var(--bg-panel)',
                border: `1px solid ${sector.online ? 'var(--border-subtle)' : 'var(--border-subtle)44'}`,
                opacity: sector.online ? 1 : 0.5,
              }}
            >
              <div className="flex items-center gap-2">
                {/* Priority badge */}
                <span
                  className="font-orbitron text-xs px-1 flex-shrink-0"
                  style={{ color: pri.color, background: `${pri.color}15`, border: `1px solid ${pri.color}33`, fontSize: '0.5rem' }}
                >
                  {pri.label}
                </span>

                {/* Name */}
                <span className="font-rajdhani font-semibold text-sm flex-1 truncate" style={{ color: sector.online ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {sector.name}
                </span>

                {/* Trend */}
                <TrendIcon size={12} style={{ color: trendColor, flexShrink: 0 }} />

                {/* Demand edit */}
                {editing === sector.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      className="font-mono-tech text-xs w-16 px-1 py-0.5"
                      style={{ background: 'var(--bg-void)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)' }}
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEdit(sector.id); if (e.key === 'Escape') setEditing(null); }}
                      autoFocus
                    />
                    <button onClick={() => commitEdit(sector.id)} style={{ color: 'var(--accent-green)' }}><Check size={12} /></button>
                    <button onClick={() => setEditing(null)} style={{ color: 'var(--accent-red)' }}><X size={12} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="font-orbitron text-sm font-bold" style={{ color: isDeficit && sector.online ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
                      {sector.allocated}
                      <span className="font-mono-tech text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                        / {sector.demand}
                      </span>
                    </span>
                    <span className="font-mono-tech text-xs" style={{ color: 'var(--text-muted)' }}>MW</span>
                    <button onClick={() => startEdit(sector)} className="opacity-40 hover:opacity-100 transition-opacity ml-1">
                      <Edit2 size={10} style={{ color: 'var(--accent-cyan)' }} />
                    </button>
                  </div>
                )}

                {/* Toggle */}
                <button
                  onClick={() => onToggle(sector.id)}
                  className="flex-shrink-0 ml-1"
                  title={sector.online ? 'Take offline' : 'Bring online'}
                >
                  <Power
                    size={14}
                    style={{ color: sector.online ? 'var(--accent-green)' : 'var(--text-muted)' }}
                  />
                </button>
              </div>

              {/* Allocation bar */}
              <div className="meter-bar mt-2">
                <div
                  className="meter-fill"
                  style={{
                    width: `${allocPct}%`,
                    background: allocPct < 70 ? 'var(--accent-red)' : allocPct < 95 ? 'var(--accent-amber)' : 'var(--accent-green)',
                  }}
                />
              </div>

              <div className="flex justify-between mt-1">
                <span className="font-mono-tech" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                  {allocPct.toFixed(0)}% SUPPLIED
                </span>
                <span className="font-mono-tech" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                  EFF {sector.efficiency}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

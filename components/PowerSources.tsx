'use client';
import type { PowerSource } from '@/lib/gridData';
import { Sun, Wind, Atom, Droplets, Flame, Factory } from 'lucide-react';

const ICONS: Record<string, React.ElementType> = {
  solar: Sun,
  wind: Wind,
  nuclear: Atom,
  hydro: Droplets,
  gas: Flame,
  coal: Factory,
};

const TYPE_LABELS: Record<string, string> = {
  solar: 'SOLAR',
  wind: 'WIND',
  nuclear: 'NUCLEAR',
  hydro: 'HYDRO',
  gas: 'GAS',
  coal: 'COAL',
};

export default function PowerSources({ sources }: { sources: PowerSource[] }) {
  const totalCapacity = sources.reduce((a, s) => a + s.capacity, 0);
  const totalCurrent = sources.reduce((a, s) => a + s.current, 0);
  return (
    <div className="panel">
      <div className="panel-header">
        <div className="pulse-dot" />
        POWER SOURCES
        <span className="ml-auto font-mono-tech" style={{ color: 'var(--accent-cyan)' }}>
          {totalCurrent.toLocaleString()} / {totalCapacity.toLocaleString()} MW
        </span>
      </div>
      <div className="p-3 space-y-2">
        {sources.map(source => {
          const Icon = ICONS[source.type];
          const pct = (source.current / source.capacity) * 100;
          const isActive = source.current > 0;
          return (
            <div
              key={source.id}
              className="p-3 rounded-sm"
              style={{
                background: isActive ? `${source.color}08` : 'var(--bg-panel)',
                border: `1px solid ${isActive ? source.color + '22' : 'var(--border-subtle)'}`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 flex items-center justify-center rounded-sm flex-shrink-0"
                  style={{
                    background: isActive ? `${source.color}22` : 'var(--border-subtle)',
                    border: `1px solid ${isActive ? source.color + '44' : 'transparent'}`,
                  }}
                >
                  <Icon size={14} style={{ color: isActive ? source.color : 'var(--text-muted)' }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-rajdhani font-semibold text-sm truncate" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {source.name}
                      </span>
                      <span className="font-orbitron text-xs px-1" style={{
                        color: source.color,
                        background: `${source.color}15`,
                        border: `1px solid ${source.color}33`,
                        fontSize: '0.5rem',
                        letterSpacing: '0.1em',
                      }}>
                        {TYPE_LABELS[source.type]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-mono-tech text-xs" style={{ color: 'var(--text-muted)' }}>
                        EFF: <span style={{ color: source.efficiency < 60 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                          {source.efficiency.toFixed(0)}%
                        </span>
                      </span>
                      <span className="font-orbitron text-sm font-bold" style={{ color: isActive ? source.color : 'var(--text-muted)' }}>
                        {source.current.toLocaleString()}
                        <span className="font-mono-tech text-xs ml-1" style={{ color: 'var(--text-muted)' }}>MW</span>
                      </span>
                    </div>
                  </div>
                  <div className="meter-bar">
                    <div
                      className="meter-fill"
                      style={{
                        width: `${pct}%`,
                        background: pct > 90 ? 'var(--accent-amber)' : source.color,
                        boxShadow: isActive ? `0 0 6px ${source.color}66` : 'none',
                      }}
                    />
                  </div>

                  <div className="flex justify-between mt-1">
                    <span className="font-mono-tech" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                      {pct.toFixed(1)}% UTILIZED
                    </span>
                    <span
                      className="font-mono-tech"
                      style={{ fontSize: '0.6rem', color: 'var(--text-muted)'}}
                    >
                      CAP {source.capacity.toLocaleString()} MW
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

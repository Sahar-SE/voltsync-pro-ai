'use client';

import type { GridState } from '@/lib/gridData';

type Props = { grid: GridState };

function Metric({ label, value, unit, color, sub }: { label: string; value: string | number; unit?: string; color: string; sub?: string }) {
  return (
    <div className="panel p-4 flex flex-col gap-1 corner-tl corner-br">
      <div className="font-orbitron text-xs tracking-widest" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="flex items-end gap-1 mt-1">
        <span className="value-large text-2xl font-black" style={{ color }}>
          {value}
        </span>
        {unit && <span className="font-mono-tech text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{unit}</span>}
      </div>
      {sub && <div className="font-mono-tech text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

export default function GridMetrics({ grid }: Props) {
  const balance = grid.totalSupply - grid.totalDemand;
  const balColor = balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

  const freqColor = Math.abs(grid.frequency - 50) < 0.2 ? 'var(--accent-green)' :
    Math.abs(grid.frequency - 50) < 0.5 ? 'var(--accent-amber)' : 'var(--accent-red)';

  const stabColor = grid.stability > 70 ? 'var(--accent-green)' :
    grid.stability > 40 ? 'var(--accent-amber)' : 'var(--accent-red)';

  const loadPct = Math.round((grid.totalDemand / Math.max(grid.totalSupply, 1)) * 100);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-3">
      <Metric
        label="TOTAL SUPPLY"
        value={grid.totalSupply.toLocaleString()}
        unit="MW"
        color="var(--accent-cyan)"
        sub="Generation output"
      />
      <Metric
        label="TOTAL DEMAND"
        value={grid.totalDemand.toLocaleString()}
        unit="MW"
        color="var(--accent-blue)"
        sub="Load consumption"
      />
      <Metric
        label="GRID BALANCE"
        value={`${balance >= 0 ? '+' : ''}${balance.toLocaleString()}`}
        unit="MW"
        color={balColor}
        sub={balance >= 0 ? 'Surplus' : 'Deficit'}
      />
      <Metric
        label="FREQUENCY"
        value={grid.frequency.toFixed(3)}
        unit="Hz"
        color={freqColor}
        sub="Nominal 50.000"
      />
      <Metric
        label="VOLTAGE"
        value={grid.voltage.toFixed(1)}
        unit="kV"
        color="var(--accent-purple)"
        sub="Nominal 220.0"
      />
      <Metric
        label="STABILITY"
        value={`${grid.stability.toFixed(1)}%`}
        color={stabColor}
        sub={`Load factor ${loadPct}%`}
      />
    </div>
  );
}

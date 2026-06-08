'use client';

import { Play, Pause, RefreshCw, Brain, Clock } from 'lucide-react';

type Props = {
  aiEnabled: boolean;
  autoMode: boolean;
  cycleInterval: number;
  onToggleAI: () => void;
  onToggleAuto: () => void;
  onManualCycle: () => void;
  onIntervalChange: (v: number) => void;
};

export default function ControlBar({
  aiEnabled, 
  autoMode,
  cycleInterval,
  onToggleAI,
  onToggleAuto, 
  onManualCycle, 
  onIntervalChange 
}: Props) {
  const intervals = [2000, 4000, 8000];
  const intervalLabels: Record<number, string> = { 2000: '2s', 4000: '4s', 8000: '8s' };
  return (
    <div className="panel mb-3 px-4 py-3 flex flex-wrap items-center gap-3">
      <div className="font-orbitron text-xs" style={{ color: 'var(--text-muted)', letterSpacing: '0.15em' }}>
        CONTROLS
      </div>

      <div className="w-px h-4 mx-1" style={{ background: 'var(--border-subtle)' }} />

      {/* AI Toggle */}
      <button
        onClick={onToggleAI}
        className={`btn-primary flex items-center gap-2 ${aiEnabled ? 'btn-active' : ''}`}
        style={aiEnabled ? { borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)', background: 'var(--accent-purple)22' } : { borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }}
      >
        <Brain size={12} />
        AI {aiEnabled ? 'ON' : 'OFF'}
      </button>
      <button
        onClick={onToggleAuto}
        className={`btn-primary flex items-center gap-2 ${autoMode ? 'btn-active' : ''}`}
        style={autoMode ? {} : { borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }}
      >
        {autoMode ? <Pause size={12} /> : <Play size={12} />}
        {autoMode ? 'AUTO' : 'MANUAL'}
      </button>
      {!autoMode && (
        <button onClick={onManualCycle} className="btn-primary flex items-center gap-2">
          <RefreshCw size={12} />
          RUN CYCLE
        </button>
      )}

      <div className="w-px h-4 mx-1" style={{ background: 'var(--border-subtle)' }} />
      <div className="flex items-center gap-2">
        <Clock size={12} style={{ color: 'var(--text-muted)' }} />
        <span className="font-mono-tech text-xs" style={{ color: 'var(--text-muted)' }}>INTERVAL:</span>
        {intervals.map(iv => (
          <button
            key={iv}
            onClick={() => onIntervalChange(iv)}
            className="btn-primary"
            style={cycleInterval === iv
              ? { borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)', background: 'var(--accent-amber)11' }
              : { borderColor: 'var(--border-subtle)', color: 'var(--text-muted)', padding: '4px 8px' }}
          >
            {intervalLabels[iv]}
          </button>
        ))}
      </div>
    </div>
  );
}

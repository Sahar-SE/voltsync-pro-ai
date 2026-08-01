'use client';
import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';

export default function Header({ 
  cycleCount, 
  timestamp, 
  connectionStatus = 'connected',
  currentRegion = 'caiso',
  onRegionChange
}: { 
  cycleCount: number; 
  timestamp: number; 
  connectionStatus?: 'connected' | 'reconnecting' | 'disconnected';
  currentRegion?: string;
  onRegionChange?: (region: string) => void;
}) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return { color: 'var(--accent-green)', text: 'LIVE', dotClass: 'pulse-dot' };
      case 'reconnecting':
        return { color: '#ffbb00', text: 'RECONNECTING', dotClass: 'pulse-dot-yellow' };
      case 'disconnected':
      default:
        return { color: '#ff3355', text: 'OFFLINE', dotClass: 'static-dot-red' };
    }
  };

  const status = getStatusConfig();

  return (
    <header className="py-4 mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 flex items-center justify-center" style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--accent-cyan)',
              boxShadow: '0 0 20px var(--accent-cyan)44',
            }}>
              <Zap size={20} style={{ color: 'var(--accent-cyan)' }} />
            </div>
          </div>

          <div>
            <h1 className="font-orbitron text-xl font-black tracking-widest text-glow-cyan" style={{ color: 'var(--accent-cyan)' }}>
              VOLTSYNC
              <span className="font-orbitron text-sm font-normal ml-2" style={{ color: 'var(--text-secondary)' }}>
                PRO AI
              </span>
            </h1>
            <div className="font-mono-tech text-xs" style={{ color: 'var(--text-muted)' }}>
              SMART GRID SIMULATION & MONITORING SYSTEM
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <div className="font-mono-tech text-xs" style={{ color: 'var(--text-muted)' }}>GRID REGION</div>
            <select 
              value={currentRegion} 
              onChange={(e) => onRegionChange?.(e.target.value)}
              className="bg-card text-xs font-orbitron border border-subtle text-primary py-0.5 px-2 uppercase focus:outline-none focus:border-cyan"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-orbitron)',
                borderRadius: '2px',
                marginTop: '2px',
                cursor: 'pointer',
              }}
            >
              <option value="caiso">CAISO (CA)</option>
              <option value="ercot">ERCOT (TX)</option>
              <option value="pjm">PJM (East)</option>
              <option value="miso">MISO (Midwest)</option>
            </select>
          </div>
          <div className="text-right hidden md:block">
            <div className="font-mono-tech text-xs" style={{ color: 'var(--text-muted)' }}>SYSTEM CLOCK</div>
            <div className="font-orbitron text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{time}</div>
          </div>
          <div className="text-right">
            <div className="font-mono-tech text-xs" style={{ color: 'var(--text-muted)' }}>CYCLE COUNT</div>
            <div className="font-orbitron text-lg font-bold" style={{ color: 'var(--accent-green)' }}>
              #{String(cycleCount).padStart(5, '0')}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status.dotClass === 'pulse-dot' ? (
              <div className="pulse-dot" />
            ) : status.dotClass === 'pulse-dot-yellow' ? (
              <div className="pulse-dot" style={{ background: '#ffbb00', boxShadow: '0 0 8px #ffbb00' }} />
            ) : (
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff3355', boxShadow: '0 0 8px #ff3355' }} />
            )}
            <span className="font-mono-tech text-xs" style={{ color: status.color, fontWeight: 'bold' }}>{status.text}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 h-px" style={{
        background: 'linear-gradient(90deg, transparent, var(--accent-cyan)88, var(--accent-blue)44, transparent)',
      }} />
    </header>
  );
}

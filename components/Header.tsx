'use client';
import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';

export default function Header({ cycleCount, timestamp }: { cycleCount: number; timestamp: number }) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

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
            <div className="pulse-dot" />
            <span className="font-mono-tech text-xs" style={{ color: 'var(--accent-green)' }}>LIVE</span>
          </div>
        </div>
      </div>
      <div className="mt-3 h-px" style={{
        background: 'linear-gradient(90deg, transparent, var(--accent-cyan)88, var(--accent-blue)44, transparent)',
      }} />
    </header>
  );
}

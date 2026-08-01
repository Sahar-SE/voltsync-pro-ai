'use client';

import { useState, useEffect } from 'react';
import { Brain, ShieldAlert, Check, X, RefreshCw, Radio } from 'lucide-react';

interface Proposal {
  reasoning: string;
  citations: string[];
  command: {
    action: string;
    sector_id?: string;
    value?: number;
  };
  timestamp: number;
}

interface LogEntry {
  timestamp: number;
  reasoning: string;
  citations: string[];
  proposal: {
    action: string;
    sector_id?: string;
    value?: number;
  };
}

export default function AgentConsole() {
  const [mode, setMode] = useState<'advisory' | 'autonomous'>('advisory');
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const fetchData = async () => {
    try {
      // 1. Fetch stashed proposal
      const propRes = await fetch(`${apiUrl}/api/agent/proposal`);
      if (propRes.ok) {
        const propData = await propRes.json();
        setProposal(propData.proposal);
      }
      
      // 2. Fetch logs
      const logsRes = await fetch(`${apiUrl}/api/agent/logs`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs.slice().reverse()); // Show newest first
      }
    } catch (e) {
      console.error('Error fetching agent console details:', e);
    }
  };

  useEffect(() => {
    // Run initial fetch
    fetchData();

    // Poll for proposals and logs updates every 2 seconds
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleMode = async () => {
    const targetMode = mode === 'advisory' ? 'autonomous' : 'advisory';
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/agent/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: targetMode })
      });
      if (res.ok) {
        setMode(targetMode);
      }
    } catch (e) {
      console.error('Failed toggling agent mode:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`${apiUrl}/api/agent/approve`, { method: 'POST' });
      if (res.ok) {
        setProposal(null);
        fetchData();
      } else {
        const data = await res.json();
        setActionError(data.detail || 'Execution rejected by Safety Interlocks.');
      }
    } catch (e) {
      console.error(e);
      setActionError('Network error executing approval.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`${apiUrl}/api/agent/reject`, { method: 'POST' });
      if (res.ok) {
        setProposal(null);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <Brain size={14} style={{ color: 'var(--accent-purple)' }} />
        AI SCADA OPERATOR CONSOLE
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono-tech text-xs">
            <Radio 
              size={12} 
              className={mode === 'autonomous' ? 'animate-pulse' : ''} 
              style={{ color: mode === 'autonomous' ? 'var(--accent-red)' : 'var(--accent-amber)' }} 
            />
            <span style={{ color: mode === 'autonomous' ? 'var(--accent-red)' : 'var(--accent-amber)' }}>
              {mode.toUpperCase()}
            </span>
          </div>
          <button
            onClick={handleToggleMode}
            disabled={loading}
            className="btn btn-secondary font-mono-tech text-xs py-0.5 px-2"
            style={{ fontSize: '0.65rem' }}
          >
            SWITCH TO {mode === 'advisory' ? 'AUTONOMOUS' : 'ADVISORY'}
          </button>
        </div>
      </div>

      <div className="p-3 flex-1 flex flex-col gap-3 overflow-auto">
        {/* Active Proposal Section */}
        <div className="flex-1">
          <div className="font-orbitron text-xs mb-2 text-muted" style={{ fontSize: '0.55rem', letterSpacing: '0.1em' }}>
            ACTIVE AI RECOMMENDATION QUEUE
          </div>
          
          {proposal ? (
            <div 
              className="p-3 border flex flex-col gap-3"
              style={{ 
                background: 'rgba(136, 85, 255, 0.05)', 
                borderColor: 'rgba(136, 85, 255, 0.3)' 
              }}
            >
              <div className="flex items-start gap-2">
                <ShieldAlert size={18} style={{ color: 'var(--accent-purple)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div className="font-orbitron text-xs font-bold style-glow" style={{ color: 'var(--accent-purple)' }}>
                    ACTION PROPOSAL: {proposal.command.action === 'toggle_sector' ? `TOGGLE ${proposal.command.sector_id?.toUpperCase()}` : `ADJUST VOLTAGE TO ${proposal.command.value}V`}
                  </div>
                  <p className="font-rajdhani text-xs mt-1 text-secondary" style={{ color: 'var(--text-secondary)' }}>
                    {proposal.reasoning}
                  </p>
                </div>
              </div>

              {proposal.citations && proposal.citations.length > 0 && (
                <div className="p-2 border font-mono-tech text-xs text-muted" style={{ background: 'var(--bg-void)', borderColor: 'var(--border-subtle)', fontSize: '0.65rem' }}>
                  <div className="font-bold text-[0.6rem] text-primary" style={{ color: 'var(--accent-cyan)' }}>SOP CITED REFERENCES:</div>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    {proposal.citations.map((cite, i) => (
                      <li key={i}>{cite}</li>
                    ))}
                  </ul>
                </div>
              )}

              {actionError && (
                <div className="p-2 border font-mono-tech text-xs text-accent-red" style={{ background: 'rgba(255, 51, 85, 0.05)', borderColor: 'rgba(255, 51, 85, 0.3)', color: 'var(--accent-red)', fontSize: '0.65rem' }}>
                  ⚠️ INTERLOCK BLOCK: {actionError}
                </div>
              )}

              {mode === 'advisory' ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={loading}
                    className="flex-1 btn btn-primary flex items-center justify-center gap-1 py-1.5 text-xs font-orbitron"
                    style={{ background: 'var(--accent-green)', borderColor: 'var(--accent-green)' }}
                  >
                    <Check size={12} /> APPROVE & EXECUTE
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={loading}
                    className="flex-1 btn btn-secondary flex items-center justify-center gap-1 py-1.5 text-xs font-orbitron"
                    style={{ color: 'var(--accent-red)', borderColor: 'rgba(255, 51, 85, 0.3)' }}
                  >
                    <X size={12} /> REJECT COMMAND
                  </button>
                </div>
              ) : (
                <div className="font-mono-tech text-xs text-center" style={{ color: 'var(--accent-red)' }}>
                  ⚡ Autonomous monitoring active. Proposals will auto-execute.
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 border border-dashed flex items-center justify-center p-6 text-center" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="text-muted">
                <Brain size={24} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                <span className="font-mono-tech text-xs block">GRID OPERATING WITHIN LIMITS</span>
                <span className="font-rajdhani text-xs block text-muted mt-1">Anomaly monitoring cycles active in the background.</span>
              </div>
            </div>
          )}
        </div>

        {/* Audit Log / History Section */}
        <div>
          <div className="font-orbitron text-xs mb-2 text-muted" style={{ fontSize: '0.55rem', letterSpacing: '0.1em' }}>
            OPERATOR REASONING HISTORY
          </div>
          <div className="space-y-1.5 max-h-[140px] overflow-auto">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div 
                  key={index} 
                  className="p-2 border flex flex-col gap-1 font-mono-tech text-xs" 
                  style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex justify-between items-center text-[0.6rem]">
                    <span style={{ color: 'var(--accent-purple)' }}>
                      AI THOUGHT #{logs.length - index}
                    </span>
                    <span className="text-muted">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-primary font-orbitron text-[0.65rem] mt-0.5">
                    CMD: {log.proposal.action === 'toggle_sector' ? `TOGGLE ${log.proposal.sector_id}` : `ADJUST VOLTAGE ${log.proposal.value}V`}
                  </div>
                  <div className="text-secondary text-[0.65rem] leading-relaxed line-clamp-2">
                    {log.reasoning}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center font-mono-tech text-xs p-3 text-muted">
                No telemetry anomalies recorded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

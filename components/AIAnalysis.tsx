'use client';

import type { ForecastResult } from '@/lib/tfForecaster';
import { Brain, Shield, AlertTriangle, XCircle, CheckCircle, Loader } from 'lucide-react';

const RISK_CONFIG = {
  LOW: { color: 'var(--accent-green)', Icon: CheckCircle, label: 'LOW RISK' },
  MODERATE: { color: 'var(--accent-amber)', Icon: Shield, label: 'MODERATE RISK' },
  HIGH: { color: 'var(--accent-red)', Icon: AlertTriangle, label: 'HIGH RISK' },
  CRITICAL: { color: '#ff0033', Icon: XCircle, label: 'CRITICAL' },
};

export default function AIAnalysis({
  forecast, loading, aiEnabled
}: {
  forecast: ForecastResult | null;
  loading: boolean;
  aiEnabled: boolean;
}) {
  if (!aiEnabled) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header">
          <Brain size={12} style={{ color: 'var(--text-muted)' }} />
          AI ANALYSIS
          <span className="ml-auto font-mono-tech text-xs" style={{ color: 'var(--text-muted)' }}>DISABLED</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Brain size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
            <div className="font-orbitron text-xs" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
              AI ENGINE OFFLINE
            </div>
            <div className="font-mono-tech text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Enable AI to run TensorFlow forecasting
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !forecast) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header">
          <div className="pulse-dot" style={{ background: 'var(--accent-purple)', boxShadow: '0 0 6px var(--accent-purple)' }} />
          AI ANALYSIS
          <span className="ml-auto font-mono-tech text-xs" style={{ color: 'var(--accent-purple)' }}>PROCESSING</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Loader size={32} className="animate-spin" style={{ color: 'var(--accent-purple)', margin: '0 auto 8px' }} />
            <div className="font-orbitron text-xs" style={{ color: 'var(--accent-purple)', letterSpacing: '0.1em' }}>
              TRAINING TF MODEL...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!forecast) return null;

  const risk = RISK_CONFIG[forecast.riskLevel];
  const RiskIcon = risk.Icon;

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <div className="pulse-dot" style={{ background: 'var(--accent-purple)', boxShadow: '0 0 6px var(--accent-purple)' }} />
        AI ANALYSIS
        {loading && (
          <span className="ml-2">
            <Loader size={10} className="animate-spin inline" style={{ color: 'var(--accent-purple)' }} />
          </span>
        )}
        <span className="ml-auto font-mono-tech text-xs" style={{ color: 'var(--accent-purple)' }}>TENSORFLOW</span>
      </div>

      <div className="p-3 flex-1 space-y-3 overflow-auto">
        {/* Risk Badge */}
        <div
          className="p-3 flex items-center gap-3"
          style={{
            background: `${risk.color}11`,
            border: `1px solid ${risk.color}44`,
          }}
        >
          <RiskIcon size={24} style={{ color: risk.color, flexShrink: 0 }} />
          <div>
            <div className="font-orbitron text-sm font-bold" style={{ color: risk.color }}>
              {risk.label}
            </div>
            <div className="font-mono-tech text-xs" style={{ color: 'var(--text-muted)' }}>
              Score: {forecast.riskScore.toFixed(1)} / 100
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="font-mono-tech text-xs" style={{ color: 'var(--text-muted)' }}>CONFIDENCE</div>
            <div className="font-orbitron text-lg font-bold" style={{ color: risk.color }}>
              {forecast.confidence.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Risk bar */}
        <div>
          <div className="font-orbitron text-xs mb-1" style={{ color: 'var(--text-muted)', fontSize: '0.55rem', letterSpacing: '0.1em' }}>
            RISK SCORE
          </div>
          <div className="meter-bar" style={{ height: '6px' }}>
            <div
              className="meter-fill"
              style={{
                width: `${forecast.riskScore}%`,
                background: risk.color,
                boxShadow: `0 0 8px ${risk.color}88`,
              }}
            />
          </div>
        </div>

        {/* Forecast metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
            <div className="font-mono-tech" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>PRED. DEMAND</div>
            <div className="font-orbitron text-sm font-bold" style={{ color: 'var(--accent-blue)' }}>
              {forecast.predictedDemand.toLocaleString()}
              <span className="font-mono-tech text-xs ml-1" style={{ color: 'var(--text-muted)' }}>MW</span>
            </div>
          </div>
          <div className="p-2" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
            <div className="font-mono-tech" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>PRED. SUPPLY</div>
            <div className="font-orbitron text-sm font-bold" style={{ color: 'var(--accent-cyan)' }}>
              {forecast.predictedSupply.toLocaleString()}
              <span className="font-mono-tech text-xs ml-1" style={{ color: 'var(--text-muted)' }}>MW</span>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <div className="font-orbitron text-xs mb-2" style={{ color: 'var(--text-muted)', fontSize: '0.55rem', letterSpacing: '0.1em' }}>
            AI RECOMMENDATIONS
          </div>
          <div className="space-y-1.5">
            {forecast.recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex gap-2 p-2"
                style={{
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-subtle)',
                  borderLeft: `2px solid ${risk.color}`,
                }}
              >
                <span className="font-orbitron flex-shrink-0" style={{ color: risk.color, fontSize: '0.6rem' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-rajdhani text-sm" style={{ color: 'var(--text-secondary)' }}>{rec}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 6-cycle load forecast */}
        {forecast.loadForecast.length > 0 && (
          <div>
            <div className="font-orbitron text-xs mb-2" style={{ color: 'var(--text-muted)', fontSize: '0.55rem', letterSpacing: '0.1em' }}>
              6-CYCLE DEMAND FORECAST
            </div>
            <div className="flex gap-1">
              {forecast.loadForecast.slice(0, 6).map((v, i) => {
                const maxF = Math.max(...forecast.loadForecast.slice(0, 6));
                const pct = (v / maxF) * 100;
                return (
                  <div key={i} className="flex-1 text-center">
                    <div className="relative" style={{ height: '40px', display: 'flex', alignItems: 'flex-end' }}>
                      <div
                        className="w-full"
                        style={{
                          height: `${pct}%`,
                          background: `linear-gradient(to top, var(--accent-purple), var(--accent-cyan))`,
                          opacity: 0.7,
                          borderRadius: '1px 1px 0 0',
                        }}
                      />
                    </div>
                    <div className="font-mono-tech mt-1" style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>
                      +{i + 1}
                    </div>
                    <div className="font-orbitron" style={{ fontSize: '0.5rem', color: 'var(--accent-purple)' }}>
                      {(v / 1000).toFixed(1)}k
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

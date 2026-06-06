'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createInitialGridState, simulateGridCycle, type GridState } from '@/lib/gridData';
import { runForecast, type ForecastResult } from '@/lib/tfForecaster';
import Header from '@/components/Header';
import GridMetrics from '@/components/GridMetrics';
import PowerSources from '@/components/PowerSources';
import SectorPanel from '@/components/SectorPanel';
import AIAnalysis from '@/components/AIAnalysis';
import SupplyDemandChart from '@/components/SupplyDemandChart';
import AlertsPanel from '@/components/AlertsPanel';
import ControlBar from '@/components/ControlBar';

type HistoryPoint = { supply: number; demand: number; time: number };

export default function Home() {
  const [grid, setGrid] = useState<GridState | null>(null);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [autoMode, setAutoMode] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [cycleInterval, setCycleInterval] = useState(4000);
  const demandHistory = useRef<number[]>([]);
  const gridRef = useRef<GridState | null>(null);

  useEffect(() => {
    const initial = createInitialGridState();
    setGrid(initial);
    gridRef.current = initial;
    setHistory([{ supply: initial.totalSupply, demand: initial.totalDemand, time: Date.now() }]);
  }, []);

  const runCycle = useCallback(async (current: GridState) => {
    const next = simulateGridCycle(current);
    gridRef.current = next;
    setGrid(next);
    setHistory(prev => {
      const point = { supply: next.totalSupply, demand: next.totalDemand, time: Date.now() };
      return [...prev.slice(-29), point];
    });
    demandHistory.current = [...demandHistory.current.slice(-19), next.totalDemand];

    if (aiEnabled) {
      setForecastLoading(true);
      try {
        const result = await runForecast(next, demandHistory.current);
        setForecast(result);
      } catch (e) {
        console.error('Forecast error', e);
      } finally {
        setForecastLoading(false);
      }
    }
  }, [aiEnabled]);

  useEffect(() => {
    if (!autoMode) return;
    const id = setInterval(() => {
      if (gridRef.current) runCycle(gridRef.current);
    }, cycleInterval);
    return () => clearInterval(id);
  }, [autoMode, cycleInterval, runCycle]);

  const handleManualCycle = () => {
    if (gridRef.current) runCycle(gridRef.current);
  };

  const handleToggleSector = (id: string) => {
    setGrid(prev => {
      if (!prev) return prev;
      const next = { ...prev, sectors: prev.sectors.map(s => s.id === id ? { ...s, online: !s.online } : s) };
      gridRef.current = next;
      return next;
    });
  };

  const handleSectorDemand = (id: string, demand: number) => {
    setGrid(prev => {
      if (!prev) return prev;
      const next = { ...prev, sectors: prev.sectors.map(s => s.id === id ? { ...s, demand } : s) };
      gridRef.current = next;
      return next;
    });
  };

  if (!grid) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-void)' }}>
        <div className="text-center">
          <div className="font-orbitron text-xs tracking-widest mb-6" style={{ color: 'var(--accent-cyan)' }}>
            INITIALIZING VOLTSYNC PRO AI
          </div>
          <div className="w-64 h-px mx-auto overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
            <div className="h-full animate-pulse" style={{ width: '70%', background: 'var(--accent-cyan)' }} />
          </div>
          <div className="font-mono-tech text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
            Loading TensorFlow model...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg-void)' }}>
      <div className="grid-bg" />
      <div className="scanline" />
      <div className="relative z-10 max-w-[1600px] mx-auto px-4 pb-10">
        <Header cycleCount={grid.cycleCount} timestamp={grid.timestamp} />
        <ControlBar
          aiEnabled={aiEnabled}
          autoMode={autoMode}
          cycleInterval={cycleInterval}
          onToggleAI={() => setAiEnabled(v => !v)}
          onToggleAuto={() => setAutoMode(v => !v)}
          onManualCycle={handleManualCycle}
          onIntervalChange={setCycleInterval}
        />
        <GridMetrics grid={grid} />
        {grid.alerts.length > 0 && <AlertsPanel alerts={grid.alerts} />}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mt-3">
          <div className="xl:col-span-2">
            <SupplyDemandChart history={history} forecast={forecast} />
          </div>
          <div>
            <AIAnalysis forecast={forecast} loading={forecastLoading} aiEnabled={aiEnabled} />
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">
          <PowerSources sources={grid.sources} />
          <SectorPanel
            sectors={grid.sectors}
            onToggle={handleToggleSector}
            onDemandChange={handleSectorDemand}
          />
        </div>
      </div>
    </div>
  );
}

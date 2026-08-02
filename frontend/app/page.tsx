'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createInitialGridState, simulateGridCycle, type GridState } from '@/lib/gridData';
import { runForecast, type ForecastResult } from '@/lib/tfForecaster';
import Header from '@/components/Header';
import GridMetrics from '@/components/GridMetrics';
import PowerSources from '@/components/PowerSources';
import SectorPanel from '@/components/SectorPanel';
import AIAnalysis from '@/components/AIAnalysis';
import AgentConsole from '@/components/AgentConsole';
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
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  const [currentRegion, setCurrentRegion] = useState('caiso');

  const handleRegionChange = async (region: string) => {
    setCurrentRegion(region);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    try {
      const response = await fetch(`${apiUrl}/api/grid/region`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ region }),
      });
      if (!response.ok) {
        throw new Error('Failed to update region on backend');
      }
      console.log('Grid region switched to:', region);
    } catch (e) {
      console.error('Error changing grid region:', e);
    }
  };

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8000/ws/telemetry';

    function connect() {
      console.log('Connecting to VoltSync Telemetry WS:', wsUrl);
      setConnectionStatus('reconnecting');
      try {
        ws = new WebSocket(wsUrl);
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setConnectionStatus('disconnected');
        reconnectTimeout = setTimeout(connect, 3000);
        return;
      }

      ws.onopen = () => {
        console.log('Telemetry WS Connected');
        setConnectionStatus('connected');
      };

      ws.onmessage = async (event) => {
        try {
          const nextGrid: GridState = JSON.parse(event.data);
          setGrid(nextGrid);
          gridRef.current = nextGrid;

          setHistory(prev => {
            const point = { supply: nextGrid.totalSupply, demand: nextGrid.totalDemand, time: Date.now() };
            return [...prev.slice(-29), point];
          });
          demandHistory.current = [...demandHistory.current.slice(-19), nextGrid.totalDemand];

          if (aiEnabled) {
            setForecastLoading(true);
            try {
              const result = await runForecast(nextGrid, demandHistory.current);
              setForecast(result);
            } catch (e) {
              console.error('Forecast calculation error:', e);
            } finally {
              setForecastLoading(false);
            }
          }
        } catch (e) {
          console.error('WebSocket parse error:', e);
        }
      };

      ws.onclose = () => {
        console.log('Telemetry WS Closed. Reconnecting in 3s...');
        setConnectionStatus('disconnected');
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error('Telemetry WS Error:', error);
        ws?.close();
      };
    }

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [aiEnabled]);

  const handleManualCycle = () => {
    // Disabled in live telemetry mode, backend runs continuously
    console.log('Manual cycle trigger (disabled under live telemetry)');
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
        <Header 
          cycleCount={grid.cycleCount} 
          timestamp={grid.timestamp} 
          connectionStatus={connectionStatus} 
          currentRegion={currentRegion}
          onRegionChange={handleRegionChange}
        />
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
          <div className="flex flex-col gap-3 h-full">
            <div className="flex-1">
              <AIAnalysis forecast={forecast} loading={forecastLoading} aiEnabled={aiEnabled} />
            </div>
            <div className="flex-1">
              <AgentConsole />
            </div>
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

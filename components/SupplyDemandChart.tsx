'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import type { ForecastResult } from '@/lib/tfForecaster';

type HistoryPoint = { supply: number; demand: number; time: number };

type Props = {
  history: HistoryPoint[];
  forecast: ForecastResult | null;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="panel px-3 py-2" style={{ border: '1px solid var(--border-subtle)' }}>
      {payload.map((p: any) => (
        <div key={p.name} className="font-mono-tech text-xs flex gap-3" style={{ color: p.color }}>
          <span>{p.name.toUpperCase()}:</span>
          <span>{p.value?.toLocaleString()} MW</span>
        </div>
      ))}
    </div>
  );
};

export default function SupplyDemandChart({ history, forecast }: Props) {
  const chartData = history.map((h, i) => ({
    name: i === history.length - 1 ? 'NOW' : `-${history.length - 1 - i}`,
    supply: h.supply,
    demand: h.demand,
  }));

  // Append forecast points
  if (forecast?.loadForecast) {
    forecast.loadForecast.slice(0, 6).forEach((v, i) => {
      chartData.push({
        name: `+${i + 1}`,
        supply: undefined as any,
        demand: undefined as any,
        forecastDemand: v,
      } as any);
    });
  }

  const allValues = chartData.flatMap(d => [d.supply, d.demand, (d as any).forecastDemand].filter(Boolean));
  const minVal = Math.min(...allValues) * 0.9;
  const maxVal = Math.max(...allValues) * 1.05;

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <div className="pulse-dot" />
        SUPPLY / DEMAND TIMELINE
        <div className="ml-auto flex items-center gap-3">
          {forecast && (
            <span className="font-mono-tech text-xs" style={{ color: 'var(--text-muted)' }}>
              FORECAST CONFIDENCE:
              <span style={{ color: 'var(--accent-cyan)', marginLeft: '4px' }}>
                {forecast.confidence.toFixed(1)}%
              </span>
            </span>
          )}
        </div>
      </div>
      <div className="p-3" style={{ height: '280px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="supplyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00f5ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00f5ff" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0088ff" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0088ff" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8855ff" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#8855ff" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#0d2040" />
            <XAxis
              dataKey="name"
              tick={{ fill: '#3a5a7c', fontFamily: 'Share Tech Mono', fontSize: 10 }}
              axisLine={{ stroke: '#1a3354' }}
              tickLine={false}
            />
            <YAxis
              domain={[minVal, maxVal]}
              tick={{ fill: '#3a5a7c', fontFamily: 'Share Tech Mono', fontSize: 10 }}
              axisLine={{ stroke: '#1a3354' }}
              tickLine={false}
              tickFormatter={v => `${(v / 1000).toFixed(1)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontFamily: 'Share Tech Mono', fontSize: '10px', color: 'var(--text-muted)', paddingTop: '8px' }}
            />
            <Area type="monotone" dataKey="supply" stroke="#00f5ff" strokeWidth={2} fill="url(#supplyGrad)" dot={false} connectNulls />
            <Area type="monotone" dataKey="demand" stroke="#0088ff" strokeWidth={2} fill="url(#demandGrad)" dot={false} connectNulls />
            <Area type="monotone" dataKey="forecastDemand" stroke="#8855ff" strokeWidth={1.5} strokeDasharray="4 2" fill="url(#forecastGrad)" dot={false} connectNulls name="ai forecast" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

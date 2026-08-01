export type PowerSource = {
  id: string;
  name: string;
  type: 'solar' | 'wind' | 'nuclear' | 'hydro' | 'gas' | 'coal';
  capacity: number;
  current: number;
  efficiency: number;
  color: string;
};

export type Sector = {
  id: string;
  name: string;
  demand: number;
  allocated: number;
  priority: 1 | 2 | 3;
  online: boolean;
  efficiency: number;
  trend: 'up' | 'down' | 'stable';
};

export type GridState = {
  totalSupply: number;
  totalDemand: number;
  frequency: number;
  voltage: number;
  stability: number;
  timestamp: number;
  sources: PowerSource[];
  sectors: Sector[];
  alerts: string[];
  cycleCount: number;
};

export const INITIAL_SOURCES: PowerSource[] = [
  { id: 'solar', name: 'Solar Farm Alpha', type: 'solar', capacity: 800, current: 620, efficiency: 92, color: '#ffaa00' },
  { id: 'wind', name: 'Wind Park Beta', type: 'wind', capacity: 600, current: 380, efficiency: 78, color: '#00f5ff' },
  { id: 'nuclear', name: 'Reactor Core Gamma', type: 'nuclear', capacity: 1200, current: 1150, efficiency: 97, color: '#00ff88' },
  { id: 'hydro', name: 'Hydro Dam Delta', type: 'hydro', capacity: 400, current: 360, efficiency: 88, color: '#0088ff' },
  { id: 'gas', name: 'Gas Turbine Epsilon', type: 'gas', capacity: 500, current: 240, efficiency: 65, color: '#8855ff' },
  { id: 'coal', name: 'Coal Plant Zeta', type: 'coal', capacity: 700, current: 0, efficiency: 42, color: '#ff3355' },
];

export const INITIAL_SECTORS: Sector[] = [
  { id: 'industrial', name: 'Industrial Zone A', demand: 850, allocated: 820, priority: 1, online: true, efficiency: 88, trend: 'up' },
  { id: 'residential', name: 'Residential District B', demand: 420, allocated: 420, priority: 2, online: true, efficiency: 94, trend: 'stable' },
  { id: 'commercial', name: 'Commercial Hub C', demand: 310, allocated: 295, priority: 2, online: true, efficiency: 91, trend: 'down' },
  { id: 'hospital', name: 'Medical Complex D', demand: 180, allocated: 180, priority: 1, online: true, efficiency: 99, trend: 'stable' },
  { id: 'datacenters', name: 'Data Centers E', demand: 520, allocated: 480, priority: 1, online: true, efficiency: 85, trend: 'up' },
  { id: 'transport', name: 'Transit Network F', demand: 230, allocated: 220, priority: 3, online: true, efficiency: 82, trend: 'stable' },
  { id: 'agricultural', name: 'Agricultural Grid G', demand: 90, allocated: 85, priority: 3, online: true, efficiency: 76, trend: 'down' },
  { id: 'research', name: 'Research Campus H', demand: 140, allocated: 130, priority: 2, online: true, efficiency: 93, trend: 'stable' },
];

export function createInitialGridState(): GridState {
  const sources = INITIAL_SOURCES.map(s => ({ ...s }));
  const sectors = INITIAL_SECTORS.map(s => ({ ...s }));
  const totalSupply = sources.reduce((a, s) => a + s.current, 0);
  const totalDemand = sectors.filter(s => s.online).reduce((a, s) => a + s.demand, 0);
  return {
    totalSupply,
    totalDemand,
    frequency: 50.0,
    voltage: 220,
    stability: 87,
    timestamp: Date.now(),
    sources,
    sectors,
    alerts: [],
    cycleCount: 0,
  };
}

export function simulateGridCycle(prev: GridState): GridState {
  const sources = prev.sources.map(s => {
    let delta = (Math.random() - 0.5) * 60;
    if (s.type === 'solar') delta = (Math.random() - 0.3) * 50;
    if (s.type === 'wind') delta = (Math.random() - 0.5) * 80;
    if (s.type === 'nuclear') delta = (Math.random() - 0.5) * 10;
    const newCurrent = Math.max(0, Math.min(s.capacity, s.current + delta));
    const effDelta = (Math.random() - 0.5) * 2;
    return { ...s, current: Math.round(newCurrent), efficiency: Math.max(30, Math.min(99, Math.round(s.efficiency + effDelta))) };
  });

  const sectors = prev.sectors.map(s => {
    if (!s.online) return { ...s, allocated: 0 };
    const demandDelta = (Math.random() - 0.5) * 30;
    const newDemand = Math.max(10, Math.round(s.demand + demandDelta));
    const trend: Sector['trend'] = demandDelta > 5 ? 'up' : demandDelta < -5 ? 'down' : 'stable';
    return { ...s, demand: newDemand, trend };
  });

  const totalSupply = sources.reduce((a, s) => a + s.current, 0);
  const totalDemand = sectors.filter(s => s.online).reduce((a, s) => a + s.demand, 0);
  const balance = totalSupply - totalDemand;
  const freqDelta = (balance / Math.max(totalDemand, 1)) * 0.5;
  const frequency = Math.max(49.0, Math.min(51.0, prev.frequency + freqDelta * 0.3 + (Math.random() - 0.5) * 0.05));
  const voltage = Math.max(210, Math.min(230, prev.voltage + (Math.random() - 0.5) * 2));
  const stabilityDelta = (Math.abs(balance) > 200 ? -3 : 2) + (Math.random() - 0.5) * 4;
  const stability = Math.max(0, Math.min(100, prev.stability + stabilityDelta));

  const updatedSectors = allocateSupply(sectors, totalSupply);

  const alerts: string[] = [];
  if (frequency < 49.5) alerts.push('LOW FREQUENCY — Grid underloaded');
  if (frequency > 50.5) alerts.push('HIGH FREQUENCY — Grid overloaded');
  if (stability < 50) alerts.push('CRITICAL: Grid stability below threshold');
  if (balance < -200) alerts.push('DEMAND EXCEEDING SUPPLY — Load shedding risk');
  sources.forEach(s => {
    if (s.efficiency < 50) alerts.push(`LOW EFFICIENCY: ${s.name} at ${s.efficiency.toFixed(0)}%`);
  });

  return {
    totalSupply: Math.round(totalSupply),
    totalDemand: Math.round(totalDemand),
    frequency: parseFloat(frequency.toFixed(3)),
    voltage: parseFloat(voltage.toFixed(1)),
    stability: parseFloat(stability.toFixed(1)),
    timestamp: Date.now(),
    sources,
    sectors: updatedSectors,
    alerts,
    cycleCount: prev.cycleCount + 1,
  };
}

function allocateSupply(sectors: Sector[], totalSupply: number): Sector[] {
  const online = sectors.filter(s => s.online);
  const totalDemand = online.reduce((a, s) => a + s.demand, 0);
  const ratio = Math.min(1, totalSupply / Math.max(totalDemand, 1));
  return sectors.map(s => {
    if (!s.online) return { ...s, allocated: 0 };
    const alloc = s.priority === 1
      ? s.demand
      : s.priority === 2
      ? Math.round(s.demand * Math.min(1, ratio + 0.1))
      : Math.round(s.demand * ratio);
    return { ...s, allocated: Math.min(s.demand, alloc) };
  });
}

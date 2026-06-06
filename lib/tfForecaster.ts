'use client';

import * as tf from '@tensorflow/tfjs';
import type { GridState } from './gridData';

export type ForecastResult = {
  predictedDemand: number;
  predictedSupply: number;
  riskScore: number; // 0-100
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
  confidence: number;
  loadForecast: number[]; // next 6 cycles
};

let model: tf.Sequential | null = null;

async function getModel(): Promise<tf.Sequential> {
  if (model) return model;

  model = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [12], units: 32, activation: 'relu' }),
      tf.layers.dropout({ rate: 0.1 }),
      tf.layers.dense({ units: 24, activation: 'relu' }),
      tf.layers.dense({ units: 16, activation: 'relu' }),
      tf.layers.dense({ units: 8, activation: 'linear' }),
    ],
  });

  model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });

  // Generate synthetic training data and train briefly
  const xs: number[][] = [];
  const ys: number[][] = [];

  for (let i = 0; i < 200; i++) {
    const supply = 2000 + Math.random() * 1000;
    const demand = 2000 + Math.random() * 1000;
    const freq = 49.5 + Math.random() * 1;
    const volt = 215 + Math.random() * 10;
    const stab = Math.random() * 100;
    const eff = 0.6 + Math.random() * 0.4;
    const hour = Math.random() * 24;
    const balance = supply - demand;
    const onlineSectors = 4 + Math.floor(Math.random() * 5);
    const peakLoad = Math.random();
    const renewableRatio = Math.random();
    const cycleNum = Math.random() * 100;

    xs.push([supply / 4000, demand / 4000, freq / 51, volt / 230, stab / 100, eff, hour / 24, balance / 2000, onlineSectors / 8, peakLoad, renewableRatio, cycleNum / 100]);

    const futureDemand = demand * (1 + (Math.random() - 0.5) * 0.1);
    const futureSupply = supply * (1 + (Math.random() - 0.5) * 0.08);
    const risk = Math.abs(balance) / supply * 100;
    const f1 = demand * (1 + (Math.random() - 0.45) * 0.05);
    const f2 = demand * (1 + (Math.random() - 0.4) * 0.06);
    const f3 = demand * (1 + (Math.random() - 0.42) * 0.07);
    const f4 = demand * (1 + (Math.random() - 0.45) * 0.08);
    const f5 = demand * (1 + (Math.random() - 0.43) * 0.09);
    const f6 = demand * (1 + (Math.random() - 0.41) * 0.1);

    ys.push([futureDemand / 4000, futureSupply / 4000, risk / 100, f1 / 4000, f2 / 4000, f3 / 4000, f4 / 4000, f5 / 4000]);
  }

  const xTensor = tf.tensor2d(xs);
  const yTensor = tf.tensor2d(ys);

  await model.fit(xTensor, yTensor, {
    epochs: 20,
    batchSize: 32,
    verbose: 0,
  });

  xTensor.dispose();
  yTensor.dispose();

  return model;
}

export async function runForecast(state: GridState, history: number[]): Promise<ForecastResult> {
  const m = await getModel();

  const avgEfficiency = state.sources.reduce((a, s) => a + s.efficiency, 0) / state.sources.length / 100;
  const onlineSectors = state.sectors.filter(s => s.online).length;
  const renewableSupply = state.sources.filter(s => ['solar', 'wind', 'hydro'].includes(s.type)).reduce((a, s) => a + s.current, 0);
  const renewableRatio = renewableSupply / Math.max(state.totalSupply, 1);
  const hour = new Date().getHours();
  const peakLoad = (hour >= 8 && hour <= 20) ? 1 : 0;
  const balance = state.totalSupply - state.totalDemand;

  const input = tf.tensor2d([[
    state.totalSupply / 4000,
    state.totalDemand / 4000,
    state.frequency / 51,
    state.voltage / 230,
    state.stability / 100,
    avgEfficiency,
    hour / 24,
    balance / 2000,
    onlineSectors / 8,
    peakLoad,
    renewableRatio,
    state.cycleCount / 100,
  ]]);

  const rawOutput = m.predict(input) as tf.Tensor;
  const output = await rawOutput.data();
  input.dispose();
  rawOutput.dispose();

  const predictedDemand = output[0] * 4000;
  const predictedSupply = output[1] * 4000;
  const rawRisk = output[2] * 100;
  const loadForecast = Array.from(output.slice(3)).map(v => v * 4000);

  // Augment with rule-based adjustments
  const freqRisk = Math.abs(state.frequency - 50) * 40;
  const stabRisk = (100 - state.stability) * 0.5;
  const balanceRisk = Math.max(0, Math.abs(balance) / state.totalDemand * 100 - 5);

  const riskScore = Math.min(100, rawRisk * 0.5 + freqRisk * 0.2 + stabRisk * 0.15 + balanceRisk * 0.15);
  const riskLevel: ForecastResult['riskLevel'] =
    riskScore < 25 ? 'LOW' :
    riskScore < 50 ? 'MODERATE' :
    riskScore < 75 ? 'HIGH' : 'CRITICAL';

  const recommendations: string[] = [];
  if (balance < -100) recommendations.push('Activate reserve capacity — supply deficit detected');
  if (balance > 500) recommendations.push('Reduce gas turbine output — surplus exceeds buffer');
  if (state.frequency < 49.8) recommendations.push('Increase generation to restore frequency to 50Hz');
  if (state.frequency > 50.2) recommendations.push('Reduce load or generation — frequency elevated');
  if (state.stability < 60) recommendations.push('Re-balance sector allocations immediately');
  if (renewableRatio < 0.3) recommendations.push('Ramp renewable sources — fossil reliance high');
  const lowEffSources = state.sources.filter(s => s.efficiency < 60 && s.current > 0);
  if (lowEffSources.length > 0) recommendations.push(`Inspect low-efficiency units: ${lowEffSources.map(s => s.name).join(', ')}`);
  if (recommendations.length === 0) recommendations.push('Grid operating within optimal parameters');

  const confidence = Math.max(65, Math.min(98, 85 + (state.stability - 50) * 0.3));

  return {
    predictedDemand: Math.round(predictedDemand),
    predictedSupply: Math.round(predictedSupply),
    riskScore: parseFloat(riskScore.toFixed(1)),
    riskLevel,
    recommendations,
    confidence: parseFloat(confidence.toFixed(1)),
    loadForecast: loadForecast.map(v => Math.round(v)),
  };
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { DeliveryRecord, PerformanceKPIs } from '../types';
import {
  computeGroupedMetrics,
  computeDailyTrend,
  computeDeliveryDistribution
} from '../utils/deliveryParser';
import * as Lucide from 'lucide-react';

interface DeliveryChartsProps {
  records: DeliveryRecord[];
  kpis: PerformanceKPIs;
  targetDays: number;
}

export const DeliveryCharts: React.FC<DeliveryChartsProps> = ({ records, kpis, targetDays }) => {
  const [comparisonField, setComparisonField] = useState<'carrier' | 'client'>('carrier');

  // Grouped metrics
  const groupedData = useMemo(() => {
    return computeGroupedMetrics(records, comparisonField, targetDays);
  }, [records, comparisonField, targetDays]);

  // Daily trend
  const trendData = useMemo(() => {
    return computeDailyTrend(records);
  }, [records]);

  // Delivery distributions
  const distributionData = useMemo(() => {
    return computeDeliveryDistribution(records);
  }, [records]);

  // Colors for donut chart
  const pieData = useMemo(() => {
    return [
      { name: 'A tiempo', value: kpis.onTimeCount, color: '#10b981' }, // emerald-500
      { name: 'Atrasado', value: kpis.delayedCount, color: '#f43f5e' } // rose-500
    ].filter(item => item.value > 0);
  }, [kpis]);

  const COLORS = ['#10b981', '#f43f5e'];

  // Custom tooltips for nice styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-[#27272A] bg-[#121215]/95 backdrop-blur-md p-3 shadow-xl">
          <p className="text-xs font-bold text-white mb-1.5 font-display">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-xs font-medium" style={{ color: p.color || p.fill }}>
              {p.name}: <span className="font-bold text-white">{p.value} {p.name.includes('promedio') || p.name.includes('Promedio') ? 'días hábiles' : 'envíos'}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="dynamic-charts-container" className="space-y-6">
      {/* KPI Section for charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Chart 1: SLA Donut Chart */}
        <div className="rounded-xl border border-[#1F1F24] bg-[#121215] p-5 shadow-sm transition-all duration-300 hover:border-zinc-800/80">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white font-display">Cumplimiento del SLA</h4>
              <p className="text-xs text-zinc-400">Distribución de entregas completadas</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
              <Lucide.PieChart className="h-4 w-4" />
            </span>
          </div>

          <div className="flex flex-col items-center justify-center sm:flex-row sm:space-x-8">
            <div className="relative h-48 w-48">
              {pieData.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                  Sin datos completados
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Absolute Center Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-gray-900 dark:text-white">
                      {kpis.onTimeRate}%
                    </span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      A tiempo
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Legend info */}
            <div className="mt-4 space-y-3 sm:mt-0">
              <div className="flex items-center space-x-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                <div className="text-xs">
                  <span className="font-semibold text-zinc-100">A tiempo (SLA)</span>
                  <p className="text-zinc-400">{kpis.onTimeCount} pedidos (≤ {targetDays} días)</p>
                </div>
              </div>
              <div className="flex items-center space-x-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span>
                <div className="text-xs">
                  <span className="font-semibold text-zinc-100">Atrasados</span>
                  <p className="text-zinc-400">{kpis.delayedCount} pedidos (&gt; {targetDays} días)</p>
                </div>
              </div>
              {kpis.pendingDeliveries > 0 && (
                <div className="flex items-center space-x-2.5 border-t border-[#1F1F24]/60 pt-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
                  <div className="text-xs">
                    <span className="font-semibold text-zinc-100">Pendientes</span>
                    <p className="text-zinc-400">{kpis.pendingDeliveries} pedidos en tránsito</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chart 2: Comparative Bar Chart (by Carrier or Client) */}
        <div className="rounded-xl border border-[#1F1F24] bg-[#121215] p-5 shadow-sm transition-all duration-300 hover:border-zinc-800/80">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h4 className="font-semibold text-white font-display">Tabla Comparativa de Rendimiento</h4>
              <p className="text-xs text-zinc-400">Promedio de días hábiles de entrega</p>
            </div>
            
            {/* Field Toggle */}
            <div className="inline-flex rounded-lg bg-[#1C1C22] p-0.5 border border-[#272730]/40">
              <button
                onClick={() => setComparisonField('carrier')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer transition-all ${
                  comparisonField === 'carrier'
                    ? 'bg-[#272730] text-white border border-[#3F3F46]/30 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Transportista
              </button>
              <button
                onClick={() => setComparisonField('client')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer transition-all ${
                  comparisonField === 'client'
                    ? 'bg-[#272730] text-white border border-[#3F3F46]/30 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Cliente
              </button>
            </div>
          </div>

          <div className="h-56">
            {groupedData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                Sin datos para graficar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupedData.slice(0, 8)} margin={{ top: 10, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F1F24" />
                  <XAxis 
                    dataKey="groupValue" 
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    name="Promedio de días" 
                    dataKey="averageDays" 
                    fill="#6366f1" // indigo-500
                    radius={[4, 4, 0, 0]}
                    maxBarSize={45}
                  >
                    {groupedData.map((entry, index) => {
                      // Highlight groups with higher delays in orange
                      const isHighDelay = entry.averageDays > targetDays;
                      return <Cell key={`cell-${index}`} fill={isHighDelay ? '#f43f5e' : '#6366f1'} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
            <span>* Se muestran los 8 principales grupos</span>
            <span className="flex items-center font-medium text-rose-450">
              <span className="mr-1 h-2 w-2 rounded-full bg-rose-500 inline-block animate-pulse"></span> Excede SLA de {targetDays}d
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Trends & Delivery speed distribution */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {/* Chart 3: Combined volume & days daily trend */}
        <div className="rounded-xl border border-[#1F1F24] bg-[#121215] p-5 shadow-sm transition-all duration-300 hover:border-zinc-800/80 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white font-display">Tendencia Diaria de Pedidos</h4>
              <p className="text-xs text-zinc-400">Relación entre volumen emitido y días de entrega</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
              <Lucide.TrendingUp className="h-4 w-4" />
            </span>
          </div>

          <div className="h-60">
            {trendData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                Sin datos de tendencia temporal
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData} margin={{ top: 10, right: -5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F1F24" />
                  <XAxis 
                    dataKey="dateStr" 
                    tick={{ fill: '#71717a', fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => {
                      const parts = val.split('-');
                      return parts.length === 3 ? `${parts[2]}/${parts[1]}` : val;
                    }}
                  />
                  {/* Left Y-axis for Volume */}
                  <YAxis 
                    yAxisId="left"
                    orientation="left"
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  {/* Right Y-axis for Duration */}
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={32} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
                  <Bar 
                    yAxisId="left"
                    name="Cantidad Pedidos" 
                    dataKey="totalCount" 
                    fill="#4f46e5"
                    fillOpacity={0.15}
                    stroke="#6366f1"
                    strokeWidth={1}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={30}
                  />
                  <Line 
                    yAxisId="right"
                    name="Días Promedio de Entrega" 
                    type="monotone" 
                    dataKey="averageDays" 
                    stroke="#818cf8" // indigo-400
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#818cf8', strokeWidth: 0 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 4: Delivery distribution ranges */}
        <div className="rounded-xl border border-[#1F1F24] bg-[#121215] p-5 shadow-sm transition-all duration-300 hover:border-zinc-800/80">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white font-display">Rangos de Velocidad</h4>
              <p className="text-xs text-zinc-400">Distribución de tiempos (en días)</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/15">
              <Lucide.BarChart3 className="h-4 w-4" />
            </span>
          </div>

          <div className="h-60">
            {records.filter(r => r.daysElapsed !== null).length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                Esperando datos de entrega
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  layout="vertical"
                  data={distributionData} 
                  margin={{ top: 10, right: 10, left: -5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1F1F24" />
                  <XAxis 
                    type="number"
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    type="category"
                    dataKey="range" 
                    tick={{ fill: '#a1a1aa', fontSize: 9, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    name="Pedidos" 
                    dataKey="count" 
                    fill="#3b82f6" // blue-500
                    radius={[0, 4, 4, 0]}
                    maxBarSize={25}
                  >
                    {distributionData.map((entry, index) => {
                      // Apply specific colors to ranges
                      const rangeColors = [
                        '#10b981', // emerald-500 (Muy Rapido)
                        '#6366f1', // indigo-500 (Estandar)
                        '#f59e0b', // amber-500 (Demorado)
                        '#f43f5e'  // rose-500 (Critico)
                      ];
                      return <Cell key={`cell-${index}`} fill={rangeColors[index] || '#3b82f6'} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

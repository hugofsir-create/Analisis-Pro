/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ColumnMapping } from '../types';
import * as Lucide from 'lucide-react';

interface ColumnMapperProps {
  availableKeys: string[];
  mapping: ColumnMapping;
  onChangeMapping: (updated: ColumnMapping) => void;
  onApply: () => void;
  targetDays: number;
  onChangeTargetDays: (days: number) => void;
}

export const ColumnMapper: React.FC<ColumnMapperProps> = ({
  availableKeys,
  mapping,
  onChangeMapping,
  onApply,
  targetDays,
  onChangeTargetDays
}) => {
  const handleSelectChange = (field: keyof ColumnMapping, value: string) => {
    onChangeMapping({
      ...mapping,
      [field]: value
    });
  };

  return (
    <div id="column-mapper-panel" className="rounded-xl border border-[#1F1F24] bg-[#121215] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between border-b border-[#1F1F24]/60 pb-3">
        <div className="flex items-center space-x-2">
          <Lucide.SlidersHorizontal className="h-4.5 w-4.5 text-indigo-450" />
          <h3 className="font-semibold text-white font-display">
            Mapeo de Columnas & Configuración
          </h3>
        </div>
        <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-400">
          Personalizable
        </span>
      </div>

      <p className="mb-4 text-xs text-zinc-400">
        Hemos detectado automáticamente las columnas de tu Excel. Si los resultados no son correctos, selecciona de forma manual las columnas que corresponden a cada campo.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Emission Date Mapping */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-300">
            Fecha de Emisión <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <select
              value={mapping.emissionDateKey}
              onChange={(e) => handleSelectChange('emissionDateKey', e.target.value)}
              className="w-full appearance-none rounded-lg border border-[#2A2A32] bg-[#16161A] px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:bg-[#1E1E24] focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            >
              <option value="">-- Seleccionar Columna --</option>
              {availableKeys.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400">
              <Lucide.ChevronDown className="h-4 w-4" />
            </div>
          </div>
          {mapping.emissionDateKey ? (
            <span className="mt-1 flex items-center text-[10px] text-emerald-450">
              <Lucide.CheckCircle className="mr-0.5 h-3 w-3" /> Columna mapeada
            </span>
          ) : (
            <span className="mt-1 flex items-center text-[10px] text-amber-450">
              <Lucide.AlertCircle className="mr-0.5 h-3 w-3" /> Requerido para cálculo de días
            </span>
          )}
        </div>

        {/* Conforme Date Mapping */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-300">
            Fecha Conforme / Entrega <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <select
              value={mapping.conformeDateKey}
              onChange={(e) => handleSelectChange('conformeDateKey', e.target.value)}
              className="w-full appearance-none rounded-lg border border-[#2A2A32] bg-[#16161A] px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:bg-[#1E1E24] focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            >
              <option value="">-- Seleccionar Columna --</option>
              {availableKeys.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400">
              <Lucide.ChevronDown className="h-4 w-4" />
            </div>
          </div>
          {mapping.conformeDateKey ? (
            <span className="mt-1 flex items-center text-[10px] text-emerald-450">
              <Lucide.CheckCircle className="mr-0.5 h-3 w-3" /> Columna mapeada
            </span>
          ) : (
            <span className="mt-1 flex items-center text-[10px] text-amber-450">
              <Lucide.AlertCircle className="mr-0.5 h-3 w-3" /> Requerido para cálculo de días
            </span>
          )}
        </div>

        {/* ID Pedido Mapping */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-300">
            Identificador (ID Pedido / Guía)
          </label>
          <div className="relative">
            <select
              value={mapping.orderIdKey}
              onChange={(e) => handleSelectChange('orderIdKey', e.target.value)}
              className="w-full appearance-none rounded-lg border border-[#2A2A32] bg-[#16161A] px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:bg-[#1E1E24] focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            >
              <option value="">-- Seleccionar Columna --</option>
              {availableKeys.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400">
              <Lucide.ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Transportista Mapping */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-300">
            Transportista / Courier
          </label>
          <div className="relative">
            <select
              value={mapping.carrierKey}
              onChange={(e) => handleSelectChange('carrierKey', e.target.value)}
              className="w-full appearance-none rounded-lg border border-[#2A2A32] bg-[#16161A] px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:bg-[#1E1E24] focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            >
              <option value="">-- No mapear / Omitir --</option>
              {availableKeys.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400">
              <Lucide.ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Cliente Mapping */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-300">
            Cliente / Destinatario
          </label>
          <div className="relative">
            <select
              value={mapping.clientKey}
              onChange={(e) => handleSelectChange('clientKey', e.target.value)}
              className="w-full appearance-none rounded-lg border border-[#2A2A32] bg-[#16161A] px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:bg-[#1E1E24] focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            >
              <option value="">-- No mapear / Omitir --</option>
              {availableKeys.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400">
              <Lucide.ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Target SLA days limit */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-300 flex items-center justify-between">
            <span>Objetivo de Entrega (SLA en días)</span>
            <span className="font-bold text-indigo-400 font-mono">{targetDays} días</span>
          </label>
          <div className="flex items-center space-x-2 pt-2">
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={targetDays}
              onChange={(e) => onChangeTargetDays(parseInt(e.target.value, 10))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#222227] accent-indigo-550"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onApply}
          disabled={!mapping.emissionDateKey || !mapping.conformeDateKey}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_15px_rgba(99,102,241,0.25)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] disabled:pointer-events-none disabled:bg-[#1C1C22] disabled:text-zinc-600 disabled:shadow-none transition-all cursor-pointer"
        >
          <Lucide.Play className="mr-1.5 h-4 w-4" />
          Procesar Datos Calculados
        </button>
      </div>
    </div>
  );
};

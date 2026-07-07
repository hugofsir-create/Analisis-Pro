/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import * as Lucide from 'lucide-react';

interface LocalidadSlaConfigProps {
  uniqueLocalidades: string[];
  localidadSlaOverrides: Record<string, number>;
  onChangeOverrides: (overrides: Record<string, number>) => void;
  defaultTargetDays: number;
}

export const LocalidadSlaConfig: React.FC<LocalidadSlaConfigProps> = ({
  uniqueLocalidades,
  localidadSlaOverrides,
  onChangeOverrides,
  defaultTargetDays,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Check if there are any changes compared to what is currently saved in localStorage
  const hasUnsavedChanges = useMemo(() => {
    try {
      const saved = localStorage.getItem('delivery_localidad_sla_overrides') || '{}';
      return JSON.stringify(localidadSlaOverrides) !== saved;
    } catch {
      return false;
    }
  }, [localidadSlaOverrides]);

  if (uniqueLocalidades.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#222227] bg-[#111114] p-6 text-center text-zinc-500">
        <Lucide.MapPin className="mx-auto mb-2 h-8 w-8 text-zinc-600" />
        <p className="text-sm">Asigna una columna en "Localidad de Destino" para poder configurar lead times específicos por zona.</p>
      </div>
    );
  }

  // Filter list of unique localities by search query
  const filteredLocalidades = uniqueLocalidades.filter((loc) =>
    loc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpdateDays = (locality: string, days: number) => {
    const updated = { ...localidadSlaOverrides };
    const cleanDays = Math.max(1, Math.min(60, days)); // clamp between 1 and 60 days
    updated[locality] = cleanDays;
    onChangeOverrides(updated);
  };

  const handleResetDays = (locality: string) => {
    const updated = { ...localidadSlaOverrides };
    delete updated[locality];
    onChangeOverrides(updated);
  };

  const handleResetAll = () => {
    onChangeOverrides({});
  };

  const handleSave = () => {
    try {
      localStorage.setItem('delivery_localidad_sla_overrides', JSON.stringify(localidadSlaOverrides));
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
      }, 2500);
    } catch (e) {
      console.error('Error saving overrides to localStorage:', e);
    }
  };

  return (
    <div id="localidad-sla-config" className="rounded-xl border border-[#1F1F24] bg-[#121215] p-5 shadow-sm flex flex-col h-full justify-between">
      <div>
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h4 className="flex items-center text-sm font-semibold text-zinc-100 font-display">
              <Lucide.MapPin className="mr-1.5 h-4 w-4 text-indigo-400" />
              Lead Time Personalizado por Localidad de Destino
            </h4>
            <p className="mt-1 text-xs text-zinc-400">
              Establece un tiempo objetivo de entrega diferente para cada localidad. Si no configuras uno, se usará el general de <strong className="text-indigo-400">{defaultTargetDays} días</strong>.
            </p>
          </div>
          {Object.keys(localidadSlaOverrides).length > 0 && (
            <button
              onClick={handleResetAll}
              className="self-start inline-flex items-center rounded-lg border border-[#2A2A32] bg-[#16161A] px-2.5 py-1 text-xs font-medium text-zinc-400 hover:bg-[#1E1E24] hover:text-white transition-colors cursor-pointer shrink-0"
              title="Restablecer todas las localidades temporalmente"
            >
              <Lucide.RotateCcw className="mr-1 h-3.5 w-3.5" />
              Restablecer
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
            <Lucide.Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar localidad..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[#2A2A32] bg-[#16161A] py-1.5 pl-9 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:bg-[#1E1E24] focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
        </div>

        {/* Localities List */}
        <div className="max-h-48 overflow-y-auto divide-y divide-[#1C1C22] rounded-lg border border-[#1C1C22] bg-[#0E0E11] pr-1">
          {filteredLocalidades.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              No se encontraron localidades que coincidan con la búsqueda.
            </div>
          ) : (
            filteredLocalidades.map((locality) => {
              const hasOverride = localidadSlaOverrides[locality] !== undefined;
              const currentDays = hasOverride ? localidadSlaOverrides[locality] : defaultTargetDays;

              return (
                <div
                  key={locality}
                  className="flex items-center justify-between px-3 py-2 hover:bg-[#131317]/50 transition-colors"
                >
                  <div className="min-w-0 pr-4">
                    <span className="block truncate text-xs font-medium text-zinc-200">
                      {locality}
                    </span>
                    <span className={`text-[10px] ${hasOverride ? 'text-indigo-400 font-semibold' : 'text-zinc-500'}`}>
                      {hasOverride ? `SLA específico: ${currentDays} días` : 'Usando SLA General'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="flex items-center rounded-lg border border-[#2A2A32] bg-[#16161A] p-0.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateDays(locality, currentDays - 1)}
                        disabled={currentDays <= 1}
                        className="flex h-5 w-5 items-center justify-center rounded-md text-zinc-400 hover:bg-[#25252D] hover:text-white disabled:pointer-events-none disabled:opacity-30 cursor-pointer"
                      >
                        <Lucide.Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-[11px] font-semibold text-zinc-100 font-mono">
                        {currentDays} d
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateDays(locality, currentDays + 1)}
                        disabled={currentDays >= 60}
                        className="flex h-5 w-5 items-center justify-center rounded-md text-zinc-400 hover:bg-[#25252D] hover:text-white disabled:pointer-events-none disabled:opacity-30 cursor-pointer"
                      >
                        <Lucide.Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {hasOverride && (
                      <button
                        type="button"
                        onClick={() => handleResetDays(locality)}
                        title="Volver al SLA General"
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-transparent text-zinc-500 hover:border-[#2A2A32] hover:bg-[#1C1C22] hover:text-zinc-300 transition-colors cursor-pointer"
                      >
                        <Lucide.X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Save Action Area */}
      <div className="mt-4 pt-4 border-t border-[#1F1F24] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {hasUnsavedChanges ? (
            <span className="inline-flex items-center text-xs text-amber-400 font-medium">
              <Lucide.AlertCircle className="mr-1.5 h-3.5 w-3.5 shrink-0" />
              Cambios sin guardar
            </span>
          ) : (
            <span className="inline-flex items-center text-xs text-emerald-400 font-medium">
              <Lucide.CheckCircle2 className="mr-1.5 h-3.5 w-3.5 shrink-0" />
              SLA guardado
            </span>
          )}
        </div>

        <button
          onClick={handleSave}
          className={`inline-flex items-center justify-center rounded-lg px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-all cursor-pointer ${
            hasUnsavedChanges
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold ring-1 ring-indigo-500/20 hover:scale-[1.02] active:scale-[0.98]'
              : 'bg-[#1C1C22] text-zinc-400 cursor-not-allowed border border-[#2A2A32]'
          }`}
          disabled={!hasUnsavedChanges && !isSaved}
        >
          {isSaved ? (
            <>
              <Lucide.Check className="mr-1.5 h-3.5 w-3.5 text-emerald-400 stroke-[3]" />
              ¡Guardado!
            </>
          ) : (
            <>
              <Lucide.Save className="mr-1.5 h-3.5 w-3.5" />
              Guardar Cambios
            </>
          )}
        </button>
      </div>
    </div>
  );
};

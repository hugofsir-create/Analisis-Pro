/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { DeliveryRecord } from '../types';
import * as Lucide from 'lucide-react';
import * as XLSX from 'xlsx';
import { calculateDaysBetween } from '../utils/deliveryParser';

interface DeliveryGridProps {
  records: DeliveryRecord[];
  targetDays: number;
}

type SortField = 'orderId' | 'emissionDate' | 'conformeDate' | 'daysElapsed' | 'carrier' | 'client' | 'localidad';
type SortOrder = 'asc' | 'desc';

export const DeliveryGrid: React.FC<DeliveryGridProps> = ({ records, targetDays }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('emissionDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Expanded rows state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const toggleAllRows = () => {
    if (expandedRows.size === paginatedRecords.length) {
      setExpandedRows(new Set());
    } else {
      setExpandedRows(new Set(paginatedRecords.map(r => r.id)));
    }
  };

  // Handle Sort Change
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Filter and sort records
  const filteredAndSortedRecords = useMemo(() => {
    let result = [...records];

    // Global text filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.orderId.toLowerCase().includes(term) ||
        r.carrier.toLowerCase().includes(term) ||
        r.client.toLowerCase().includes(term) ||
        Object.values(r.originalRow).some(val => 
          String(val).toLowerCase().includes(term)
        )
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'daysElapsed') {
        if (valA === null && a.emissionDate) {
          valA = calculateDaysBetween(a.emissionDate, new Date());
        }
        if (valB === null && b.emissionDate) {
          valB = calculateDaysBetween(b.emissionDate, new Date());
        }
      }

      // Handle nulls
      if (valA === null || valA === undefined) return sortOrder === 'asc' ? 1 : -1;
      if (valB === null || valB === undefined) return sortOrder === 'asc' ? -1 : 1;

      if (valA instanceof Date && valB instanceof Date) {
        return sortOrder === 'asc' 
          ? valA.getTime() - valB.getTime()
          : valB.getTime() - valA.getTime();
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      // Numbers
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return result;
  }, [records, searchTerm, statusFilter, sortField, sortOrder]);

  // Paginated records
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedRecords.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedRecords, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRecords.length / pageSize));

  // Handle Export to Excel
  const handleExport = () => {
    const dataToExport = filteredAndSortedRecords.map(r => {
      // Create a nice flat record containing original row + computed values
      const formattedEmission = r.emissionDate ? r.emissionDate.toLocaleDateString('es-ES') : '';
      const formattedConforme = r.conformeDate ? r.conformeDate.toLocaleDateString('es-ES') : '';
      
      const pendingDays = r.daysElapsed !== null 
        ? null 
        : (r.emissionDate ? calculateDaysBetween(r.emissionDate, new Date()) : null);

      return {
        'N° DE REMITO': r.orderId,
        'LOCALIDAD DE DESTINO': r.localidad || '—',
        'FECHA EMISIÓN (CALCULADA)': formattedEmission,
        'FECHA CONFORME (CALCULADA)': formattedConforme,
        'DÍAS TRANSCURRIDOS': r.daysElapsed !== null 
          ? r.daysElapsed 
          : (pendingDays !== null ? `${pendingDays} (Pendiente)` : 'Pendiente'),
        'ESTADO DE ENTREGA': r.status,
        'SLA OBJETIVO (DÍAS)': targetDays,
        'DIFERENCIA SLA (DÍAS)': r.daysElapsed !== null 
          ? r.daysElapsed - targetDays 
          : (pendingDays !== null ? pendingDays - targetDays : ''),
        ...r.originalRow
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Análisis de Entregas');
    XLSX.writeFile(workbook, 'Reporte_Analisis_Tiempos_Entrega.xlsx');
  };

  const formatDate = (date: Date | null) => {
    if (!date) return <span className="text-gray-400 dark:text-gray-600">—</span>;
    return <span className="font-medium text-gray-700 dark:text-gray-300">{date.toLocaleDateString('es-ES')}</span>;
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <Lucide.ArrowUpDown className="ml-1 h-3.5 w-3.5 text-gray-400" />;
    return sortOrder === 'asc' 
      ? <Lucide.ArrowUp className="ml-1 h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
      : <Lucide.ArrowDown className="ml-1 h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />;
  };

  return (
    <div id="interactive-grid-container" className="rounded-xl border border-[#1F1F24] bg-[#121215] shadow-sm overflow-hidden">
      {/* Grid Toolbar Controls */}
      <div className="flex flex-col gap-4 border-b border-[#1F1F24] p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          {/* Search bar */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
              <Lucide.Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Buscar por ID, cliente, transportista u otra columna..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-lg border border-[#2A2A32] bg-[#16161A] py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500/80 focus:bg-[#1E1E24] focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
            />
          </div>

          {/* Filter by Status */}
          <div className="relative w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full appearance-none rounded-lg border border-[#2A2A32] bg-[#16161A] px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500/80 focus:bg-[#1E1E24] focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
            >
              <option value="all">Todos los Estados</option>
              <option value="A tiempo">A tiempo (dentro del SLA)</option>
              <option value="Atrasado">Atrasados (fuera del SLA)</option>
              <option value="Pendiente">Pendientes (sin entrega)</option>
              <option value="Sin Datos">Sin Datos Completos</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500">
              <Lucide.Filter className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center rounded-lg border border-[#2A2A32] bg-[#16161A] px-4 py-2 text-sm font-semibold text-zinc-200 shadow-sm hover:bg-[#1C1C22] cursor-pointer transition-colors"
          >
            <Lucide.Download className="mr-2 h-4 w-4 text-emerald-400" />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#1F1F24]">
          <thead className="bg-[#16161A]/60">
            <tr>
              <th scope="col" className="w-10 px-4 py-3 text-left">
                <button 
                  onClick={toggleAllRows}
                  className="rounded-sm p-1 hover:bg-[#272730] text-zinc-400 cursor-pointer"
                  title="Expandir/Contraer todos"
                >
                  <Lucide.ChevronsUpDown className="h-4 w-4" />
                </button>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 font-display">
                <button onClick={() => handleSort('orderId')} className="flex items-center font-semibold uppercase focus:outline-none cursor-pointer hover:text-white">
                  N° de Remito {getSortIcon('orderId')}
                </button>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 font-display">
                <button onClick={() => handleSort('emissionDate')} className="flex items-center font-semibold uppercase focus:outline-none cursor-pointer hover:text-white">
                  Fecha Emisión {getSortIcon('emissionDate')}
                </button>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 font-display">
                <button onClick={() => handleSort('conformeDate')} className="flex items-center font-semibold uppercase focus:outline-none cursor-pointer hover:text-white">
                  Fecha Conforme {getSortIcon('conformeDate')}
                </button>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 font-display">
                <button onClick={() => handleSort('daysElapsed')} className="flex items-center font-semibold uppercase focus:outline-none cursor-pointer hover:text-white">
                  Días Hábiles {getSortIcon('daysElapsed')}
                </button>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 font-display">
                <button onClick={() => handleSort('localidad')} className="flex items-center font-semibold uppercase focus:outline-none cursor-pointer hover:text-white">
                  Localidad {getSortIcon('localidad')}
                </button>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 font-display">
                <button onClick={() => handleSort('client')} className="flex items-center font-semibold uppercase focus:outline-none cursor-pointer hover:text-white">
                  Cliente {getSortIcon('client')}
                </button>
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-400 font-display">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F1F24] bg-[#0E0E11]">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <Lucide.Inbox className="mx-auto h-12 w-12 text-zinc-600" />
                  <h3 className="mt-2 text-sm font-semibold text-zinc-300">Ningún registro encontrado</h3>
                  <p className="mt-1 text-xs text-zinc-500">Prueba ajustando los filtros o el término de búsqueda.</p>
                </td>
              </tr>
            ) : (
              paginatedRecords.map((record) => {
                const isExpanded = expandedRows.has(record.id);
                return (
                  <React.Fragment key={record.id}>
                    <tr className={`group hover:bg-indigo-500/5 transition-colors duration-200 ${isExpanded ? 'bg-indigo-950/10' : ''}`}>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleRow(record.id)}
                          className="rounded-full p-1 hover:bg-[#1F1F24] text-zinc-400 hover:text-white focus:outline-none cursor-pointer transition-colors"
                        >
                          {isExpanded ? (
                            <Lucide.ChevronUp className="h-4 w-4" />
                          ) : (
                            <Lucide.ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-indigo-400 font-display">
                        {record.orderId}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-300">
                        {formatDate(record.emissionDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-300">
                        {formatDate(record.conformeDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-mono font-medium">
                        {record.daysElapsed !== null ? (
                          <div className="flex items-center">
                            <span className="text-zinc-100">{record.daysElapsed}</span>
                            <span className="ml-1 text-xs text-zinc-500">días hábiles</span>
                          </div>
                        ) : record.emissionDate ? (
                          <div className="flex items-center text-amber-500 animate-pulse-slow" title="Días hábiles transcurridos hasta hoy para este pedido pendiente">
                            <Lucide.Clock className="mr-1.5 h-3.5 w-3.5 animate-pulse shrink-0" />
                            <span className="font-bold">{calculateDaysBetween(record.emissionDate, new Date())}</span>
                            <span className="ml-1 text-[11px] text-amber-500/80 font-sans font-normal">d. hábiles (Pendiente)</span>
                          </div>
                        ) : (
                          <span className="text-amber-400 font-sans text-xs flex items-center">
                            <Lucide.Clock className="mr-1 h-3.5 w-3.5" /> Pendiente
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-300">
                        {record.localidad || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-300">
                        {record.client}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                        {record.status === 'A tiempo' && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"></span>
                            A tiempo
                          </span>
                        )}
                        {record.status === 'Atrasado' && (
                          <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/20">
                            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]"></span>
                            Atrasado
                          </span>
                        )}
                        {record.status === 'Pendiente' && (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
                            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]"></span>
                            Pendiente
                          </span>
                        )}
                        {record.status === 'Sin Datos' && (
                          <span className="inline-flex items-center rounded-full bg-zinc-800/60 px-2.5 py-0.5 text-xs font-semibold text-zinc-300 border border-zinc-700/50">
                            Incompleto
                          </span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Expanded Detail Row (Showing EACH column of the Excel file row) */}
                    {isExpanded && (
                      <tr className="bg-[#0A0A0C]">
                        <td colSpan={8} className="px-6 py-4 border-y border-[#1F1F24]">
                          <div className="rounded-lg border border-[#1F1F24] bg-[#121215] p-4">
                            <h5 className="mb-3 flex items-center text-xs font-bold uppercase tracking-wider text-zinc-400 font-display">
                              <Lucide.Info className="mr-1.5 h-4 w-4 text-indigo-400" />
                              Todos los Datos de la Fila del Excel
                            </h5>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                              {/* Display Mapped Fields Highlighted */}
                              <div className="rounded-md border border-indigo-500/20 bg-indigo-500/5 p-2">
                                <span className="block text-[10px] font-semibold text-indigo-400 uppercase tracking-wide">N° de Remito</span>
                                <span className="text-xs font-medium text-zinc-100">{record.orderId}</span>
                              </div>
                              <div className="rounded-md border border-indigo-500/20 bg-indigo-500/5 p-2">
                                <span className="block text-[10px] font-semibold text-indigo-400 uppercase tracking-wide">Localidad de Destino</span>
                                <span className="text-xs font-medium text-zinc-100">{record.localidad || '—'}</span>
                              </div>
                              <div className="rounded-md border border-indigo-500/20 bg-indigo-500/5 p-2">
                                <span className="block text-[10px] font-semibold text-indigo-400 uppercase tracking-wide">Fecha Emisión</span>
                                <span className="text-xs font-medium text-zinc-100">{record.emissionDate ? record.emissionDate.toLocaleDateString('es-ES') : '—'}</span>
                              </div>
                              <div className="rounded-md border border-indigo-500/20 bg-indigo-500/5 p-2">
                                <span className="block text-[10px] font-semibold text-indigo-400 uppercase tracking-wide">Fecha Conforme</span>
                                <span className="text-xs font-medium text-zinc-100">{record.conformeDate ? record.conformeDate.toLocaleDateString('es-ES') : '—'}</span>
                              </div>
                              <div className="rounded-md border border-indigo-500/20 bg-indigo-500/5 p-2">
                                <span className="block text-[10px] font-semibold text-indigo-400 uppercase tracking-wide">Días Transcurridos</span>
                                <span className="text-xs font-bold text-zinc-100">{record.daysElapsed !== null ? `${record.daysElapsed} días` : 'Pendiente'}</span>
                              </div>
                              
                              {/* Display every other original column */}
                              {Object.entries(record.originalRow).map(([key, value]) => {
                                return (
                                  <div key={key} className="rounded-md border border-[#222227] bg-[#16161A] p-2">
                                    <span className="block text-[10px] font-medium text-zinc-400 truncate" title={key}>{key}</span>
                                    <span className="text-xs font-medium text-zinc-100 truncate block animate-fade-in" title={String(value)}>
                                      {value !== null && value !== undefined && value !== '' ? String(value) : <span className="text-zinc-600">vacío</span>}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Grid Pagination Footer */}
      {filteredAndSortedRecords.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-4 border-t border-[#1F1F24] p-5 bg-[#121215] sm:flex-row">
          <div className="flex items-center space-x-2 text-sm text-zinc-400">
            <span>Mostrar</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setCurrentPage(1); }}
              className="rounded-md border border-[#2A2A32] bg-[#16161A] px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>filas de <strong>{filteredAndSortedRecords.length}</strong> registros</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="rounded-lg border border-[#2A2A32] bg-[#16161A] p-2 text-zinc-400 hover:bg-[#1E1E24] hover:text-white disabled:pointer-events-none disabled:opacity-30 transition-colors cursor-pointer"
            >
              <Lucide.ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-[#2A2A32] bg-[#16161A] p-2 text-zinc-400 hover:bg-[#1E1E24] hover:text-white disabled:pointer-events-none disabled:opacity-30 transition-colors cursor-pointer"
            >
              <Lucide.ChevronLeft className="h-4 w-4" />
            </button>
            
            <span className="text-sm font-medium text-zinc-300">
              Pág. {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-[#2A2A32] bg-[#16161A] p-2 text-zinc-400 hover:bg-[#1E1E24] hover:text-white disabled:pointer-events-none disabled:opacity-30 transition-colors cursor-pointer"
            >
              <Lucide.ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-[#2A2A32] bg-[#16161A] p-2 text-zinc-400 hover:bg-[#1E1E24] hover:text-white disabled:pointer-events-none disabled:opacity-30 transition-colors cursor-pointer"
            >
              <Lucide.ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import * as Lucide from 'lucide-react';
import * as XLSX from 'xlsx';

import { ColumnMapping, DeliveryRecord, PerformanceKPIs } from './types';
import { MetricCard } from './components/MetricCard';
import { ColumnMapper } from './components/ColumnMapper';
import { DeliveryCharts } from './components/DeliveryCharts';
import { DeliveryGrid } from './components/DeliveryGrid';
import {
  autoDetectMappings,
  processRawRows,
  computeKPIs,
  computeGroupedMetrics,
  generateSampleData,
  downloadExcelTemplate
} from './utils/deliveryParser';

export default function App() {
  const [rawData, setRawData] = useState<any[] | null>(null);
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    emissionDateKey: '',
    conformeDateKey: '',
    carrierKey: '',
    clientKey: '',
    statusKey: '',
    orderIdKey: ''
  });
  const [targetDays, setTargetDays] = useState<number>(7);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'analytics' | 'grid' | 'comparison'>('analytics');
  const [comparisonType, setComparisonType] = useState<'carrier' | 'client'>('carrier');
  const [isDragActive, setIsDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse Excel/CSV raw JSON records into parsed DeliveryRecord models
  const processedRecords = useMemo(() => {
    if (!rawData) return [];
    return processRawRows(rawData, mapping, targetDays);
  }, [rawData, mapping, targetDays]);

  // Compute overall delivery KPIs
  const kpis = useMemo(() => {
    return computeKPIs(processedRecords, targetDays);
  }, [processedRecords, targetDays]);

  // Compute comparative grouped metrics for the summary table
  const comparativeMetrics = useMemo(() => {
    return computeGroupedMetrics(processedRecords, comparisonType, targetDays);
  }, [processedRecords, comparisonType, targetDays]);

  // Safe file reader
  const handleFile = (file: File) => {
    if (!file) return;
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls' && fileExtension !== 'csv') {
      setError('Formato de archivo inválido. Por favor sube un archivo de Excel (.xlsx, .xls) o CSV.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        let workbook;
        if (fileExtension === 'csv') {
          // Parse CSV with standard string type
          workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        } else {
          // Parse Binary Excel
          workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        }
        
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        
        if (json.length === 0) {
          setError('El archivo Excel está vacío o no contiene filas de datos.');
          return;
        }

        const keys = Object.keys(json[0] as object);
        setAvailableKeys(keys);
        setRawData(json);
        
        const detectedMappings = autoDetectMappings(keys);
        setMapping(detectedMappings);
        setFileName(file.name);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Ocurrió un error al analizar el archivo de Excel. Asegúrate de que el archivo no esté protegido.');
      }
    };
    reader.onerror = () => {
      setError('Ocurrió un error de lectura de archivo.');
    };
    reader.readAsBinaryString(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // Loads the rich sample dataset
  const handleLoadDemoData = () => {
    const demoJson = generateSampleData();
    const keys = Object.keys(demoJson[0]);
    setAvailableKeys(keys);
    setRawData(demoJson);
    setMapping(autoDetectMappings(keys));
    setFileName('Datos_Ejemplo_Tiempos_Entrega.xlsx');
    setError(null);
  };

  const handleReset = () => {
    setRawData(null);
    setAvailableKeys([]);
    setFileName('');
    setError(null);
    setMapping({
      emissionDateKey: '',
      conformeDateKey: '',
      carrierKey: '',
      clientKey: '',
      statusKey: '',
      orderIdKey: ''
    });
  };

  return (
    <div className="min-h-screen bg-[#070708] pb-16 text-zinc-100 antialiased selection:bg-indigo-500/20 selection:text-indigo-200">
      
      {/* Header Bar */}
      <header className="sticky top-0 z-50 border-b border-[#1F1F24] bg-[#0A0A0C]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
              <Lucide.Truck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-white leading-none">
                Analizador de Tiempos de Entrega
              </h1>
              <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mt-0.5 block">
                Métricas de Rendimiento & SLA
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {rawData && (
              <button
                onClick={handleReset}
                className="inline-flex items-center space-x-1.5 rounded-lg border border-[#272730] bg-[#16161A] px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-[#1C1C22] cursor-pointer transition"
              >
                <Lucide.RotateCcw className="h-3.5 w-3.5 text-rose-400" />
                <span>Cargar nuevo archivo</span>
              </button>
            )}
            <button
              onClick={downloadExcelTemplate}
              className="inline-flex items-center space-x-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/20 cursor-pointer transition"
              title="Descargar una plantilla modelo en Excel para ver el formato ideal"
            >
              <Lucide.Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Plantilla Excel</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        
        {/* State: No file uploaded yet */}
        {!rawData ? (
          <div className="mx-auto max-w-2xl py-12">
            
            {/* Title / Intro */}
            <div className="mb-8 text-center">
              <motion.h2 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-3xl font-black tracking-tight text-white sm:text-4xl"
              >
                Analiza la eficiencia de tus envíos
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mt-3 text-sm text-zinc-400"
              >
                Carga un archivo Excel o CSV para calcular automáticamente los tiempos de entrega desde la emisión hasta el conforme. Visualiza tus embotellamientos, SLA e indicadores clave.
              </motion.p>
            </div>

            {/* Error banner */}
            {error && (
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-5 flex items-start space-x-3 rounded-lg bg-rose-500/10 p-4 border border-rose-500/20 text-rose-300"
              >
                <Lucide.AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
                <div className="text-xs font-semibold leading-relaxed">
                  {error}
                </div>
              </motion.div>
            )}

            {/* File Drag and Drop Box */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all cursor-pointer ${
                isDragActive
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                  : 'border-zinc-800 bg-[#121215] hover:border-indigo-500/50'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls, .csv"
                className="hidden"
              />
              <div className="rounded-full bg-indigo-500/10 p-4 text-indigo-400 border border-indigo-500/15">
                <Lucide.UploadCloud className="h-8 w-8" />
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-white">
                Arrastra tu archivo aquí o haz clic para buscar
              </h3>
              <p className="mt-1.5 text-xs text-zinc-500">
                Soporta archivos Excel (.xlsx, .xls) y CSV estructurados en tablas
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <div className="flex items-center space-x-1.5 text-xs text-zinc-400">
                  <Lucide.Calendar className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Requiere fecha de Emisión y Conforme/Entrega</span>
                </div>
              </div>
            </motion.div>

            {/* Demo Instant Action */}
            <div className="mt-8 flex flex-col items-center justify-center rounded-xl bg-indigo-950/10 p-5 border border-indigo-500/15">
              <span className="text-xs font-semibold text-indigo-400">
                ¿No tienes un archivo Excel listo para probar?
              </span>
              <button
                type="button"
                onClick={handleLoadDemoData}
                className="mt-3 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/10 hover:bg-indigo-500 cursor-pointer transition"
              >
                <Lucide.FileSpreadsheet className="mr-1.5 h-4 w-4" />
                Cargar datos demostrativos estructurados
              </button>
            </div>
          </div>
        ) : (
          /* State: File has been loaded, active analytics view */
          <div className="space-y-6">
            
            {/* Header dashboard banner */}
            <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#1F1F24] bg-[#121215] p-5 shadow-sm sm:flex-row sm:items-center">
              <div className="flex items-start space-x-3.5">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/15">
                  <Lucide.CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-white">
                    {fileName}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Se cargaron <strong className="text-zinc-100">{rawData.length}</strong> registros del Excel con éxito
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-400 border border-indigo-500/15">
                  SLA: ≤ {targetDays} días
                </span>
                <button
                  onClick={handleReset}
                  className="rounded-lg border border-[#272730] p-2 text-zinc-400 bg-[#16161A] hover:bg-rose-500/10 hover:text-rose-400 cursor-pointer transition-colors"
                  title="Eliminar archivo y volver a cargar"
                >
                  <Lucide.Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Performance Indicators Grid (KPIs) */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total Envíos"
                value={kpis.totalDeliveries}
                subtitle={`${kpis.completedDeliveries} entregados | ${kpis.pendingDeliveries} en tránsito`}
                icon="Package"
                color="blue"
                id="kpi-total"
              />
              <MetricCard
                title="Promedio Entrega"
                value={`${kpis.averageDays} días`}
                subtitle={`Mín: ${kpis.minDays}d | Máx: ${kpis.maxDays}d`}
                icon="Clock"
                color="indigo"
                id="kpi-avg"
              />
              <MetricCard
                title="Cumplimiento SLA"
                value={`${kpis.onTimeRate}%`}
                subtitle={`${kpis.onTimeCount} entregados a tiempo`}
                icon="Award"
                color="emerald"
                id="kpi-sla"
              />
              <MetricCard
                title="Envíos Atrasados"
                value={kpis.delayedCount}
                subtitle={`${kpis.delayedRate}% de entregas excedieron SLA`}
                icon="AlertTriangle"
                color="rose"
                id="kpi-delayed"
              />
            </div>

            {/* Config & Mappings area */}
            <div className="overflow-hidden rounded-xl border border-[#1F1F24] bg-[#121215] shadow-sm">
              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between p-5 text-sm font-semibold text-white select-none hover:bg-[#16161A]/50 transition-colors">
                  <div className="flex items-center space-x-2">
                    <Lucide.SlidersHorizontal className="h-4 w-4 text-indigo-400" />
                    <span>Configuración de Columnas y Parámetros del SLA (Opcional)</span>
                  </div>
                  <span className="text-xs font-normal text-zinc-500 group-open:hidden">Mostrar opciones de mapeo</span>
                  <span className="text-xs font-normal text-indigo-400 hidden group-open:inline">Ocultar opciones</span>
                </summary>
                <div className="border-t border-[#1F1F24] p-5 bg-[#121215]">
                  <ColumnMapper
                    availableKeys={availableKeys}
                    mapping={mapping}
                    onChangeMapping={setMapping}
                    onApply={() => {
                      // Trigger state refresh for processed records
                      setRawData([...rawData]);
                    }}
                    targetDays={targetDays}
                    onChangeTargetDays={setTargetDays}
                  />
                </div>
              </details>
            </div>

            {/* Main Tabs Navigation */}
            <div className="border-b border-[#1F1F24]">
              <nav className="-mb-px flex space-x-6">
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`flex items-center space-x-2 border-b-2 py-3 px-1 text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'analytics'
                      ? 'border-indigo-500 text-indigo-400 shadow-[0_2px_0_0_#6366f1]'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <Lucide.BarChart3 className="h-4 w-4" />
                  <span>Gráficos Dinámicos</span>
                </button>

                <button
                  onClick={() => setActiveTab('comparison')}
                  className={`flex items-center space-x-2 border-b-2 py-3 px-1 text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'comparison'
                      ? 'border-indigo-500 text-indigo-400 shadow-[0_2px_0_0_#6366f1]'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <Lucide.TableProperties className="h-4 w-4" />
                  <span>Resumen Comparativo</span>
                </button>

                <button
                  onClick={() => setActiveTab('grid')}
                  className={`flex items-center space-x-2 border-b-2 py-3 px-1 text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'grid'
                      ? 'border-indigo-500 text-indigo-400 shadow-[0_2px_0_0_#6366f1]'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <Lucide.Table className="h-4 w-4" />
                  <span>Grid Interactivo de Datos</span>
                </button>
              </nav>
            </div>

            {/* TAB CONTENTS */}

            {/* TAB 1: Charts */}
            {activeTab === 'analytics' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <DeliveryCharts
                  records={processedRecords}
                  kpis={kpis}
                  targetDays={targetDays}
                />
              </motion.div>
            )}

            {/* TAB 2: Grid Table */}
            {activeTab === 'grid' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <DeliveryGrid
                  records={processedRecords}
                  targetDays={targetDays}
                />
              </motion.div>
            )}

            {/* TAB 3: Comparative Table Summary */}
            {activeTab === 'comparison' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Selector Header */}
                <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#1F1F24] bg-[#121215] p-5 shadow-sm sm:flex-row sm:items-center">
                  <div>
                    <h4 className="font-display font-bold text-white">
                      Análisis Comparativo de Rendimiento
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Visualiza indicadores de volumen, tiempos de entrega promedio y tasas de conformidad.
                    </p>
                  </div>
                  
                  {/* Selector Group Toggle */}
                  <div className="inline-flex rounded-lg bg-[#1C1C22] p-0.5 border border-[#272730]/40">
                    <button
                      onClick={() => setComparisonType('carrier')}
                      className={`rounded-md px-3.5 py-1.5 text-xs font-semibold cursor-pointer transition ${
                        comparisonType === 'carrier'
                          ? 'bg-[#272730] text-white border border-[#3F3F46]/30 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Comparar por Transportista
                    </button>
                    <button
                      onClick={() => setComparisonType('client')}
                      className={`rounded-md px-3.5 py-1.5 text-xs font-semibold cursor-pointer transition ${
                        comparisonType === 'client'
                          ? 'bg-[#272730] text-white border border-[#3F3F46]/30 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Comparar por Cliente
                    </button>
                  </div>
                </div>

                {/* Comparative Metrics Table */}
                <div className="overflow-hidden rounded-xl border border-[#1F1F24] bg-[#121215] shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#1F1F24]">
                      <thead className="bg-[#16161A]/60">
                        <tr>
                          <th scope="col" className="px-6 py-4.5 text-left text-xs font-bold uppercase tracking-wider text-zinc-400 font-display">
                            {comparisonType === 'carrier' ? 'Transportista / Courier' : 'Cliente / Destino'}
                          </th>
                          <th scope="col" className="px-6 py-4.5 text-center text-xs font-bold uppercase tracking-wider text-zinc-400 font-display">
                            Volumen Total Envíos
                          </th>
                          <th scope="col" className="px-6 py-4.5 text-center text-xs font-bold uppercase tracking-wider text-zinc-400 font-display">
                            Entregas Concluidas
                          </th>
                          <th scope="col" className="px-6 py-4.5 text-center text-xs font-bold uppercase tracking-wider text-zinc-400 font-display">
                            Tiempos Promedio
                          </th>
                          <th scope="col" className="px-6 py-4.5 text-center text-xs font-bold uppercase tracking-wider text-zinc-400 font-display">
                            Cumplimiento SLA (≤ {targetDays}d)
                          </th>
                          <th scope="col" className="px-6 py-4.5 text-center text-xs font-bold uppercase tracking-wider text-zinc-400 font-display">
                            Indicador de Desempeño
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1F1F24] bg-[#0E0E11]">
                        {comparativeMetrics.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-sm text-zinc-500">
                              No hay suficientes datos válidos para generar la comparativa.
                            </td>
                          </tr>
                        ) : (
                          comparativeMetrics.map((metric, i) => {
                            // Calculate performance rating
                            let ratingLabel = 'Aceptable';
                            let ratingColor = 'text-amber-400 bg-amber-500/10 border border-amber-500/20';
                            let ratingPulse = 'bg-amber-500';

                            if (metric.onTimeRate >= 90) {
                              ratingLabel = 'Excelente';
                              ratingColor = 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20';
                              ratingPulse = 'bg-emerald-500';
                            } else if (metric.onTimeRate < 75) {
                              ratingLabel = 'Crítico';
                              ratingColor = 'text-rose-400 bg-rose-500/10 border border-rose-500/20';
                              ratingPulse = 'bg-rose-500';
                            }

                            return (
                              <tr key={metric.groupValue} className="hover:bg-indigo-500/5 transition-colors duration-200">
                                <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-zinc-100 font-display">
                                  {metric.groupValue}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium text-zinc-300">
                                  {metric.total}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-zinc-400">
                                  {metric.completed}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-mono font-semibold text-zinc-100">
                                  <span className={metric.averageDays > targetDays ? 'text-rose-400' : 'text-emerald-400'}>
                                    {metric.averageDays} días
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                                  <div className="flex items-center justify-center space-x-2">
                                    <div className="h-2 w-24 rounded-full bg-[#1F1F24] overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${
                                          metric.onTimeRate >= 90 ? 'bg-emerald-500' : metric.onTimeRate >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${metric.onTimeRate}%` }}
                                      ></div>
                                    </div>
                                    <span className="font-mono font-bold text-zinc-200">{metric.onTimeRate}%</span>
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${ratingColor}`}>
                                    <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${ratingPulse} animate-pulse`}></span>
                                    {ratingLabel}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Analytical Insight */}
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">
                  <h5 className="flex items-center text-sm font-bold text-indigo-400 font-display mb-1.5">
                    <Lucide.Info className="mr-2 h-4.5 w-4.5 text-indigo-400" />
                    Cómo leer esta comparativa
                  </h5>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Usa esta tabla para identificar embotellamientos en tus despachos. Los transportistas calificados con un desempeño <strong className="font-bold text-rose-400">Crítico</strong> presentan tasas de cumplimiento de SLA por debajo del 75% o tiempos de entrega promedio que superan el límite objetivo de {targetDays} días. Considera optimizar rutas o renegociar con couriers calificados como <strong className="font-bold text-emerald-400">Excelente</strong>.
                  </p>
                </div>
              </motion.div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}

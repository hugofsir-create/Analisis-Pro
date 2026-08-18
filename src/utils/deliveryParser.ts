/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { ColumnMapping, DeliveryRecord, PerformanceKPIs, GroupedMetric, DailyTrend, DeliveryDistribution } from '../types';

/**
 * Safely parses any value into a JavaScript Date object.
 * Handles Excel serial numbers, ISO strings, slash-separated dates (DD/MM/YYYY or MM/DD/YYYY), etc.
 */
export function parseDateValue(val: any): Date | null {
  if (val === undefined || val === null || val === '') return null;
  
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  // If it's an Excel numeric date representation (serial number)
  if (typeof val === 'number') {
    // Excel base date is Dec 30, 1899 (due to Leap Year bug in Lotus 1-2-3)
    // Excel counts 1900 as a leap year, so serial dates are off by 1-2 days.
    // Standard conversion:
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const msInDay = 24 * 60 * 60 * 1000;
    const converted = new Date(excelEpoch.getTime() + val * msInDay);
    return isNaN(converted.getTime()) ? null : converted;
  }

  const str = String(val).trim();
  if (!str) return null;

  // Try standard parsing
  let d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  // Handle DD/MM/YYYY or DD-MM-YYYY formats (very common in Spanish Excel files)
  const slashRegex = /^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
  const match = str.match(slashRegex);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const year = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const min = match[5] ? parseInt(match[5], 10) : 0;
    const sec = match[6] ? parseInt(match[6], 10) : 0;

    // We can't be 100% sure if DD/MM/YYYY or MM/DD/YYYY.
    // Let's assume DD/MM/YYYY first. If month > 11, swap day and month.
    if (month > 11 && day <= 12) {
      const actualMonth = day - 1;
      const actualDay = month + 1;
      d = new Date(year, actualMonth, actualDay, hour, min, sec);
    } else {
      d = new Date(year, month, day, hour, min, sec);
    }
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * Automatically searches for best matching keys for specific column roles.
 */
export function autoDetectMappings(keys: string[]): ColumnMapping {
  const normalizedKeys = keys.map(k => ({
    original: k,
    lower: k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
  }));

  const findMatch = (keywords: string[]): string => {
    // Exact or partial match
    for (const keyword of keywords) {
      const found = normalizedKeys.find(nk => 
        nk.lower === keyword || nk.lower.includes(keyword)
      );
      if (found) return found.original;
    }
    return '';
  };

  const emissionKeywords = [
    'fecha emision', 'fecha de emision', 'fecha_emision', 'emision', 
    'fecha de pedido', 'fecha pedido', 'fecha_pedido', 'fecha orden', 
    'fecha creacion', 'fecha_creacion', 'order date', 'issue date', 'created_at'
  ];

  const conformeKeywords = [
    'fecha conforme', 'fecha de conforme', 'fecha_conforme', 'conforme', 
    'fecha entrega', 'fecha de entrega', 'fecha_entrega', 'entregado', 
    'fecha de recibo', 'fecha recibo', 'fecha_recibo', 'delivery date', 'delivered_at', 'receipt date'
  ];

  const carrierKeywords = [
    'transportista', 'courier', 'carrier', 'transporte', 'empresa transporte', 
    'proveedor', 'empresa', 'logistic', 'logistica', 'vendor', 'conductor'
  ];

  const clientKeywords = [
    'cliente', 'client', 'destinatario', 'destino', 'receptor', 'nombre cliente', 
    'buyer', 'comprador', 'tienda', 'sucursal'
  ];

  const orderKeywords = [
    'n° de remitos', 'nº de remitos', 'no de remitos', 'n de remitos', 'remitos', 'n° de remito', 'remito', 'pedido', 'order', 'id', 'orden', 'numero', 'numero de pedido', 'nro', 'codigo', 
    'guia', 'guia de remision', 'documento', 'invoice', 'factura'
  ];

  const localidadKeywords = [
    'localidad de destino', 'localidad', 'destino localidad', 'ciudad', 'ciudad de destino', 'destination city', 'provincia', 'departamento', 'comuna'
  ];

  const statusKeywords = [
    'estado de viaje', 'estado_viaje', 'estado de entrega', 'estado_entrega', 'estado de envio', 'estado de los viajes', 'estado del viaje', 'estado', 'status', 'situacion', 'state', 'trip status', 'delivery status'
  ];

  const subclienteKeywords = [
    'subcliente', 'sub-cliente', 'sub cliente', 'sub_cliente', 'sub client', 'subclient',
    'subcuenta', 'sub-cuenta', 'sub cuenta', 'sucursal', 'local', 'punto de venta', 'pdv', 'destinatario final'
  ];

  // Pick first string or empty if not detected
  const emissionDateKey = findMatch(emissionKeywords) || keys.find(k => k.toLowerCase().includes('emisi')) || '';
  const conformeDateKey = findMatch(conformeKeywords) || keys.find(k => k.toLowerCase().includes('confor') || k.toLowerCase().includes('entreg')) || '';
  const carrierKey = findMatch(carrierKeywords) || '';
  const clientKey = findMatch(clientKeywords) || '';
  const orderIdKey = findMatch(orderKeywords) || keys[0] || ''; // Fallback to first column for ID
  const localidadKey = findMatch(localidadKeywords) || '';
  const statusKey = findMatch(statusKeywords) || keys.find(k => k.toLowerCase().includes('est') || k.toLowerCase().includes('stat')) || '';

  // Auto-detect subcliente by keyword or fallback to column D (index 3) if available
  let subclienteKey = findMatch(subclienteKeywords);
  if (!subclienteKey && keys.length >= 4) {
    const colD = keys[3];
    if (colD && colD !== emissionDateKey && colD !== conformeDateKey && colD !== orderIdKey) {
      subclienteKey = colD;
    }
  }

  return {
    emissionDateKey,
    conformeDateKey,
    carrierKey,
    clientKey,
    statusKey,
    orderIdKey,
    localidadKey,
    subclienteKey: subclienteKey || ''
  };
}

/**
 * Calculates differences in business/working days between two date objects (excluding Saturdays and Sundays).
 */
export function calculateDaysBetween(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null;
  
  // Set both dates to midnight local time to calculate purely full days elapsed
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;

  // Handle case where start is after end (return a negative value)
  const isNegative = startDate > endDate;
  const d1 = isNegative ? endDate : startDate;
  const d2 = isNegative ? startDate : endDate;

  let businessDays = 0;
  const curDate = new Date(d1.getTime());

  // Loop day-by-day from d1 to d2 (excluding the start day itself, representing elapsed days/transitions)
  while (curDate < d2) {
    curDate.setDate(curDate.getDate() + 1);
    const dayOfWeek = curDate.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
  }

  return isNegative ? -businessDays : businessDays;
}

/**
 * Processes a raw row array (parsed from excel) into typed DeliveryRecord model.
 */
export function processRawRows(
  rawRows: any[], 
  mapping: ColumnMapping, 
  targetDays: number = 7, 
  localidadSlaOverrides: Record<string, number> = {}
): DeliveryRecord[] {
  return rawRows.map((row, index) => {
    const rawEmission = row[mapping.emissionDateKey];
    const rawConforme = row[mapping.conformeDateKey];
    
    const emissionDate = parseDateValue(rawEmission);
    const conformeDate = parseDateValue(rawConforme);
    const daysElapsed = calculateDaysBetween(emissionDate, conformeDate);
    const localidad = mapping.localidadKey ? String(row[mapping.localidadKey] || 'No Especificada') : 'No Especificada';

    // Get parameterized lead time for this specific locality, fallback to global targetDays
    const currentTargetDays = (localidadSlaOverrides && localidadSlaOverrides[localidad] !== undefined)
      ? localidadSlaOverrides[localidad]
      : targetDays;

    let status: DeliveryRecord['status'] = 'Sin Datos';
    if (emissionDate && conformeDate) {
      if (daysElapsed !== null) {
        status = daysElapsed <= currentTargetDays ? 'A tiempo' : 'Atrasado';
      }
    } else if (emissionDate && !conformeDate) {
      status = 'Pendiente';
    }

    const orderId = String(row[mapping.orderIdKey] || `ROW-${index + 1}`);
    const carrier = mapping.carrierKey ? String(row[mapping.carrierKey] || 'No Especificado') : 'No Especificado';
    const client = mapping.clientKey ? String(row[mapping.clientKey] || 'No Especificado') : 'No Especificado';
    const subcliente = mapping.subclienteKey && row[mapping.subclienteKey] !== undefined && row[mapping.subclienteKey] !== null
      ? String(row[mapping.subclienteKey]).trim()
      : '';

    return {
      id: `rec-${index}`,
      orderId,
      emissionDate,
      conformeDate,
      daysElapsed,
      carrier,
      client,
      subcliente,
      status,
      originalRow: row,
      localidad
    };
  });
}

/**
 * Computes performance metrics / KPIs.
 */
export function computeKPIs(records: DeliveryRecord[], targetDays: number = 7): PerformanceKPIs {
  const totalDeliveries = records.length;
  const completed = records.filter(r => r.daysElapsed !== null);
  const pending = records.filter(r => r.status === 'Pendiente');
  
  const validDays = completed.map(r => r.daysElapsed as number);
  const totalDays = validDays.reduce((sum, val) => sum + val, 0);
  const averageDays = validDays.length > 0 ? Number((totalDays / validDays.length).toFixed(1)) : 0;

  // Use pre-computed status (respects per-locality custom targetDays)
  const onTimeCount = completed.filter(r => r.status === 'A tiempo').length;
  const delayedCount = completed.filter(r => r.status === 'Atrasado').length;

  const totalCompleted = completed.length;
  const onTimeRate = totalCompleted > 0 ? Number(((onTimeCount / totalCompleted) * 100).toFixed(1)) : 0;
  const delayedRate = totalCompleted > 0 ? Number(((delayedCount / totalCompleted) * 100).toFixed(1)) : 0;

  const maxDays = validDays.length > 0 ? Math.max(...validDays) : 0;
  const minDays = validDays.length > 0 ? Math.min(...validDays) : 0;

  return {
    totalDeliveries,
    completedDeliveries: totalCompleted,
    pendingDeliveries: pending.length,
    averageDays,
    onTimeRate,
    delayedRate,
    maxDays,
    minDays,
    onTimeCount,
    delayedCount
  };
}

/**
 * Group metrics by a specific field (e.g. carrier or client)
 */
export function computeGroupedMetrics(records: DeliveryRecord[], field: 'carrier' | 'client', targetDays: number = 7): GroupedMetric[] {
  const groups: Record<string, DeliveryRecord[]> = {};

  records.forEach(r => {
    const key = r[field] || 'No Especificado';
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  return Object.entries(groups).map(([groupValue, groupRecords]) => {
    const completed = groupRecords.filter(r => r.daysElapsed !== null);
    
    const validDays = completed.map(r => r.daysElapsed as number);
    const totalDays = validDays.reduce((sum, val) => sum + val, 0);
    const averageDays = validDays.length > 0 ? Number((totalDays / validDays.length).toFixed(1)) : 0;

    // Use pre-computed status (respects per-locality custom targetDays)
    const onTimeCount = completed.filter(r => r.status === 'A tiempo').length;
    const delayedCount = completed.filter(r => r.status === 'Atrasado').length;

    const totalCompleted = completed.length;
    const onTimeRate = totalCompleted > 0 ? Number(((onTimeCount / totalCompleted) * 100).toFixed(1)) : 0;
    const delayedRate = totalCompleted > 0 ? Number(((delayedCount / totalCompleted) * 100).toFixed(1)) : 0;

    return {
      groupValue,
      total: groupRecords.length,
      completed: totalCompleted,
      averageDays,
      onTimeRate,
      delayedRate,
      onTimeCount,
      delayedCount
    };
  }).sort((a, b) => b.total - a.total); // Sort by total volume
}

/**
 * Daily Delivery trends (by Emission Date)
 */
export function computeDailyTrend(records: DeliveryRecord[]): DailyTrend[] {
  const dailyMap: Record<string, { totalDays: number; count: number; onTimeCount: number; totalCount: number }> = {};

  records.forEach(r => {
    if (!r.emissionDate) return;
    const dateStr = r.emissionDate.toISOString().split('T')[0];
    
    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = { totalDays: 0, count: 0, onTimeCount: 0, totalCount: 0 };
    }

    dailyMap[dateStr].totalCount += 1;
    if (r.daysElapsed !== null) {
      dailyMap[dateStr].totalDays += r.daysElapsed;
      dailyMap[dateStr].count += 1;
      if (r.status === 'A tiempo') {
        dailyMap[dateStr].onTimeCount += 1;
      }
    }
  });

  return Object.entries(dailyMap).map(([dateStr, stats]) => {
    return {
      dateStr,
      averageDays: stats.count > 0 ? Number((stats.totalDays / stats.count).toFixed(1)) : 0,
      totalCount: stats.totalCount,
      onTimeCount: stats.onTimeCount
    };
  }).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
}

/**
 * Distribution of delivery times in ranges
 */
export function computeDeliveryDistribution(records: DeliveryRecord[]): DeliveryDistribution[] {
  const completed = records.filter(r => r.daysElapsed !== null);
  
  let range1 = 0; // 0-2 days
  let range2 = 0; // 3-5 days
  let range3 = 0; // 6-10 days
  let range4 = 0; // 11+ days

  completed.forEach(r => {
    const days = r.daysElapsed as number;
    if (days <= 2) range1++;
    else if (days <= 5) range2++;
    else if (days <= 10) range3++;
    else range4++;
  });

  return [
    { range: '0-2 días (Muy Rápido)', count: range1 },
    { range: '3-5 días (Estándar)', count: range2 },
    { range: '6-10 días (Demorado)', count: range3 },
    { range: '11+ días (Crítico)', count: range4 }
  ];
}

/**
 * Generates highly realistic delivery sample dataset
 */
export function generateSampleData(): Record<string, any>[] {
  const carriers = ['Servientrega', 'DHL Express', 'FedEx', 'Courier Nacional', 'Envío Veloz'];
  const clients = [
    'Supermercados Alfa', 'Tiendas Beta', 'Distribuidora Gamma', 'Almacenes Delta', 
    'Comercial Omega', 'Farmacias Vida', 'Tecno Hogar', 'Librería Central'
  ];
  const subclients = [
    'Sucursal Centro', 'Sucursal Norte', 'Sucursal Sur', 'Local 102', 
    'Plaza Principal', 'Sede Express', 'Bodega Central', 'Punto Retail'
  ];
  const cities = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga', 'Pereira'];
  const shippingTypes = ['Estándar', 'Express', 'Prioritario'];

  const data: Record<string, any>[] = [];
  const today = new Date();

  // Create 45 records across the last 30 days
  for (let i = 0; i < 45; i++) {
    const daysAgo = Math.floor(Math.random() * 25) + 5; // 5 to 30 days ago
    const emissionDate = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    
    // Some are pending (no receipt date)
    const isPending = i % 15 === 0; // 3 pending orders out of 45
    
    let conformeDate: Date | string = '';
    if (!isPending) {
      // Delivery times vary based on shipping types & random fluctuations
      const shippingType = shippingTypes[i % shippingTypes.length];
      let deliveryDuration = Math.floor(Math.random() * 5) + 1; // 1-5 days standard
      if (shippingType === 'Express') {
        deliveryDuration = Math.floor(Math.random() * 2) + 1; // 1-2 days
      } else if (shippingType === 'Prioritario') {
        deliveryDuration = Math.floor(Math.random() * 3) + 1; // 1-3 days
      }
      
      // Random delay additions
      if (Math.random() < 0.20) { // 20% delay probability
        deliveryDuration += Math.floor(Math.random() * 8) + 4; // Add 4-11 extra days
      }

      conformeDate = new Date(emissionDate.getTime() + deliveryDuration * 24 * 60 * 60 * 1000);
    }

    const formatShortDate = (d: Date | string) => {
      if (!d || !(d instanceof Date)) return '';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    data.push({
      'N° de remitos': `REM-2026-${1000 + i}`,
      'Fecha Emisión': formatShortDate(emissionDate),
      'Fecha Conforme': conformeDate ? formatShortDate(conformeDate as Date) : '',
      'Subcliente': subclients[Math.floor(Math.random() * subclients.length)], // Columna D (index 3)
      'Transportista': carriers[Math.floor(Math.random() * carriers.length)],
      'Cliente': clients[Math.floor(Math.random() * clients.length)],
      'Localidad de destino': cities[Math.floor(Math.random() * cities.length)],
      'Tipo de Envío': shippingTypes[i % shippingTypes.length],
      'Peso (kg)': Number((Math.random() * 18 + 0.5).toFixed(1)),
      'Valor Declarado ($)': Math.floor(Math.random() * 450) + 50
    });
  }

  return data;
}

/**
 * Downloads a simple Excel file template of sample data
 */
export function downloadExcelTemplate() {
  const samples = generateSampleData();
  const worksheet = XLSX.utils.json_to_sheet(samples);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tiempos de Entrega');
  
  // Create binary string and trigger download
  XLSX.writeFile(workbook, 'Plantilla_Tiempos_Entrega.xlsx');
}

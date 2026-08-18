/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ColumnMapping {
  emissionDateKey: string;
  conformeDateKey: string;
  carrierKey: string;
  clientKey: string;
  statusKey: string;
  orderIdKey: string;
  localidadKey?: string;
  subclienteKey?: string;
}

export interface DeliveryRecord {
  id: string; // Unique row identifier
  orderId: string; // E.g., Order number, Invoice ID, Guía
  emissionDate: Date | null;
  conformeDate: Date | null;
  daysElapsed: number | null; // Days from emission to conforme
  carrier: string; // Transportista / Courier
  client: string; // Cliente / Destinatario
  subcliente?: string; // Subcliente / Destinatario final (Columna D)
  status: 'A tiempo' | 'Atrasado' | 'Pendiente' | 'Sin Datos';
  originalRow: Record<string, any>; // Keep all original excel columns
  localidad?: string; // Localidad de destino
}

export interface PerformanceKPIs {
  totalDeliveries: number;
  completedDeliveries: number;
  pendingDeliveries: number;
  averageDays: number;
  onTimeRate: number; // percentage of completed deliveries with days <= target
  delayedRate: number; // percentage of completed deliveries with days > target
  maxDays: number;
  minDays: number;
  onTimeCount: number;
  delayedCount: number;
}

export interface GroupedMetric {
  groupValue: string; // e.g. Carrier Name, Client Name
  total: number;
  completed: number;
  averageDays: number;
  onTimeRate: number;
  delayedRate: number;
  onTimeCount: number;
  delayedCount: number;
}

export interface DailyTrend {
  dateStr: string; // Formatted YYYY-MM-DD
  averageDays: number;
  totalCount: number;
  onTimeCount: number;
}

export interface DeliveryDistribution {
  range: string; // e.g., "0-2 días", "3-5 días", "6-10 días", "11+ días"
  count: number;
}

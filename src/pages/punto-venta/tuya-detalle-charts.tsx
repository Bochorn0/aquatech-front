import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import { useState } from 'react';

import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import {
  Box,
  Card,
  Grid,
  Button,
  Select,
  Divider,
  MenuItem,
  Typography,
  InputLabel,
  FormControl,
  CircularProgress,
} from '@mui/material';

import { fNumber } from 'src/utils/format-number';
import { safeDisplayText } from 'src/utils/safe-display-text';

import { CONFIG } from 'src/config-global';

import { Chart, useChart } from 'src/components/chart';

export type TuyaHistoricoRange = '24h' | '3d' | '7d' | '30d' | 'custom';

export type HistoricoCustomWindow = {
  start: Dayjs | null;
  end: Dayjs | null;
};

/** Query string for GET historico (`range` or `historicoRange`). */
export function buildTuyaHistoricoQueryParams(
  range: TuyaHistoricoRange,
  custom?: HistoricoCustomWindow,
  opts?: { rangeKey?: 'range' | 'historicoRange' }
): string {
  const params = new URLSearchParams();
  params.set(opts?.rangeKey ?? 'range', range);
  if (range === 'custom' && custom?.start?.isValid() && custom?.end?.isValid()) {
    params.set('startDate', custom.start.startOf('day').toISOString());
    params.set('endDate', custom.end.endOf('day').toISOString());
  }
  return params.toString();
}

export function isHistoricoCustomReady(
  range: TuyaHistoricoRange,
  custom?: HistoricoCustomWindow
): boolean {
  if (range !== 'custom') return true;
  return !!(
    custom?.start?.isValid() &&
    custom?.end?.isValid() &&
    !custom.end.isBefore(custom.start, 'day')
  );
}

export const TUYA_RANGE_LABELS: Record<TuyaHistoricoRange, string> = {
  '24h': 'últimas 24 horas',
  '3d': 'últimos 3 días',
  '7d': 'última semana',
  '30d': 'último mes',
  custom: 'período personalizado',
};

export function formatTuyaRangeLabel(
  range: TuyaHistoricoRange,
  custom?: HistoricoCustomWindow
): string {
  if (range === 'custom' && custom?.start?.isValid() && custom?.end?.isValid()) {
    return `${custom.start.format('DD/MM/YYYY')} – ${custom.end.format('DD/MM/YYYY')}`;
  }
  return TUYA_RANGE_LABELS[range] ?? range;
}

export type ChartSeriesBlock = {
  /** Short labels for the chart axis */
  categories: string[];
  /** Full hour stamps for CSV (e.g. YYYY-MM-DD HH:00) */
  hours: string[];
  series: { name: string; data: (number | null)[] }[];
};

export type OsmosisChartBundle = {
  productId: string;
  productName: string;
  volumen: ChartSeriesBlock;
  flujo: ChartSeriesBlock;
  tds: ChartSeriesBlock;
  custom?: ChartSeriesBlock | null;
  customLabels?: { campo_personalizado_1: string; campo_personalizado_2: string };
  summary: {
    avgFlujoProd: number | null;
    avgFlujoRech: number | null;
    avgTds: number | null;
    lastProdVol: number | null;
    lastRejVol: number | null;
    deltaProdVol: number | null;
    deltaRejVol: number | null;
    lastCustom1: number | null;
    lastCustom2: number | null;
    avgCustom1: number | null;
    avgCustom2: number | null;
    hoursWithData: number;
  };
  /** Raw hours_with_data from API (may lack *_agrupado when fast-aggregated). */
  rawHours?: HistoricoHourRow[];
};

type HistoricoHourRow = {
  hora?: string;
  total_logs?: number;
  estadisticas?: Record<string, number | null | undefined>;
  tds_agrupado?: { tds?: number; hora?: string; timestamp?: string }[];
  flujo_produccion_agrupado?: { flujo_produccion?: number; hora?: string; timestamp?: string }[];
  flujo_rechazo_agrupado?: { flujo_rechazo?: number; hora?: string; timestamp?: string }[];
  production_volume_agrupado?: { production_volume?: number; hora?: string; timestamp?: string }[];
  rejected_volume_agrupado?: { rejected_volume?: number; hora?: string; timestamp?: string }[];
};

function formatHourLabel(hora: string, range: TuyaHistoricoRange): string {
  if (!hora) return '';
  const trimmed = hora.trim();
  if (range === '24h' && trimmed.includes(' ')) {
    return trimmed.split(' ')[1]?.slice(0, 5) || trimmed;
  }
  if (trimmed.includes(' ')) {
    const [datePart, timePart] = trimmed.split(' ');
    return `${datePart.slice(5)} ${(timePart || '').slice(0, 5)}`;
  }
  return trimmed.length > 5 ? trimmed.slice(0, 5) : trimmed;
}

function avgOf(values: number[]): number | null {
  const nums = values.filter((v) => Number.isFinite(v) && v > 0);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Median of positive finite samples — better for stable TDS than mean. */
function medianOf(values: number[]): number | null {
  const nums = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 1 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

/** Cumulative meter reading: reject NaN/Inf/absurd spikes from bad aggregation. */
function isSaneMeterLiters(n: number): boolean {
  return Number.isFinite(n) && n > 0 && n < 1e8;
}

function lastSaneMeter(values: (number | null | undefined)[]): number | null {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    const v = values[i];
    if (v != null && isSaneMeterLiters(v)) return v;
  }
  return null;
}

/** Last finite value for custom fields (0 / negatives allowed). */
function lastFiniteValue(values: (number | null | undefined)[]): number | null {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    const v = values[i];
    if (v != null && Number.isFinite(v)) return v;
  }
  return null;
}

function avgFiniteInclZero(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Period production from cumulative meter series.
 * Sums positive hour-to-hour increases so device resets don't invert Δ.
 */
function periodDeltaFromCumulative(values: (number | null | undefined)[]): number | null {
  let delta = 0;
  let sawPair = false;
  for (let i = 1; i < values.length; i += 1) {
    const prev = values[i - 1];
    const curr = values[i];
    if (prev != null && curr != null && isSaneMeterLiters(prev) && isSaneMeterLiters(curr)) {
      sawPair = true;
      if (curr >= prev) delta += curr - prev;
    }
  }
  if (!sawPair) return null;
  return delta > 0 ? delta : 0;
}

function toChartNumber(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Custom-field chart points: missing / invalid → null (gap), not 0.
 * Also drops ±meter-total garbage so adaptive Y isn't forced by spikes.
 */
function toCustomChartValue(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  if (Math.abs(n) > 20000) return null;
  return n;
}

/** Cumulative meters: missing/0 → null so ApexCharts gaps instead of false cliffs to 0. */
function toMeterChartValue(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Collect finite chart samples in order (skips null / undefined holes). */
function finiteSeriesValues(data: (number | null | undefined)[] | undefined): number[] {
  if (!Array.isArray(data) || data.length === 0) return [];
  return data.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
}

/**
 * First N step sizes between successive non-null points (null hours are skipped).
 * Outliers reset the chain so a ±62k spike doesn't invent a fake increment.
 */
function earlyAdjacentIncrements(
  data: (number | null | undefined)[] | undefined,
  maxIncrements = 3,
  outlierCap = 20000
): number[] {
  if (!Array.isArray(data) || data.length < 2) return [];
  const incs: number[] = [];
  let prev: number | null = null;
  for (let i = 0; i < data.length && incs.length < maxIncrements; i += 1) {
    const v = data[i];
    const isUsable = typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= outlierCap;
    if (!isUsable) {
      if (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) > outlierCap) {
        prev = null;
      }
    } else {
      if (prev != null) {
        incs.push(Math.abs(v - prev));
      }
      prev = v;
    }
  }
  return incs;
}

/** Y bounds around series so small day deltas (~hundreds of L on a ~60k meter) are visible. */
function fitYAxisBounds(
  series: { name: string; data: (number | null)[] }[],
  preferNameIncludes?: string
): { min?: number; max?: number } {
  const list = Array.isArray(series) ? series : [];
  const preferred =
    preferNameIncludes != null
      ? list.filter((s) => s?.name?.toLowerCase?.().includes(preferNameIncludes.toLowerCase()))
      : list;
  const use =
    preferred.length > 0 && preferred.some((s) => finiteSeriesValues(s?.data).length > 0)
      ? preferred
      : list;
  const vals = use.flatMap((s) => finiteSeriesValues(s?.data));
  if (vals.length === 0) return {};
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return {};
  const span = max - min;
  const pad = Math.max(span * 0.2, Math.abs(max) * 0.002, 5);
  return {
    min: Math.max(0, min - pad),
    max: max + pad,
  };
}

const ADAPTIVE_Y_DEFAULT_MAX = 10000;

/** Nice step size from observed magnitude (tens / hundreds / thousands…). */
function pickYStep(magnitude: number): number {
  const m = Math.abs(magnitude) || 1;
  if (m <= 50) return 5;
  if (m <= 100) return 10;
  if (m <= 500) return 50;
  if (m <= 2000) return 100;
  if (m <= 10000) return 500;
  if (m <= 50000) return 2000;
  return 5000;
}

function niceCeil(n: number, step: number): number {
  if (!Number.isFinite(n) || step <= 0) return Number.isFinite(n) ? n : ADAPTIVE_Y_DEFAULT_MAX;
  return Math.ceil(n / step) * step;
}

function medianOfNumbers(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Per-product Y scale: default 0-10000, then tighten/expand from the first 2-3
 * available adjacent steps. Sparse / missing hours fall back to the default scale.
 */
function adaptiveYAxisBounds(
  series: { name: string; data: (number | null)[] }[] | null | undefined
): { min: number; max: number; tickAmount: number } {
  const defaultMax = ADAPTIVE_Y_DEFAULT_MAX;
  const outlierCap = defaultMax * 2;
  const fallback = { min: 0, max: defaultMax, tickAmount: 5 };

  const list = Array.isArray(series) ? series.filter(Boolean) : [];
  if (list.length === 0) return fallback;

  const primaryData = list[0]?.data;
  const cleanPrimary = finiteSeriesValues(primaryData).filter((v) => Math.abs(v) <= outlierCap);
  const cleanOthers = list
    .slice(1)
    .flatMap((s) => finiteSeriesValues(s?.data))
    .filter((v) => Math.abs(v) <= outlierCap);
  const cleanAll = [...cleanPrimary, ...cleanOthers];

  // No usable points → keep standard scale
  if (cleanAll.length === 0) return fallback;

  const earlyIncs = earlyAdjacentIncrements(primaryData, 3, outlierCap).filter(
    (d) => Number.isFinite(d) && d <= defaultMax
  );
  const typicalInc = earlyIncs.length > 0 ? medianOfNumbers(earlyIncs) : 0;

  const dataMin = Math.min(...cleanAll);
  const dataMax = Math.max(...cleanAll);
  if (!Number.isFinite(dataMin) || !Number.isFinite(dataMax)) return fallback;

  // Single point or no early steps: still scale from magnitude, else stay near default
  const earlyPeak =
    cleanPrimary.length > 0
      ? Math.max(...cleanPrimary.slice(0, Math.min(3, cleanPrimary.length)).map((v) => Math.abs(v)))
      : Math.max(Math.abs(dataMin), Math.abs(dataMax));

  const suggested = Math.max(
    Math.abs(dataMax),
    Math.abs(dataMin),
    earlyPeak,
    typicalInc > 0 ? typicalInc * 8 : 0,
    1
  );

  let targetMax = defaultMax;
  let targetMin = 0;

  if (suggested <= 80) {
    targetMax = niceCeil(Math.max(suggested * 1.4, typicalInc * 6 || 0, 20), pickYStep(suggested));
  } else if (suggested <= 800) {
    targetMax = niceCeil(Math.max(suggested * 1.3, 100), 100);
  } else if (suggested <= defaultMax) {
    targetMax =
      suggested <= defaultMax * 0.75
        ? niceCeil(Math.max(suggested * 1.2, typicalInc * 10 || suggested), 100)
        : defaultMax;
  } else {
    targetMax = niceCeil(suggested * 1.15, pickYStep(suggested));
  }

  if (dataMax > targetMax) {
    targetMax = niceCeil(dataMax * 1.1, pickYStep(dataMax));
  }
  if (dataMin < 0) {
    targetMin = -niceCeil(Math.abs(dataMin) * 1.15, pickYStep(Math.abs(dataMin)));
  }

  if (!Number.isFinite(targetMin) || !Number.isFinite(targetMax) || targetMax <= targetMin) {
    return fallback;
  }

  const span = Math.max(targetMax - targetMin, 1);
  const step = pickYStep(span);
  const tickAmount = Math.max(4, Math.min(10, Math.round(span / step) || 5));

  return { min: targetMin, max: targetMax, tickAmount };
}

/** Build osmosis chart bundles from product_logs historico (hours_with_data). */
export function prepareOsmosisHistoricoCharts(
  osmosisProducts: any[],
  range: TuyaHistoricoRange
): OsmosisChartBundle[] {
  return osmosisProducts
    .map((product) => {
      const hours = product?.historico?.hours_with_data || [];
      if (!Array.isArray(hours) || hours.length === 0) return null;

      const hourLabels = hours.map((h: any) => String(h.hora || ''));
      const categories = hourLabels.map((hora) => formatHourLabel(hora, range));
      // Flows & TDS: averages per hour (instantaneous / stable)
      const flujoProd = hours.map((h: any) => toChartNumber(h.estadisticas?.flujo_produccion_promedio));
      const flujoRech = hours.map((h: any) => toChartNumber(h.estadisticas?.flujo_rechazo_promedio));
      const tdsVals = hours.map((h: any) => toChartNumber(h.estadisticas?.tds_promedio));
      // Volumes: cumulative meters (end of hour) — never treat as flux
      const prodVol = hours.map((h: any) => toMeterChartValue(h.estadisticas?.production_volume_total));
      const rejVol = hours.map((h: any) => toMeterChartValue(h.estadisticas?.rejected_volume_total));
      const totalLogs = hours.map((h: any) => toChartNumber(h.total_logs));

      const customLabels = {
        campo_personalizado_1:
          product?.historico?.product?.custom_field_labels?.campo_personalizado_1 ||
          product?.tuya_logs_routine_config?.custom_rules?.find((r: any) => r.db_column === 'campo_personalizado_1')?.name ||
          'Campo personalizado 1',
        campo_personalizado_2:
          product?.historico?.product?.custom_field_labels?.campo_personalizado_2 ||
          product?.tuya_logs_routine_config?.custom_rules?.find((r: any) => r.db_column === 'campo_personalizado_2')?.name ||
          'Campo personalizado 2',
      };

      const custom1 = hours.map((h: any) =>
        toCustomChartValue(
          h.estadisticas?.campo_personalizado_1_ultimo ?? h.estadisticas?.campo_personalizado_1_promedio
        )
      );
      const custom2 = hours.map((h: any) =>
        toCustomChartValue(
          h.estadisticas?.campo_personalizado_2_ultimo ?? h.estadisticas?.campo_personalizado_2_promedio
        )
      );
      const hasCustom =
        custom1.some((v) => v != null && v !== 0) ||
        custom2.some((v) => v != null && v !== 0) ||
        Boolean(product?.historico?.product?.has_custom_fields) ||
        Boolean(product?.tuya_logs_routine_config?.custom_rules?.length);

      return {
        productId: String(product._id ?? product.id),
        productName: safeDisplayText(product.name, 'Osmosis'),
        volumen: {
          categories,
          hours: hourLabels,
          series: [
            { name: 'Vol. Producción (L)', data: prodVol },
            { name: 'Vol. Rechazo (L)', data: rejVol },
            { name: 'Muestras en hora', data: totalLogs },
          ],
        },
        flujo: {
          categories,
          hours: hourLabels,
          series: [
            { name: 'Flujo Producción (L/min)', data: flujoProd },
            { name: 'Flujo Rechazo (L/min)', data: flujoRech },
            { name: 'Muestras en hora', data: totalLogs },
          ],
        },
        tds: {
          categories,
          hours: hourLabels,
          series: [
            { name: 'TDS (ppm)', data: tdsVals },
            { name: 'Muestras en hora', data: totalLogs },
          ],
        },
        custom: hasCustom
          ? {
              categories,
              hours: hourLabels,
              series: [
                { name: customLabels.campo_personalizado_1, data: custom1 },
                { name: customLabels.campo_personalizado_2, data: custom2 },
              ],
            }
          : null,
        customLabels,
        summary: {
          avgFlujoProd: medianOf(flujoProd) ?? avgOf(flujoProd),
          avgFlujoRech: medianOf(flujoRech) ?? avgOf(flujoRech),
          avgTds: medianOf(tdsVals) ?? avgOf(tdsVals),
          lastProdVol: lastSaneMeter(prodVol),
          lastRejVol: lastSaneMeter(rejVol),
          deltaProdVol: periodDeltaFromCumulative(prodVol),
          deltaRejVol: periodDeltaFromCumulative(rejVol),
          lastCustom1: lastFiniteValue(custom1),
          lastCustom2: lastFiniteValue(custom2),
          avgCustom1: avgFiniteInclZero(custom1),
          avgCustom2: avgFiniteInclZero(custom2),
          hoursWithData: hours.length,
        },
        rawHours: hours as HistoricoHourRow[],
      };
    })
    .filter(Boolean) as OsmosisChartBundle[];
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsvFile(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const csv = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function hourHasDetailSamples(hours: HistoricoHourRow[]): boolean {
  return hours.some(
    (h) =>
      (h.tds_agrupado?.length ?? 0) > 0 ||
      (h.flujo_produccion_agrupado?.length ?? 0) > 0 ||
      (h.flujo_rechazo_agrupado?.length ?? 0) > 0 ||
      (h.production_volume_agrupado?.length ?? 0) > 0 ||
      (h.rejected_volume_agrupado?.length ?? 0) > 0
  );
}

/** Flatten per-sample rows from hours_with_data (all measurements in the period). */
function buildDetailMeasurementRows(hours: HistoricoHourRow[]) {
  type Row = {
    timestamp: string;
    hora_bloque: string;
    hora_medicion: string;
    tds_ppm: string | number;
    flujo_prod_l_min: string | number;
    flujo_rech_l_min: string | number;
    vol_prod_l: string | number;
    vol_rech_l: string | number;
  };
  const byKey = new Map<string, Row>();

  const ensure = (ts: string, horaBloque: string, horaMedicion: string): Row => {
    const key = ts || `${horaBloque}_${horaMedicion}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        timestamp: ts,
        hora_bloque: horaBloque,
        hora_medicion: horaMedicion,
        tds_ppm: '',
        flujo_prod_l_min: '',
        flujo_rech_l_min: '',
        vol_prod_l: '',
        vol_rech_l: '',
      });
    }
    const row = byKey.get(key)!;
    if (!row.timestamp && ts) row.timestamp = ts;
    if (!row.hora_medicion && horaMedicion) row.hora_medicion = horaMedicion;
    return row;
  };

  hours.forEach((h) => {
    const bloque = String(h.hora ?? '');
    (h.tds_agrupado || []).forEach((t) => {
      const row = ensure(String(t.timestamp ?? ''), bloque, String(t.hora ?? ''));
      row.tds_ppm = t.tds ?? '';
    });
    (h.flujo_produccion_agrupado || []).forEach((f) => {
      const row = ensure(String(f.timestamp ?? ''), bloque, String(f.hora ?? ''));
      row.flujo_prod_l_min = f.flujo_produccion ?? '';
    });
    (h.flujo_rechazo_agrupado || []).forEach((f) => {
      const row = ensure(String(f.timestamp ?? ''), bloque, String(f.hora ?? ''));
      row.flujo_rech_l_min = f.flujo_rechazo ?? '';
    });
    (h.production_volume_agrupado || []).forEach((v) => {
      const row = ensure(String(v.timestamp ?? ''), bloque, String(v.hora ?? ''));
      row.vol_prod_l = v.production_volume ?? '';
    });
    (h.rejected_volume_agrupado || []).forEach((v) => {
      const row = ensure(String(v.timestamp ?? ''), bloque, String(v.hora ?? ''));
      row.vol_rech_l = v.rejected_volume ?? '';
    });
  });

  return Array.from(byKey.values()).sort((a, b) =>
    String(a.timestamp || a.hora_bloque).localeCompare(String(b.timestamp || b.hora_bloque))
  );
}

function buildHourlySummaryRows(hours: HistoricoHourRow[]) {
  return hours.map((h) => [
    h.hora ?? '',
    h.total_logs ?? '',
    h.estadisticas?.tds_promedio ?? '',
    h.estadisticas?.flujo_produccion_promedio ?? '',
    h.estadisticas?.flujo_rechazo_promedio ?? '',
    h.estadisticas?.production_volume_total ?? '',
    h.estadisticas?.rejected_volume_total ?? '',
  ]);
}

export function downloadHistoricoDetailCsv(
  productName: string,
  range: TuyaHistoricoRange,
  hours: HistoricoHourRow[]
) {
  const safeProduct = (productName || 'producto').replace(/[^\w-]+/g, '_').slice(0, 40);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const measurementRows = buildDetailMeasurementRows(hours);

  if (measurementRows.length > 0) {
    downloadCsvFile(
      `${safeProduct}_historico_detalle_${range}_${dateStamp}.csv`,
      [
        'timestamp',
        'hora_bloque',
        'hora_medicion',
        'tds_ppm',
        'flujo_prod_l_min',
        'flujo_rech_l_min',
        'vol_prod_l',
        'vol_rech_l',
      ],
      measurementRows.map((r) => [
        r.timestamp,
        r.hora_bloque,
        r.hora_medicion,
        r.tds_ppm,
        r.flujo_prod_l_min,
        r.flujo_rech_l_min,
        r.vol_prod_l,
        r.vol_rech_l,
      ])
    );
    return;
  }

  downloadCsvFile(
    `${safeProduct}_historico_resumen_hora_${range}_${dateStamp}.csv`,
    [
      'hora_bloque',
      'muestras_en_hora',
      'tds_promedio_ppm',
      'flujo_prod_prom_l_min',
      'flujo_rech_prom_l_min',
      'vol_prod_fin_hora_l',
      'vol_rech_fin_hora_l',
    ],
    buildHourlySummaryRows(hours)
  );
}

async function fetchHistoricoDetailHours(
  puntoId: string,
  productId: string,
  range: TuyaHistoricoRange,
  custom?: HistoricoCustomWindow
): Promise<HistoricoHourRow[]> {
  const qs = buildTuyaHistoricoQueryParams(range, custom);
  const url = `${CONFIG.API_BASE_URL_V2}/puntoVentas/${puntoId}/historico?productId=${encodeURIComponent(productId)}&${qs}&detail=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json?.data?.historico?.hours_with_data ?? [];
}

function HistoricoDetailCsvButton({
  bundle,
  puntoId,
  historicoRange,
  historicoCustom,
}: {
  bundle: OsmosisChartBundle;
  puntoId: string;
  historicoRange: TuyaHistoricoRange;
  historicoCustom?: HistoricoCustomWindow;
}) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      let hours = bundle.rawHours ?? [];
      if (!hourHasDetailSamples(hours)) {
        hours = await fetchHistoricoDetailHours(
          puntoId,
          bundle.productId,
          historicoRange,
          historicoCustom
        );
      }
      if (!hours.length) {
        alert('No hay registros para exportar en este período.');
        return;
      }
      downloadHistoricoDetailCsv(bundle.productName, historicoRange, hours);
    } catch (e) {
      console.error('CSV detalle historico:', e);
      alert('No se pudo exportar el CSV detalle. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="small" variant="outlined" onClick={handleExport} disabled={loading} sx={{ mb: 1 }}>
      {loading ? <CircularProgress size={18} /> : 'Exportar CSV detalle'}
    </Button>
  );
}

/** Series drawn on the chart (exclude helper CSV-only columns). */
function chartDisplaySeries(series: { name: string; data: (number | null)[] }[]) {
  return (series || []).filter((s) => s.name !== 'Muestras en hora');
}

function TuyaLineChart({
  title,
  subheader,
  chart,
  yTitle,
  yMin,
  yMax,
  fitYToData,
  fitPreferSeries,
  adaptiveY,
  colors,
}: {
  title: string;
  subheader?: string;
  chart: ChartSeriesBlock;
  yTitle: string;
  yMin?: number;
  yMax?: number;
  /** Zoom Y around data so small deltas on large cumulative meters are visible */
  fitYToData?: boolean;
  /** When fitting Y, prefer this series name substring (e.g. "Producción") */
  fitPreferSeries?: string;
  /**
   * Per-product scale: default 0-10000, adjust from first 2-3 increments
   * (small units vs high-throughput osmosis).
   */
  adaptiveY?: boolean;
  colors?: string[];
}) {
  const theme = useTheme();
  const displaySeries = chartDisplaySeries(chart?.series || []);
  const hasData =
    (chart?.categories?.length ?? 0) > 0 &&
    displaySeries.some((s) => finiteSeriesValues(s?.data).length > 0);
  const fitted = fitYToData ? fitYAxisBounds(displaySeries, fitPreferSeries) : {};
  const adapted = adaptiveY ? adaptiveYAxisBounds(displaySeries) : null;
  // Always define Y when adaptive; otherwise leave Apex auto if no fit/bounds.
  const axisMin = yMin ?? adapted?.min ?? fitted.min ?? (adaptiveY ? 0 : undefined);
  const axisMax =
    yMax ?? adapted?.max ?? fitted.max ?? (adaptiveY ? ADAPTIVE_Y_DEFAULT_MAX : undefined);
  const tickAmount = adapted?.tickAmount ?? (adaptiveY ? 5 : undefined);
  const forceNiceScale = adaptiveY ? true : !fitYToData;

  const chartOptions = useChart({
    chart: { type: 'line', toolbar: { show: false }, zoom: { enabled: false } },
    colors: colors || [theme.palette.primary.main, theme.palette.warning.main],
    stroke: { width: 2, curve: 'smooth' },
    markers: { size: 3, strokeWidth: 2 },
    xaxis: {
      categories: chart?.categories || [],
      labels: { rotate: -45, style: { fontSize: '10px' } },
    },
    yaxis: {
      title: { text: yTitle },
      min: axisMin,
      max: axisMax,
      ...(tickAmount != null ? { tickAmount } : {}),
      forceNiceScale,
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (value: number) => (value == null ? '—' : fNumber(value)) },
    },
    legend: { position: 'top', horizontalAlign: 'right' },
    grid: { strokeDashArray: 3 },
  });

  if (!hasData) {
    return (
      <Card variant="outlined" sx={{ mb: 2, p: 2, height: '100%' }}>
        <CardHeader title={title} subheader={subheader || 'Sin datos históricos en el período'} />
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ mb: 2, p: 2, height: '100%' }}>
      <CardHeader title={title} subheader={subheader} />
      <Chart type="line" series={displaySeries} options={chartOptions} height={280} />
    </Card>
  );
}

function SummaryKpi({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <Box sx={{ p: 1.5, bgcolor: 'background.neutral', borderRadius: 1, textAlign: 'center' }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="subtitle1" fontWeight="bold">
        {value != null ? fNumber(value) : '—'}
        {value != null && (
          <Typography component="span" variant="caption" sx={{ ml: 0.5 }}>
            {unit}
          </Typography>
        )}
      </Typography>
    </Box>
  );
}

export function TuyaOsmosisHistoricoSection({
  charts,
  rangeLabel,
  puntoId,
  historicoRange,
  historicoCustom,
}: {
  charts: OsmosisChartBundle[];
  rangeLabel: string;
  puntoId: string;
  historicoRange: TuyaHistoricoRange;
  historicoCustom?: HistoricoCustomWindow;
}) {
  if (!charts.length) {
    return (
      <Card variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Histórico de Producción / Rechazo
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No hay datos históricos de osmosis en {rangeLabel}. Los reportes exportados pueden tener más datos acumulados.
        </Typography>
      </Card>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Histórico de Producción / Rechazo
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Volúmenes = lectura acumulada del medidor · Flujos/TDS = mediana del período — {rangeLabel}
      </Typography>
      {charts.map((bundle) => (
        <Box key={bundle.productId} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
            <Typography variant="subtitle1" fontWeight="medium">
              {safeDisplayText(bundle.productName, 'Osmosis')}
            </Typography>
            <HistoricoDetailCsvButton
              bundle={bundle}
              puntoId={puntoId}
              historicoRange={historicoRange}
              historicoCustom={historicoCustom}
            />
          </Box>
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={4}>
              <SummaryKpi label="Vol. prod. (fin período)" value={bundle.summary.lastProdVol} unit="L" />
            </Grid>
            <Grid item xs={6} sm={4}>
              <SummaryKpi label="Vol. rech. (fin período)" value={bundle.summary.lastRejVol} unit="L" />
            </Grid>
            <Grid item xs={6} sm={4}>
              <SummaryKpi label="Δ Prod. período" value={bundle.summary.deltaProdVol} unit="L" />
            </Grid>
            <Grid item xs={6} sm={4}>
              <SummaryKpi label="Δ Rech. período" value={bundle.summary.deltaRejVol} unit="L" />
            </Grid>
            <Grid item xs={6} sm={4}>
              <SummaryKpi label="Flujo prod. (mediana)" value={bundle.summary.avgFlujoProd} unit="L/min" />
            </Grid>
            <Grid item xs={6} sm={4}>
              <SummaryKpi label="Flujo rech. (mediana)" value={bundle.summary.avgFlujoRech} unit="L/min" />
            </Grid>
            <Grid item xs={6} sm={4}>
              <SummaryKpi label="TDS (mediana)" value={bundle.summary.avgTds} unit="ppm" />
            </Grid>
            {bundle.custom && (
              <>
                <Grid item xs={6} sm={4}>
                  <SummaryKpi
                    label={`${bundle.customLabels?.campo_personalizado_1 || 'Campo 1'} (últ.)`}
                    value={bundle.summary.lastCustom1}
                    unit=""
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <SummaryKpi
                    label={`${bundle.customLabels?.campo_personalizado_2 || 'Campo 2'} (últ.)`}
                    value={bundle.summary.lastCustom2}
                    unit=""
                  />
                </Grid>
              </>
            )}
          </Grid>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={12} md={6}>
              <TuyaLineChart
                title="Volúmenes acumulados por hora"
                subheader="Lectura del medidor (fin de cada hora) — eje zoom al rango real"
                chart={bundle.volumen}
                yTitle="L"
                fitYToData
                fitPreferSeries="Producción"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TuyaLineChart
                title="Flujos por hora"
                subheader="flowrate_speed_1 / flowrate_speed_2 (L/min)"
                chart={bundle.flujo}
                yTitle="L/min"
                yMin={0}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TuyaLineChart
                title="TDS por hora"
                chart={bundle.tds}
                yTitle="ppm"
                yMin={0}
                colors={['#2e7d32']}
              />
            </Grid>
            {bundle.custom && (
              <Grid item xs={12} md={6}>
                <TuyaLineChart
                  title="Campos personalizados por hora"
                  subheader="Eje Y adaptativo (base 0-10000; se ajusta con los primeros incrementos del producto)"
                  chart={bundle.custom}
                  yTitle=""
                  adaptiveY
                  colors={['#1565c0', '#ef6c00']}
                />
              </Grid>
            )}
          </Grid>
          <Divider sx={{ mt: 1 }} />
        </Box>
      ))}
    </Box>
  );
}

export function TuyaHistoricoPeriodSelector({
  value,
  onChange,
  customWindow,
  onCustomWindowChange,
}: {
  value: TuyaHistoricoRange;
  onChange: (range: TuyaHistoricoRange) => void;
  customWindow?: HistoricoCustomWindow;
  onCustomWindowChange?: (window: HistoricoCustomWindow) => void;
}) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start', mb: 2 }}>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="tuya-historico-range-label" shrink>
          Período histórico
        </InputLabel>
        <Select
          labelId="tuya-historico-range-label"
          value={value}
          label="Período histórico"
          onChange={(e) => onChange(e.target.value as TuyaHistoricoRange)}
        >
          <MenuItem value="24h">Últimas 24 horas</MenuItem>
          <MenuItem value="3d">Últimos 3 días</MenuItem>
          <MenuItem value="7d">Última semana</MenuItem>
          <MenuItem value="30d">Último mes</MenuItem>
          <MenuItem value="custom">Personalizado</MenuItem>
        </Select>
      </FormControl>
      {value === 'custom' && onCustomWindowChange && (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Desde"
            value={customWindow?.start ?? null}
            onChange={(v) =>
              onCustomWindowChange({ start: v, end: customWindow?.end ?? null })
            }
            maxDate={customWindow?.end ?? dayjs()}
            slotProps={{ textField: { size: 'small', sx: { minWidth: 160 } } }}
          />
          <DatePicker
            label="Hasta"
            value={customWindow?.end ?? null}
            onChange={(v) =>
              onCustomWindowChange({ start: customWindow?.start ?? null, end: v })
            }
            minDate={customWindow?.start ?? undefined}
            maxDate={dayjs()}
            slotProps={{ textField: { size: 'small', sx: { minWidth: 160 } } }}
          />
        </LocalizationProvider>
      )}
    </Box>
  );
}

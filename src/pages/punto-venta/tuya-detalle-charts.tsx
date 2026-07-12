import { useState } from 'react';

import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
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

export type TuyaHistoricoRange = '24h' | '7d' | '30d';

export type ChartSeriesBlock = {
  /** Short labels for the chart axis */
  categories: string[];
  /** Full hour stamps for CSV (e.g. YYYY-MM-DD HH:00) */
  hours: string[];
  series: { name: string; data: number[] }[];
};

export type OsmosisChartBundle = {
  productId: string;
  productName: string;
  volumen: ChartSeriesBlock;
  flujo: ChartSeriesBlock;
  tds: ChartSeriesBlock;
  summary: {
    avgFlujoProd: number | null;
    avgFlujoRech: number | null;
    avgTds: number | null;
    lastProdVol: number | null;
    lastRejVol: number | null;
    deltaProdVol: number | null;
    deltaRejVol: number | null;
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

function lastSaneMeter(values: number[]): number | null {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (isSaneMeterLiters(values[i])) return values[i];
  }
  return null;
}

/**
 * Period production from cumulative meter series.
 * Sums positive hour-to-hour increases so device resets don't invert Δ.
 */
function periodDeltaFromCumulative(values: number[]): number | null {
  let delta = 0;
  let sawPair = false;
  for (let i = 1; i < values.length; i += 1) {
    const prev = values[i - 1];
    const curr = values[i];
    if (isSaneMeterLiters(prev) && isSaneMeterLiters(curr)) {
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
      const prodVol = hours.map((h: any) => toChartNumber(h.estadisticas?.production_volume_total));
      const rejVol = hours.map((h: any) => toChartNumber(h.estadisticas?.rejected_volume_total));
      const totalLogs = hours.map((h: any) => toChartNumber(h.total_logs));

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
        summary: {
          avgFlujoProd: medianOf(flujoProd) ?? avgOf(flujoProd),
          avgFlujoRech: medianOf(flujoRech) ?? avgOf(flujoRech),
          avgTds: medianOf(tdsVals) ?? avgOf(tdsVals),
          lastProdVol: lastSaneMeter(prodVol),
          lastRejVol: lastSaneMeter(rejVol),
          deltaProdVol: periodDeltaFromCumulative(prodVol),
          deltaRejVol: periodDeltaFromCumulative(rejVol),
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
  range: TuyaHistoricoRange
): Promise<HistoricoHourRow[]> {
  const url = `${CONFIG.API_BASE_URL_V2}/puntoVentas/${puntoId}/historico?productId=${encodeURIComponent(productId)}&range=${range}&detail=1`;
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
}: {
  bundle: OsmosisChartBundle;
  puntoId: string;
  historicoRange: TuyaHistoricoRange;
}) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      let hours = bundle.rawHours ?? [];
      if (!hourHasDetailSamples(hours)) {
        hours = await fetchHistoricoDetailHours(puntoId, bundle.productId, historicoRange);
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
function chartDisplaySeries(series: { name: string; data: number[] }[]) {
  return (series || []).filter((s) => s.name !== 'Muestras en hora');
}

function TuyaLineChart({
  title,
  subheader,
  chart,
  yTitle,
  yMin,
  yMax,
  colors,
}: {
  title: string;
  subheader?: string;
  chart: ChartSeriesBlock;
  yTitle: string;
  yMin?: number;
  yMax?: number;
  colors?: string[];
}) {
  const theme = useTheme();
  const displaySeries = chartDisplaySeries(chart?.series || []);
  const hasData = chart?.categories?.length > 0 && displaySeries.some((s) => s.data?.length > 0);

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
      min: yMin,
      max: yMax,
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (value: number) => fNumber(value) },
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
}: {
  charts: OsmosisChartBundle[];
  rangeLabel: string;
  puntoId: string;
  historicoRange: TuyaHistoricoRange;
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
              <SummaryKpi label="TDS (mediana)" value={bundle.summary.avgTds} unit="ppm" />
            </Grid>
          </Grid>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={12} md={6}>
              <TuyaLineChart
                title="Volúmenes acumulados por hora"
                subheader="Lectura del medidor (fin de cada hora)"
                chart={bundle.volumen}
                yTitle="L"
                yMin={0}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TuyaLineChart
                title="Flujos por hora"
                subheader="Cuando hay muestras de caudales"
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
          </Grid>
          <Divider sx={{ mt: 1 }} />
        </Box>
      ))}
    </Box>
  );
}

export const TUYA_RANGE_LABELS: Record<TuyaHistoricoRange, string> = {
  '24h': 'últimas 24 horas',
  '7d': 'última semana',
  '30d': 'último mes',
};

export function TuyaHistoricoPeriodSelector({
  value,
  onChange,
}: {
  value: TuyaHistoricoRange;
  onChange: (range: TuyaHistoricoRange) => void;
}) {
  return (
    <FormControl size="small" sx={{ minWidth: 200, mb: 2 }}>
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
        <MenuItem value="7d">Última semana</MenuItem>
        <MenuItem value="30d">Último mes</MenuItem>
      </Select>
    </FormControl>
  );
}

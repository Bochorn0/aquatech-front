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
} from '@mui/material';

import { fNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
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
  const nums = values.filter((v) => v != null && !Number.isNaN(v) && v !== 0);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function lastNonZero(values: number[]): number | null {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (values[i] != null && !Number.isNaN(values[i]) && values[i] !== 0) return values[i];
  }
  return null;
}

function firstNonZero(values: number[]): number | null {
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] != null && !Number.isNaN(values[i]) && values[i] !== 0) return values[i];
  }
  return null;
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
      const flujoProd = hours.map((h: any) => Number(h.estadisticas?.flujo_produccion_promedio ?? 0));
      const flujoRech = hours.map((h: any) => Number(h.estadisticas?.flujo_rechazo_promedio ?? 0));
      const tdsVals = hours.map((h: any) => Number(h.estadisticas?.tds_promedio ?? 0));
      const prodVol = hours.map((h: any) => Number(h.estadisticas?.production_volume_total ?? 0));
      const rejVol = hours.map((h: any) => Number(h.estadisticas?.rejected_volume_total ?? 0));
      const totalLogs = hours.map((h: any) => Number(h.total_logs ?? 0));

      const firstProd = firstNonZero(prodVol);
      const lastProd = lastNonZero(prodVol);
      const firstRej = firstNonZero(rejVol);
      const lastRej = lastNonZero(rejVol);

      return {
        productId: String(product._id ?? product.id),
        productName: product.name || 'Osmosis',
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
          avgFlujoProd: avgOf(flujoProd),
          avgFlujoRech: avgOf(flujoRech),
          avgTds: avgOf(tdsVals),
          lastProdVol: lastProd,
          lastRejVol: lastRej,
          deltaProdVol:
            firstProd != null && lastProd != null ? Math.max(0, lastProd - firstProd) : null,
          deltaRejVol: firstRej != null && lastRej != null ? Math.max(0, lastRej - firstRej) : null,
          hoursWithData: hours.length,
        },
      };
    })
    .filter(Boolean) as OsmosisChartBundle[];
}

function escapeCsvCell(value: string | number): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadChartCsv({
  productName,
  chartTitle,
  chart,
}: {
  productName: string;
  chartTitle: string;
  chart: ChartSeriesBlock;
}) {
  const seriesForCsv = chart.series || [];
  const hourCol = chart.hours?.length ? chart.hours : chart.categories || [];
  const headers = ['hora', ...seriesForCsv.map((s) => s.name)];
  const rows = hourCol.map((hora, i) => [
    hora,
    ...seriesForCsv.map((s) => {
      const v = s.data?.[i];
      return v == null || Number.isNaN(v) ? '' : v;
    }),
  ]);

  const csv = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeProduct = (productName || 'producto').replace(/[^\w-]+/g, '_').slice(0, 40);
  const safeTitle = (chartTitle || 'chart').replace(/[^\w-]+/g, '_').slice(0, 40);
  a.href = url;
  a.download = `${safeProduct}_${safeTitle}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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
  productName,
}: {
  title: string;
  subheader?: string;
  chart: ChartSeriesBlock;
  yTitle: string;
  yMin?: number;
  yMax?: number;
  colors?: string[];
  productName?: string;
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

  const exportBtn = hasData ? (
    <Button
      size="small"
      variant="outlined"
      startIcon={<Iconify icon="solar:export-bold" />}
      onClick={() =>
        downloadChartCsv({
          productName: productName || 'osmosis',
          chartTitle: title,
          chart,
        })
      }
    >
      CSV
    </Button>
  ) : null;

  if (!hasData) {
    return (
      <Card variant="outlined" sx={{ mb: 2, p: 2, height: '100%' }}>
        <CardHeader title={title} subheader={subheader || 'Sin datos históricos en el período'} />
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ mb: 2, p: 2, height: '100%' }}>
      <CardHeader
        title={title}
        subheader={subheader}
        action={exportBtn}
        sx={{ '& .MuiCardHeader-action': { alignSelf: 'center', m: 0 } }}
      />
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
}: {
  charts: OsmosisChartBundle[];
  rangeLabel: string;
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
        Promedios por hora — {rangeLabel}
      </Typography>
      {charts.map((bundle) => (
        <Box key={bundle.productId} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 1 }}>
            {bundle.productName}
          </Typography>
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
              <SummaryKpi label="Flujo prod. prom." value={bundle.summary.avgFlujoProd} unit="L/min" />
            </Grid>
            <Grid item xs={6} sm={4}>
              <SummaryKpi label="Horas con datos" value={bundle.summary.hoursWithData} unit="h" />
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
                productName={bundle.productName}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TuyaLineChart
                title="Flujos por hora"
                subheader="Cuando hay muestras de caudales"
                chart={bundle.flujo}
                yTitle="L/min"
                yMin={0}
                productName={bundle.productName}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TuyaLineChart
                title="TDS por hora"
                chart={bundle.tds}
                yTitle="ppm"
                yMin={0}
                colors={['#2e7d32']}
                productName={bundle.productName}
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

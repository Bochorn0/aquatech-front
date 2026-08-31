import { useMemo } from 'react';

import { useTheme } from '@mui/material/styles';
import { Box, Card, CardHeader, Chip, Stack, Typography } from '@mui/material';

import { Chart, useChart } from 'src/components/chart';

export type ChartTrafficStatus = 'success' | 'warning' | 'error';

type SensorFlujoHistoricoChartProps = {
  title: string;
  subheader?: string;
  categories: string[];
  series: Array<{ name: string; data: number[] }>;
  yTitle?: string;
  decimalsInFloat?: number;
  /** Keep Y at 0. If false, zoom near the data so small increments stay visible. */
  fromZero?: boolean;
  status?: ChartTrafficStatus;
  statusLabel?: string;
};

function niceCeil(value: number, fallback = 1): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  const mag = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / mag) * mag;
}

function yAxisBounds(values: number[], fromZero: boolean, fallbackMax = 1): { min: number; max: number } {
  const finite = values.filter((n) => Number.isFinite(n));
  if (!finite.length) return { min: 0, max: fallbackMax };

  const dataMin = Math.min(...finite);
  const dataMax = Math.max(...finite, 0);
  const span = Math.max(dataMax - dataMin, 0);
  const pad = Math.max(span * 0.2, dataMax * 0.08, 0.5);
  const max = niceCeil(dataMax + pad, fallbackMax);

  if (fromZero) {
    return { min: 0, max };
  }

  return {
    min: Math.max(0, dataMin - pad),
    max: max <= dataMin ? dataMin + pad : max,
  };
}

function TrafficLight({ status }: { status: ChartTrafficStatus }) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" aria-label={`Semaforo ${status}`}>
      {(['success', 'warning', 'error'] as const).map((level) => {
        const on = status === level;
        const color =
          level === 'success' ? 'success.main' : level === 'warning' ? 'warning.main' : 'error.main';
        return (
          <Box
            key={level}
            sx={{
              width: on ? 12 : 9,
              height: on ? 12 : 9,
              borderRadius: '50%',
              bgcolor: color,
              opacity: on ? 1 : 0.22,
              boxShadow: on ? 1 : 0,
            }}
          />
        );
      })}
    </Stack>
  );
}

export function SensorFlujoHistoricoChart({
  title,
  subheader,
  categories,
  series,
  yTitle = 'Valor',
  decimalsInFloat = 2,
  fromZero = true,
  status,
  statusLabel,
}: SensorFlujoHistoricoChartProps) {
  const theme = useTheme();
  const hasData = categories.length > 0 && series.some((s) => s.data.length > 0);
  const { min: yMin, max: yMax } = useMemo(
    () => yAxisBounds(series.flatMap((s) => s.data), fromZero),
    [series, fromZero]
  );

  const lineColor =
    status === 'error'
      ? theme.palette.error.main
      : status === 'warning'
        ? theme.palette.warning.main
        : status === 'success'
          ? theme.palette.success.main
          : theme.palette.primary.main;

  const chartOptions = useChart({
    chart: {
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    stroke: { width: 2, curve: 'smooth' },
    markers: { size: categories.length > 80 ? 0 : 3 },
    xaxis: {
      categories,
      labels: {
        rotate: -45,
        hideOverlappingLabels: true,
        style: { fontSize: '10px' },
      },
    },
    yaxis: {
      title: { text: yTitle },
      min: yMin,
      max: yMax,
      forceNiceScale: false,
      decimalsInFloat,
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value: number) =>
          Number.isFinite(value) ? `${value.toFixed(decimalsInFloat)} ${yTitle}` : 'N/A',
      },
    },
    legend: { position: 'top', horizontalAlign: 'right' },
    grid: { strokeDashArray: 3 },
    colors: [lineColor, theme.palette.success.main],
  });

  const memoSeries = useMemo(() => series, [series]);

  return (
    <Card variant="outlined">
      <CardHeader
        title={title}
        subheader={subheader}
        sx={{ pb: 0.5, '& .MuiCardHeader-action': { alignSelf: 'center', m: 0 } }}
        action={
          status ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <TrafficLight status={status} />
              {statusLabel && (
                <Chip
                  size="small"
                  color={status}
                  label={statusLabel}
                  sx={{ height: 22, fontWeight: 700 }}
                />
              )}
            </Stack>
          ) : null
        }
      />
      <Box sx={{ p: 1.5, pt: 0 }}>
        {hasData ? (
          <Chart type="line" series={memoSeries} options={chartOptions} height={240} />
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            Aún no hay lecturas de flujo para graficar.
          </Typography>
        )}
      </Box>
    </Card>
  );
}

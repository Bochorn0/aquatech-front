import { useMemo } from 'react';

import { useTheme } from '@mui/material/styles';
import { Box, Card, CardHeader, Typography } from '@mui/material';

import { Chart, useChart } from 'src/components/chart';

type SensorFlujoHistoricoChartProps = {
  title: string;
  subheader?: string;
  categories: string[];
  series: Array<{ name: string; data: number[] }>;
  yTitle?: string;
  decimalsInFloat?: number;
  /** Keep Y at 0. If false, zoom near the data so small increments stay visible. */
  fromZero?: boolean;
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

export function SensorFlujoHistoricoChart({
  title,
  subheader,
  categories,
  series,
  yTitle = 'Valor',
  decimalsInFloat = 2,
  fromZero = true,
}: SensorFlujoHistoricoChartProps) {
  const theme = useTheme();
  const hasData = categories.length > 0 && series.some((s) => s.data.length > 0);
  const { min: yMin, max: yMax } = useMemo(
    () => yAxisBounds(series.flatMap((s) => s.data), fromZero),
    [series, fromZero]
  );

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
    colors: [theme.palette.primary.main, theme.palette.success.main],
  });

  const memoSeries = useMemo(() => series, [series]);

  return (
    <Card>
      <CardHeader title={title} subheader={subheader} />
      <Box sx={{ p: 2, pt: 0 }}>
        {hasData ? (
          <Chart type="line" series={memoSeries} options={chartOptions} height={320} />
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
            Aún no hay lecturas de flujo para graficar.
          </Typography>
        )}
      </Box>
    </Card>
  );
}

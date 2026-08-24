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
};

export function SensorFlujoHistoricoChart({
  title,
  subheader,
  categories,
  series,
  yTitle = 'Valor',
}: SensorFlujoHistoricoChartProps) {
  const theme = useTheme();
  const hasData = categories.length > 0 && series.some((s) => s.data.length > 0);

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
      min: 0,
      decimalsInFloat: 4,
    },
    tooltip: {
      shared: true,
      intersect: false,
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

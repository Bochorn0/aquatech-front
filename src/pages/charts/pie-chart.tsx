import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';

import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';

import { fNumber } from 'src/utils/format-number';

import { Chart, ChartLegends } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  chart: {
    colors?: string[];
    series: {
      label: string;
      value: number;
    }[];
    options?: ChartOptions;
  };
  onSectionClick?: (data: any) => void;
};

export function PieChart({ title, subheader, chart, onSectionClick, ...other }: Props) {
  const theme = useTheme();

  const chartSeries = chart.series.map((item) => item.value);

  const chartColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main
  ];

  const chartOptions: ChartOptions = {
    ...chart.options, // Preserve existing options
    chart: {
      ...chart.options?.chart,
      sparkline: { enabled: true },
      events: {
        /** ✅ Native ApexCharts Click Event */
        dataPointSelection: (_event, _chartContext, config) => {
          if (onSectionClick && config.dataPointIndex !== undefined) {
            const index = config.dataPointIndex;
            const selectedItem = chart.series[index];
            onSectionClick(selectedItem);
          }
        },
      },
    },
    colors: chart.colors || chartColors,
    labels: chart.series.map((item) => item.label),
    stroke: { width: 0 },
    dataLabels: { enabled: true, dropShadow: { enabled: false } },
    tooltip: {
      y: {
        formatter: (value: number) => fNumber(value),
        title: { formatter: (seriesName: string) => `${seriesName}` },
      },
    },
    plotOptions: { pie: { donut: { labels: { show: false } } } },
  };

  return (
    <Card {...other}>
      <CardHeader title={title} subheader={subheader} sx={{ p: 2 }} textAlign='center' />

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Chart
        type="pie"
        series={chartSeries}
        options={chartOptions}
        width={{ xs: 240, xl: 260 }}
        height={{ xs: 240, xl: 260 }}
        sx={{ my: 6, mx: 'auto' }}
      />

      <Divider sx={{ borderStyle: 'dashed' }} />

      <ChartLegends
        labels={chartOptions?.labels}
        colors={chartOptions?.colors}
        sx={{ p: 3, justifyContent: 'center' }}
      />
    </Card>
  );
}

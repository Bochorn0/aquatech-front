import { useTheme } from '@mui/material/styles';
import { Box, Card, Chip, Divider, CardHeader, Typography } from '@mui/material';

import { fNumber } from 'src/utils/format-number';

import { Chart, useChart } from 'src/components/chart';

type OsmosisMetricsChartProps = {
  title: string;
  subtitle?: string;
  categories: string[];
  series: Array<{
    name: string;
    data: Array<{
      x: string;
      y: number;
      fillColor?: string;
    }>;
  }>;
  metricRules?: Record<string, Array<{
    min: number;
    max: number;
    color: string;
    label: string;
    level?: string;
  }>>;
};

export function OsmosisMetricsChart({
  title,
  subtitle,
  categories,
  series,
  metricRules = {},
}: OsmosisMetricsChartProps) {
  const theme = useTheme();

  const hasData = categories.length > 0 && series.length > 0;

  // Get color for a value based on metric rules
  const getColorForValue = (seriesName: string, value: number): string => {
    const rules = metricRules[seriesName.toLowerCase()];
    if (!rules || rules.length === 0) {
      return theme.palette.primary.main;
    }

    const matchingRule = rules.find(rule => value >= rule.min && value <= rule.max);
    if (matchingRule) {
      return matchingRule.color;
    }

    return theme.palette.primary.main;
  };

  // Process series to add colors to each bar
  const coloredSeries = series.map(s => ({
    name: s.name,
    data: s.data.map(point => ({
      x: point.x,
      y: point.y,
      fillColor: point.fillColor || getColorForValue(s.name, point.y),
    })),
  }));

  const chartOptions = useChart({
    chart: {
      type: 'bar',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 4,
        dataLabels: {
          position: 'top',
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent'],
    },
    xaxis: {
      categories,
      labels: {
        rotate: -45,
        rotateAlways: false,
        style: {
          fontSize: '11px',
        },
      },
    },
    yaxis: {
      title: {
        text: 'Valor',
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value: number, { seriesIndex, w }: any) => {
          const seriesName = w.config.series[seriesIndex].name;
          const rules = metricRules[seriesName.toLowerCase()];
          
          let status = 'Normal';
          if (rules) {
            const matchingRule = rules.find(rule => value >= rule.min && value <= rule.max);
            if (matchingRule) {
              status = matchingRule.label;
            }
          }
          
          return `${fNumber(value)} - ${status}`;
        },
        title: {
          formatter: (seriesName: string) => `${seriesName}: `,
        },
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
    },
    grid: {
      strokeDashArray: 3,
    },
  });

  if (!hasData) {
    return (
      <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
        <CardHeader title={title} subheader="No hay datos disponibles" />
      </Card>
    );
  }

  // Get all unique metric rules for legend
  const allRules: Array<{ label: string; color: string; metric: string }> = [];
  Object.entries(metricRules).forEach(([metricName, rules]) => {
    rules.forEach(rule => {
      if (!allRules.some(r => r.label === rule.label && r.color === rule.color)) {
        allRules.push({
          label: rule.label,
          color: rule.color,
          metric: metricName,
        });
      }
    });
  });

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 3,
        p: 3,
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'box-shadow 0.3s ease',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(250,250,250,0.95) 100%)',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        },
      }}
    >
      <CardHeader
        title={
          <Typography variant="h6" fontWeight="600" sx={{ color: 'primary.main' }}>
            {title}
          </Typography>
        }
        subheader={
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle || 'Métricas de osmosis'}
          </Typography>
        }
      />

      {allRules.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', px: 2, pb: 2 }}>
          {allRules.map((rule, idx) => (
            <Chip
              key={idx}
              label={rule.label}
              size="small"
              sx={{
                bgcolor: rule.color,
                color: 'white',
                fontWeight: 500,
                '& .MuiChip-label': {
                  px: 1.5,
                },
              }}
            />
          ))}
        </Box>
      )}

      <Divider sx={{ mb: 3, borderWidth: 1 }} />
      <Chart type="bar" series={coloredSeries} options={chartOptions} height={400} sx={{ py: 2 }} />
    </Card>
  );
}

import { useTheme } from '@mui/material/styles';
import { Box, Card, Chip, Divider, CardHeader, Typography } from '@mui/material';

import { fNumber } from 'src/utils/format-number';

import { Chart, useChart } from 'src/components/chart';

type NivelHistoricoChartProps = {
  title: string;
  subtitle?: string;
  categories: string[];
  series: Array<{
    name: string;
    data: number[];
  }>;
  currentValue?: number;
  metricRules?: Array<{
    min: number;
    max: number;
    color: string;
    label: string;
    level?: string;
  }>;
};

export function NivelHistoricoChart({
  title,
  subtitle,
  categories,
  series,
  currentValue,
  metricRules = [],
}: NivelHistoricoChartProps) {
  const theme = useTheme();

  const hasData = categories.length > 0 && series.length > 0 && series[0]?.data?.length > 0;

  // Map rule colors to theme colors
  const getThemeColor = (ruleColor: string) => {
    const colorUpper = ruleColor.toUpperCase();
    // Red colors -> error
    if (colorUpper.includes('#EE0000') || colorUpper.includes('#FF0000') || colorUpper.includes('#F00')) {
      return theme.palette.error.main;
    }
    // Yellow colors -> warning
    if (colorUpper.includes('#FFFF00') || colorUpper.includes('#FFF000') || colorUpper.includes('#FF0')) {
      return theme.palette.warning.main;
    }
    // Green colors -> success
    if (colorUpper.includes('#00B050') || colorUpper.includes('#0F0') || colorUpper.includes('#00FF00')) {
      return theme.palette.success.main;
    }
    return theme.palette.primary.main;
  };

  // Get color for a specific value based on metric rules
  const getColorForValue = (value: number) => {
    if (metricRules.length === 0) return theme.palette.success.main;
    
    const matchingRule = metricRules.find(rule => value >= rule.min && value <= rule.max);
    
    if (matchingRule) {
      return getThemeColor(matchingRule.color);
    }
    
    // If no exact match, determine color based on value position
    // Sort rules by min value to find closest range
    const sortedRules = [...metricRules].sort((a, b) => a.min - b.min);
    
    // If value is below all ranges, use the lowest range color
    if (value < sortedRules[0].min) {
      return getThemeColor(sortedRules[0].color);
    }
    
    // If value is above all ranges, use the highest range color
    if (value > sortedRules[sortedRules.length - 1].max) {
      return getThemeColor(sortedRules[sortedRules.length - 1].color);
    }
    
    // Find the closest range
    for (let i = 0; i < sortedRules.length - 1; i += 1) {
      if (value > sortedRules[i].max && value < sortedRules[i + 1].min) {
        // Value is between two ranges, use the more severe color
        const color1 = getThemeColor(sortedRules[i].color);
        const color2 = getThemeColor(sortedRules[i + 1].color);
        // Prefer error over warning over success
        if (color1 === theme.palette.error.main || color2 === theme.palette.error.main) {
          return theme.palette.error.main;
        }
        if (color1 === theme.palette.warning.main || color2 === theme.palette.warning.main) {
          return theme.palette.warning.main;
        }
        return theme.palette.success.main;
      }
    }
    
    return theme.palette.success.main;
  };

  // Create annotations for threshold lines
  const createAnnotations = () => {
    if (metricRules.length === 0) return {};

    const yaxis: any[] = [];
    
    // Add horizontal lines at rule boundaries
    const boundaries = new Set<number>();
    metricRules.forEach(rule => {
      boundaries.add(rule.min);
      boundaries.add(rule.max);
    });

    Array.from(boundaries).forEach(value => {
      if (value > 0 && value < 100) {
        yaxis.push({
          y: value,
          borderColor: '#999',
          strokeDashArray: 5,
          opacity: 0.3,
        });
      }
    });

    return { yaxis };
  };

  const chartOptions = useChart({
    chart: {
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    stroke: {
      width: 3,
      curve: 'smooth',
    },
    fill: {
      type: 'solid',
      opacity: 0.3,
    },
    markers: {
      size: 5,
      strokeWidth: 2,
      hover: {
        size: 7,
      },
      discrete: series.length > 0 && series[0]?.data?.length > 0 
        ? series[0].data.map((value: number, index: number) => ({
            seriesIndex: 0,
            dataPointIndex: index,
            fillColor: getColorForValue(value),
            strokeColor: getColorForValue(value),
            size: 5,
          }))
        : [],
    },
    colors: [theme.palette.primary.main],
    xaxis: {
      categories,
      labels: {
        rotate: -45,
        rotateAlways: false,
        style: {
          fontSize: '10px',
        },
        trim: false,
        hideOverlappingLabels: true,
        maxHeight: 80,
      },
      tickPlacement: 'on',
    },
    yaxis: {
      title: {
        text: 'Nivel (%)',
      },
      min: 0,
      max: 100,
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value: number) => {
          let status = 'Normal';
          
          const matchingRule = metricRules.find(rule => value >= rule.min && value <= rule.max);
          if (matchingRule) {
            status = matchingRule.label;
          }
          
          return `${fNumber(value)}% - ${status}`;
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
    annotations: createAnnotations(),
  });

  if (!hasData) {
    return (
      <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
        <CardHeader title={title} subheader="No hay datos históricos disponibles" />
      </Card>
    );
  }

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
            {currentValue !== null && currentValue !== undefined
              ? `Valor actual: ${currentValue.toFixed(1)}%`
              : subtitle || 'Histórico de lecturas'}
          </Typography>
        }
      />
      
      {metricRules.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', px: 2, pb: 2 }}>
          {metricRules.map((rule, idx) => {
            const themeColor = getThemeColor(rule.color);
            return (
              <Chip
                key={idx}
                label={`${rule.label} (${rule.min}-${rule.max}%)`}
                size="small"
                sx={{
                  bgcolor: themeColor,
                  color: 'white',
                  fontWeight: 500,
                  '& .MuiChip-label': {
                    px: 1.5,
                  },
                }}
              />
            );
          })}
        </Box>
      )}
      
      <Divider sx={{ mb: 3, borderWidth: 1 }} />
      <Chart type="line" series={series} options={chartOptions} height={450} sx={{ py: 2 }} />
    </Card>
  );
}

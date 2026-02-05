import { useTheme } from '@mui/material/styles';
import { Box, Card, Chip, Divider, CardHeader, Typography } from '@mui/material';

import { fNumber } from 'src/utils/format-number';

import { Chart, useChart } from 'src/components/chart';

import type { RuleSeverity } from '../types';

type NivelHistoricoChartRule = {
  min: number | null;
  max: number | null;
  color: string;
  label: string;
  level?: string;
  severity?: RuleSeverity;
};

type NivelHistoricoChartProps = {
  title: string;
  subtitle?: string;
  categories: string[];
  series: Array<{
    name: string;
    data: number[];
  }>;
  currentValue?: number;
  metricRules?: NivelHistoricoChartRule[];
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

  // Extract numeric y-value from a data point (supports number[] or { x, y }[] from ApexCharts)
  const getNumericValue = (point: number | [number, number] | { x: number; y: number }): number => {
    if (typeof point === 'number' && !Number.isNaN(point)) return point;
    if (Array.isArray(point) && point.length > 1) return Number(point[1]);
    if (point && typeof point === 'object' && 'y' in point) return Number((point as { y: number }).y);
    return Number.NaN;
  };

  const inRange = (value: number, min: number | null, max: number | null) =>
    (min == null || value >= min) && (max == null || value <= max);

  // Explicit hex for discrete markers so ApexCharts applies per-point (avoids single-color bug)
  const SEMANTIC_HEX = {
    error: '#d32f2f',
    warning: '#ed6c02',
    success: '#2e7d32',
    primary: '#1976d2',
    grey: '#9e9e9e',
  } as const;

  const severityToThemeColor = (severity: RuleSeverity) => {
    switch (severity) {
      case 'critico':
        return theme.palette.error.main;
      case 'preventivo':
        return theme.palette.warning.main;
      case 'normal':
      default:
        return theme.palette.success.main;
    }
  };

  // Map rule colors to theme colors (hex or name)
  const getThemeColor = (ruleColor: string) => {
    const colorUpper = (ruleColor || '').toUpperCase();
    // Red colors -> error (MUI error #d32f2f, common #FF5630, #EE0000, #FF0000)
    if (
      /#(FF5630|D32F2F|EE0000|FF0000|F44336|E53935)/i.test(colorUpper) ||
      colorUpper.includes('#F00') ||
      colorUpper.includes('ERROR') ||
      colorUpper.includes('CRITICO')
    ) {
      return theme.palette.error.main;
    }
    // Amber/Orange/Yellow -> warning
    if (
      /#(FFAB00|FF9800|FFA726|FFB74D|FFC107|FFEB3B|FFF000|FFFF00)/i.test(colorUpper) ||
      colorUpper.includes('#FF0') ||
      colorUpper.includes('WARNING') ||
      colorUpper.includes('PREVENTIVO')
    ) {
      return theme.palette.warning.main;
    }
    // Green -> success
    if (
      /#(36B37E|00B050|4CAF50|66BB6A|81C784|00FF00)/i.test(colorUpper) ||
      colorUpper.includes('#0F0') ||
      colorUpper.includes('SUCCESS') ||
      colorUpper.includes('NORMAL')
    ) {
      return theme.palette.success.main;
    }
    return theme.palette.primary.main;
  };

  const getThemeColorHex = (ruleColor: string): string => {
    const colorUpper = (ruleColor || '').toUpperCase();
    if (
      /#(FF5630|D32F2F|EE0000|FF0000|F44336|E53935)/i.test(colorUpper) ||
      colorUpper.includes('#F00') ||
      colorUpper.includes('ERROR') ||
      colorUpper.includes('CRITICO')
    ) return SEMANTIC_HEX.error;
    if (
      /#(FFAB00|FF9800|FFA726|FFB74D|FFC107|FFEB3B|FFF000|FFFF00)/i.test(colorUpper) ||
      colorUpper.includes('#FF0') ||
      colorUpper.includes('WARNING') ||
      colorUpper.includes('PREVENTIVO')
    ) return SEMANTIC_HEX.warning;
    if (
      /#(36B37E|00B050|4CAF50|66BB6A|81C784|00FF00)/i.test(colorUpper) ||
      colorUpper.includes('#0F0') ||
      colorUpper.includes('SUCCESS') ||
      colorUpper.includes('NORMAL')
    ) return SEMANTIC_HEX.success;
    return SEMANTIC_HEX.primary;
  };

  // Severity order for when multiple rules match: prefer most severe
  const severityOrder = (s: RuleSeverity | undefined): number => {
    if (s === 'critico') return 0;
    if (s === 'preventivo') return 1;
    return 2; // normal or undefined
  };

  const getColorHexForValue = (value: number): string => {
    if (metricRules.length === 0) return SEMANTIC_HEX.success;
    const matchingRules = metricRules.filter((rule) => inRange(value, rule.min, rule.max));
    if (matchingRules.length > 0) {
      // Pick most severe rule when multiple match (e.g. overlapping ranges)
      const matchingRule = matchingRules.sort(
        (a, b) => severityOrder(a.severity) - severityOrder(b.severity)
      )[0];
      if (matchingRule.severity) {
        switch (matchingRule.severity) {
          case 'critico': return SEMANTIC_HEX.error;
          case 'preventivo': return SEMANTIC_HEX.warning;
          case 'normal':
          default: return SEMANTIC_HEX.success;
        }
      }
      return getThemeColorHex(matchingRule.color);
    }
    const withNumericBounds = metricRules.filter(
      (r) => r.min != null && r.max != null
    ) as Array<{ min: number; max: number; color: string; label: string; severity?: RuleSeverity }>;
    if (withNumericBounds.length === 0) return SEMANTIC_HEX.success;
    const sortedRules = [...withNumericBounds].sort((a, b) => a.min - b.min);
    if (value < sortedRules[0].min) {
      const r = sortedRules[0];
      return r.severity
        ? (r.severity === 'critico' ? SEMANTIC_HEX.error : r.severity === 'preventivo' ? SEMANTIC_HEX.warning : SEMANTIC_HEX.success)
        : getThemeColorHex(r.color);
    }
    if (value > sortedRules[sortedRules.length - 1].max) {
      const r = sortedRules[sortedRules.length - 1];
      return r.severity
        ? (r.severity === 'critico' ? SEMANTIC_HEX.error : r.severity === 'preventivo' ? SEMANTIC_HEX.warning : SEMANTIC_HEX.success)
        : getThemeColorHex(r.color);
    }
    for (let i = 0; i < sortedRules.length - 1; i += 1) {
      if (value > sortedRules[i].max && value < sortedRules[i + 1].min) {
        const s1 = sortedRules[i].severity;
        const s2 = sortedRules[i + 1].severity;
        const hex1 = s1 ? (s1 === 'critico' ? SEMANTIC_HEX.error : s1 === 'preventivo' ? SEMANTIC_HEX.warning : SEMANTIC_HEX.success) : getThemeColorHex(sortedRules[i].color);
        const hex2 = s2 ? (s2 === 'critico' ? SEMANTIC_HEX.error : s2 === 'preventivo' ? SEMANTIC_HEX.warning : SEMANTIC_HEX.success) : getThemeColorHex(sortedRules[i + 1].color);
        if (hex1 === SEMANTIC_HEX.error || hex2 === SEMANTIC_HEX.error) return SEMANTIC_HEX.error;
        if (hex1 === SEMANTIC_HEX.warning || hex2 === SEMANTIC_HEX.warning) return SEMANTIC_HEX.warning;
        return SEMANTIC_HEX.success;
      }
    }
    return SEMANTIC_HEX.success;
  };

  // Create annotations for threshold lines
  const createAnnotations = () => {
    if (metricRules.length === 0) return {};

    const yaxis: any[] = [];
    const boundaries = new Set<number>();
    metricRules.forEach((rule) => {
      if (rule.min != null) boundaries.add(rule.min);
      if (rule.max != null) boundaries.add(rule.max);
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
      discrete: (() => {
        const data = series[0]?.data ?? [];
        if (data.length === 0) return [];
        return data.map((point: number | [number, number] | { x: number; y: number }, index: number) => {
          const value = getNumericValue(point);
          const color = Number.isNaN(value) ? SEMANTIC_HEX.grey : getColorHexForValue(value);
          return {
            seriesIndex: 0,
            dataPointIndex: index,
            fillColor: color,
            strokeColor: color,
            size: 5,
          };
        });
      })(),
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
          const matchingRules = metricRules.filter((rule) => inRange(value, rule.min, rule.max));
          if (matchingRules.length > 0) {
            const rule = matchingRules.sort(
              (a, b) => severityOrder(a.severity) - severityOrder(b.severity)
            )[0];
            status = rule.label;
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
            const themeColor = rule.severity
              ? severityToThemeColor(rule.severity)
              : getThemeColor(rule.color);
            const rangeLabel =
              rule.min != null && rule.max != null
                ? `${rule.min}-${rule.max}%`
                : rule.min != null
                  ? `≥ ${rule.min}%`
                  : rule.max != null
                    ? `≤ ${rule.max}%`
                    : '—';
            return (
              <Chip
                key={idx}
                label={rangeLabel !== '—' ? `${rule.label} (${rangeLabel})` : rule.label}
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
      <Chart
        key={`${title}-${(series[0]?.data ?? []).length}-${(series[0]?.data ?? [])[0] ?? ''}-${(series[0]?.data ?? [])[(series[0]?.data ?? []).length - 1] ?? ''}`}
        type="line"
        series={series}
        options={chartOptions}
        height={450}
        sx={{ py: 2 }}
      />
    </Card>
  );
}

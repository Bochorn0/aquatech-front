import { useMemo, useCallback } from 'react';

import { useTheme } from '@mui/material/styles';
import { Box, Card, Chip, Divider, CardHeader } from '@mui/material';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type HistoricalRecord = {
  ciudad: string;
  calidad: number;
  tdsMinimo: number | null;
  tdsMaximo: number | null;
  createdAt: string;
};

type Props = {
  title: string;
  subheader?: string;
  data: HistoricalRecord[];
};

export function CalidadHistoricoChart({ title, subheader, data }: Props) {
  const theme = useTheme();

  // Get color based on quality level
  const getQualityColor = useCallback((calidad: number): string => {
    if (calidad >= 3.0) return theme.palette.error.main;
    if (calidad >= 2.0) return theme.palette.warning.main;
    return theme.palette.success.main;
  }, [theme]);

  const getQualityLabel = useCallback((calidad: number): string => {
    if (calidad >= 3.0) return 'Mala';
    if (calidad >= 2.0) return 'Regular';
    return 'Buena';
  }, []);

  // Process data for chart
  const { categories, series, discreteMarkers } = useMemo(() => {
    if (!data || data.length === 0) {
      return { categories: [], series: [], discreteMarkers: [] };
    }

    // Sort by date
    const sortedData = [...data].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Group by city
    const citiesMap = new Map<string, { dates: string[]; values: number[] }>();

    sortedData.forEach((record) => {
      if (!citiesMap.has(record.ciudad)) {
        citiesMap.set(record.ciudad, { dates: [], values: [] });
      }
      const cityData = citiesMap.get(record.ciudad)!;
      const date = new Date(record.createdAt);
      const formattedDate = date.toLocaleDateString('es-MX', {
        month: 'short',
        day: 'numeric',
      });
      cityData.dates.push(formattedDate);
      cityData.values.push(record.calidad);
    });

    // Get all unique dates for categories
    const allDates = Array.from(
      new Set(sortedData.map((r) => {
        const date = new Date(r.createdAt);
        return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
      }))
    );

    // Create series for each city
    const chartSeries = Array.from(citiesMap.entries()).map(([ciudad, cityData]) => ({
      name: ciudad,
      data: cityData.values,
    }));

    // Create discrete markers for color-coding points
    const markers: any[] = [];
    let seriesIndex = 0;
    citiesMap.forEach((cityData) => {
      cityData.values.forEach((value, dataPointIndex) => {
        markers.push({
          seriesIndex,
          dataPointIndex,
          fillColor: getQualityColor(value),
          strokeColor: getQualityColor(value),
          size: 6,
        });
      });
      seriesIndex += 1;
    });

    return {
      categories: allDates,
      series: chartSeries,
      discreteMarkers: markers,
    };
  }, [data, getQualityColor]);

  const chartOptions = useChart({
    chart: {
      type: 'line',
      toolbar: { show: true },
      zoom: { enabled: true },
    },
    xaxis: {
      categories,
      labels: {
        style: {
          fontSize: '11px',
        },
      },
    },
    yaxis: {
      title: {
        text: 'Calidad de Agua',
      },
      labels: {
        formatter: (value: number) => value.toFixed(1),
      },
    },
    stroke: {
      width: 2,
      curve: 'smooth',
    },
    markers: {
      discrete: discreteMarkers,
      size: 0, // Hide default markers, use discrete ones
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value: number) => {
          const label = getQualityLabel(value);
          return `${value.toFixed(2)} (${label})`;
        },
      },
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
    },
    grid: {
      strokeDashArray: 3,
    },
  });

  const hasData = categories.length > 0 && series.length > 0;

  return (
    <Card>
      <CardHeader title={title} subheader={subheader} />
      <Divider />

      {hasData ? (
        <>
          <Box sx={{ p: 2, pb: 1 }}>
            <Box display="flex" gap={1} flexWrap="wrap" justifyContent="center">
              <Chip
                label="Buena (< 2.0)"
                size="small"
                sx={{
                  backgroundColor: theme.palette.success.main,
                  color: theme.palette.success.contrastText,
                }}
              />
              <Chip
                label="Regular (2.0 - 3.0)"
                size="small"
                sx={{
                  backgroundColor: theme.palette.warning.main,
                  color: theme.palette.warning.contrastText,
                }}
              />
              <Chip
                label="Mala (≥ 3.0)"
                size="small"
                sx={{
                  backgroundColor: theme.palette.error.main,
                  color: theme.palette.error.contrastText,
                }}
              />
            </Box>
          </Box>

          <Chart type="line" series={series} options={chartOptions} height={320} sx={{ py: 2, px: 1 }} />
        </>
      ) : (
        <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
          No hay datos históricos disponibles
        </Box>
      )}
    </Card>
  );
}

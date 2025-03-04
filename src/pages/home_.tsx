import type { ColorType } from 'src/theme/core/palette';
import type { SelectChangeEvent } from '@mui/material/Select';

import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';

import Grid from '@mui/material/Unstable_Grid2';
import { Box, Paper, Select, Checkbox, MenuItem, InputLabel, Typography, FormControl, ListItemText, CircularProgress } from '@mui/material';

import { CONFIG } from 'src/config-global';
import { DashboardContent } from 'src/layouts/dashboard';

import { PieChart } from './charts/pie-chart';
import { SideBarChart } from './charts/side-bar-chart';
import { MultipleBarChart } from './charts/multiple-bar-chart';
import { GlobalCardMetrics } from './charts/global-card-metrics';


// ---------------------- Interfaces ---------------------- //
interface City {
  name: string;
  initiallyHidden: boolean;
}
interface Metric {
  label: string;
  percentage: number;
  color?: ColorType;
  total: number;
  icon: string;
  chart?: any; // Adjust type if needed for your chart data
}
interface ChartData {
  categories: string[];
  series: { name: string; data: number[] }[];
}
interface VisitData {
  series: { label: string; value: number }[];
}

// ---------------------- Component ---------------------- //

export function DashboardPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  
  const [totalValues, setTotalValues] = useState({
    total: 0,
    totalOnline: 0,
    totalOffline: 0,
    totalRango: 0,
    totalRangoOnline: 0,
    totalFueraRango: 0,
    totalFueraRangoOnline: 0,
    totalOportunidades: 0,
    totalOportunidadesOnline: 0,
    metrics: [],
    serieCovertura: {
      categories: [] as string[], // Add categories here
      series: [] as { name: string; data: number[]; initiallyHidden: boolean }[],
    },
    serieCliente: {
      categories: [] as string[], // Add categories here
      series: [] as { name: string; data: number[]; initiallyHidden: boolean }[],
    },
  });

  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [isInitialFetch, setIsInitialFetch] = useState<boolean>(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const token = localStorage.getItem('token');
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        const response = await axios.get(`${CONFIG.API_BASE_URL}/dashboard`);
        const totValues = response.data;
        setTotalValues(totValues);
        const metric : Metric[] = response.data.metrics;
        setMetrics(metric);
        // Initialize selectedCities based on initiallyHidden
        if (isInitialFetch) {
          // Initialize selectedCities only once
          const citiesToSelect = totValues.serieCovertura.series
            .filter((city: City) => !city.initiallyHidden)
            .map((city: City) => city.name);
          setSelectedCities(citiesToSelect);
          setSelectedMonths(totValues.serieCovertura.categories);
          setIsInitialFetch(false); // Prevent overwriting cities in future fetches
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token'); // Remove token if invalid
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isInitialFetch]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  // Event handler to manage the selected cities
  const handleCityChange = (event: SelectChangeEvent<string[]>) => {
    setSelectedCities(event.target.value as string[]);
  };
  // Event handler to manage the selected months
  const handleMonthChange = (event: SelectChangeEvent<string[]>) => {
    console.log(event.target);
    setSelectedMonths(event.target.value as string[]);
    
  }

  // Filter the chart data based on the selected months
  const filteredMonths = totalValues.serieCovertura.categories.filter((category) =>
    selectedMonths.length === 0 || selectedMonths.includes(category)
  );
  console.log('filteredMonths', filteredMonths);
  // Get the indexes of the selected months
  const selectedMonthIndexes = totalValues.serieCovertura.categories
  .map((category, index) => {
    const isSelected = selectedMonths.includes(category);
    return isSelected ? index : -1;
  })
  .filter(index => index !== -1);
  // Filter the series data based on the selected indexes
  const filteredSeries = totalValues.serieCovertura.series
    .filter(city => selectedCities.length === 0 || selectedCities.includes(city.name))
    .map(city => ({
      ...city,
      data: city.data.filter((_, index) => selectedMonthIndexes.includes(index)), // Keep only selected months
    }));
  const filteredSerieCovertura = {
    categories: filteredMonths,
    series: filteredSeries,
  };
  const { serieCliente } = totalValues;
  console.log('filteredSerieCovertura', filteredSerieCovertura);
  return (
    <>
      <Helmet>
        <title>{`${CONFIG.appName}`}</title>
        <meta name="description" content="Se parte del equipo aquatech" />
        <meta name="keywords" content="react,material,kit,application,dashboard,admin,template" />
      </Helmet>

      <DashboardContent maxWidth="xl">
        <Typography variant="h3" sx={{ mb: { xs: 3, md: 5 } }}>
          Metricas Generales
        </Typography>

        <Grid container spacing={3}>
          {metrics.map((metric, index) => (
            <Grid key={index} xs={12} sm={6} md={3}>
              <GlobalCardMetrics
                title={metric.label}
                percent={metric.percentage}
                color={metric.color} // Ensure fallback to "primary"
                total={metric.total}
                icon={<img alt="icon" src={metric.icon} />}
                chart={metric.chart}
              />
            </Grid>
          ))}
          <Grid xs={12} md={12} lg={12}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Grid container spacing={3}>
                <Grid xs={12} md={6} lg={5}>
                  <Typography variant="h4">
                    <FormControl fullWidth sx={{ p: 3 }}>
                    <InputLabel id="month-select-label">Meses en Grafico</InputLabel>
                    <Select
                      labelId="month-select-label"
                      multiple
                      value={selectedMonths}
                      onChange={handleMonthChange}
                      renderValue={(selected) => selected.join(', ')}
                    >
                      {totalValues.serieCovertura.categories.map((category) => (
                        <MenuItem key={category} value={category}>
                          <Checkbox checked={selectedMonths.indexOf(category) > -1} />
                          <ListItemText primary={category} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  </Typography>
                </Grid>
                <Grid xs={12} md={6} lg={7}>
                  <Typography variant="h4">
                    <FormControl fullWidth sx={{ p: 3 }}>
                      <InputLabel id="city-select-label">Ciudades en Grafico</InputLabel>
                      <Select
                        labelId="city-select-label"
                        multiple
                        value={selectedCities}
                        onChange={handleCityChange}
                        renderValue={(selected) => selected.join(', ')}
                      >
                        {totalValues.serieCovertura.series.map((city) => (
                          <MenuItem key={city.name} value={city.name}>
                            <Checkbox checked={selectedCities.indexOf(city.name) > -1} />
                            <ListItemText primary={city.name} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Typography>
                </Grid> 
                <Grid xs={12} md={12} lg={12}>
                  <MultipleBarChart
                    title="Historico Equipos"
                    subheader="Instalaciones por mes"
                    chart={filteredSerieCovertura as ChartData}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          <Grid xs={12} md={6} lg={4}>
            <PieChart
              title={`Equipos Global - ${totalValues.totalOnline}`}
              chart={{
                series: [
                  { label: 'En Rango', value: totalValues.totalRangoOnline },
                  { label: 'Fuera de Rango', value: totalValues.totalFueraRangoOnline },
                  { label: 'Offline', value: totalValues.totalOffline },
                ],
              } as VisitData}
            />
          </Grid>
          <Grid xs={12} md={6} lg={8}>
            <SideBarChart
              title="Rango de equipos por cliente"
              chart={serieCliente as ChartData}
            />
          </Grid>
        </Grid>
      </DashboardContent>
    </>
  );
}

export default DashboardPage;

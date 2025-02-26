import type { ColorType } from 'src/theme/core/palette';

import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';

import Grid from '@mui/material/Unstable_Grid2';
import { Box, Typography, CircularProgress } from '@mui/material';

import { CONFIG } from 'src/config-global';
import { DashboardContent } from 'src/layouts/dashboard';

import { AnalyticsCurrentVisits } from './analytics/analytics-current-visits';
import { AnalyticsWebsiteVisits } from './analytics/analytics-website-visits';
import { AnalyticsWidgetSummary } from './analytics/analytics-widget-summary';
import { AnalyticsTrafficBySite } from './analytics/analytics-traffic-by-site';
import { AnalyticsCurrentSubject } from './analytics/analytics-current-subject';
import { AnalyticsConversionRates } from './analytics/analytics-conversion-rates';

// ---------------------- Interfaces ---------------------- //
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

interface TrafficBySite {
  value: string;
  label: string;
  total: number;
}

// ---------------------- Component ---------------------- //

export function DashboardPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [totalValues, setTotalValues] = useState({total: 0, totalOnline: 0, totalOffline: 0, totalRango: 0, totalRangoOnline: 0, totalFueraRango: 0, totalFueraRangoOnline: 0, totalOportunidades: 0, totalOportunidadesOnline: 0, metrics: [], serieCovertura: { categories: [], series: []}});

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await axios.get(`${CONFIG.API_BASE_URL}/dashboard`);
        console.log(response, 'response');
        const totValues = response.data;
        setTotalValues(totValues);
        const metric : Metric[] = response.data.metrics;
        setMetrics(metric);
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title> {`${CONFIG.appName}`}</title>
        <meta name="description" content="Se parte del equipo aquatech" />
        <meta name="keywords" content="react,material,kit,application,dashboard,admin,template" />
      </Helmet>

      <DashboardContent maxWidth="xl">
        <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
          General Metrics
        </Typography>

        <Grid container spacing={3}>
          {metrics.map((metric, index) => (
            <Grid key={index} xs={12} sm={6} md={3}>
              <AnalyticsWidgetSummary
                title={metric.label}
                percent={metric.percentage}
                color={metric.color} // Ensure fallback to "primary"
                total={metric.total}
                icon={<img alt="icon" src={metric.icon} />}
                chart={metric.chart}
              />
            </Grid>
          ))}

          <Grid xs={12} md={6} lg={4}>
            <AnalyticsCurrentVisits
              title={`Productos Online - ${totalValues.totalOnline}`}
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
            <AnalyticsWebsiteVisits
              title="Cobertura de Equipos por Región"
              subheader="Por region de ciudades y meses"
              chart={totalValues.serieCovertura as ChartData}
            />
          </Grid>

          {/* <Grid xs={12} md={6} lg={8}>
            <AnalyticsConversionRates
              title="Gráfico de Ventas"
              subheader="Recien logueado"
              chart={{
                categories: ['Caffenio', 'Norson', 'Bachoco', 'Prospectos'],
                series: [
                  { name: '2024', data: [44, 55, 41, 64] },
                  { name: '2025', data: [53, 32, 33, 52] },
                ],
              } as ChartData}
            />
          </Grid>

          <Grid xs={12} md={6} lg={4}>
            <AnalyticsCurrentSubject
              title="Actuales Plataformas"
              chart={{
                categories: ['Equipos Monitoreados', 'Historico', 'Cotizaciones', 'Ordenes de Compra', 'Usuarios', 'Productos'],
                series: [
                  { name: 'Caffenio', data: [80, 50, 30, 40, 100, 20] },
                  { name: 'Bachoco', data: [20, 30, 40, 80, 20, 80] },
                  { name: 'Norson', data: [44, 76, 78, 13, 43, 10] },
                ],
              } as ChartData}
            />
          </Grid>

          <Grid xs={12} md={6} lg={4}>
            <AnalyticsTrafficBySite
              title="Traffic by site"
              list={[
                { value: 'facebook', label: 'Facebook', total: 323234 },
                { value: 'google', label: 'Google', total: 341212 },
                { value: 'linkedin', label: 'Linkedin', total: 411213 },
                { value: 'twitter', label: 'Twitter', total: 443232 },
              ] as TrafficBySite[]}
            />
          </Grid>

          <Grid xs={12} md={6} lg={8}>
            <h4>Próximamente ...</h4>
          </Grid> */}
        </Grid>
      </DashboardContent>
    </>
  );
}

export default DashboardPage;

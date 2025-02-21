
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';

import Grid from '@mui/material/Unstable_Grid2';
import {Box, Typography, CircularProgress } from '@mui/material';

import { CONFIG } from 'src/config-global';
import { DashboardContent } from 'src/layouts/dashboard';

import { AnalyticsCurrentVisits } from './analytics/analytics-current-visits';
import { AnalyticsWebsiteVisits } from './analytics/analytics-website-visits';
import { AnalyticsWidgetSummary } from './analytics/analytics-widget-summary';
import { AnalyticsTrafficBySite } from './analytics/analytics-traffic-by-site';
import { AnalyticsCurrentSubject } from './analytics/analytics-current-subject';
import { AnalyticsConversionRates } from './analytics/analytics-conversion-rates';

// ----------------------------------------------------------------------

export function DashboardPage() {
  const [metrics, setMetrics] = useState([
    {
        "total": 150,
        "label": "Productos Conectados",
        "totalOnline": 0,
        "percentage": 0,
        "color": undefined,
        "icon": "",
        "chart": {"categories":['jan'], "series":[1]}
    },
    {
        "total": 100,
        "label": "Equipos en rango",
        "totalOnline": 0,
        "percentage": 1,
        "color": undefined,
        "icon": "",
        "chart": {"categories":['jan'], "series":[1]}
    },
    {
        "total": 50,
        "label": "Equipos fuera de Rango",
        "totalOnline": 0,
        "percentage": 0,
        "color": undefined,
        "icon": "",
        "chart": {"categories":['jan'], "series":[1]}
    },
    {
        "total": 200,
        "label": "Oportunidades",
        "totalOnline": 0,
        "percentage": 0,
        "color": undefined,
        "icon": "",
        "chart": {"categories":['jan'], "series":[1]}
    }
]);
  const [loading, setLoading] = useState(true);
  // const navigate = useNavigate();

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await axios.get(`${CONFIG.API_BASE_URL}/dashboard`);
        console.log(response, 'response');
        setMetrics(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
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
        <meta
          name="description"
          content="Se parte del equipo aquatech"
        />
        <meta name="keywords" content="react,material,kit,application,dashboard,admin,template" />
      </Helmet>
      <DashboardContent maxWidth="xl">
        <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
          General Metrics
        </Typography>

        <Grid container spacing={3}>

          {metrics.map((metric) => (
              <Grid xs={12} sm={6} md={3}>
                <AnalyticsWidgetSummary
                  title={metric.label}
                  percent={metric.percentage}
                  color={metric.color}
                  total={metric.total}
                  icon={<img alt="icon" src={metric.icon} />}
                  chart={metric.chart}
                />
              </Grid>

          ))}

          <Grid xs={12} md={6} lg={4}>
            <AnalyticsCurrentVisits
              title="Productos Online"
              chart={{
                series: [
                  { label: 'Caffenio', value: 1530 },
                  { label: 'Norson', value: 40 },
                  { label: 'Bachoco', value: 3 },
                ],
              }}
            />
          </Grid>

          <Grid xs={12} md={6} lg={8}>
            <AnalyticsWebsiteVisits
              title="Covertura de Equipos"
              subheader="(+43%) than last year"
              chart={{
                categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
                series: [
                  { name: 'Caffenio', data: [5, 15, 22, 37, 67, 68, 37, 24, 55] },
                  { name: 'Bachoco', data: [0, 2, 10, 11, 15, 20, 24, 25, 30] },
                ],
              }}
            />
          </Grid>

          <Grid xs={12} md={6} lg={8}>
            <AnalyticsConversionRates
              title="Grafico de Ventas"
              subheader="Recien logueado"
              chart={{
                categories: ['Caffenio', 'Norson', 'Bachoco', 'Prospectos'],
                series: [
                  { name: '2024', data: [44, 55, 41, 64] },
                  { name: '2025', data: [53, 32, 33, 52] },
                ],
              }}
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
              }}
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
              ]}
            />
          </Grid>

          <Grid xs={12} md={6} lg={8}>
            <h4>Proximamente ...</h4>
          </Grid>
        </Grid>
      </DashboardContent>
    </>
  );
}
export default DashboardPage;
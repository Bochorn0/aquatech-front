import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';

import Grid from '@mui/material/Unstable_Grid2';
import { Box, Paper, Table, Divider, TableRow, TableCell, TableBody, TableHead, Typography, TableContainer, TablePagination, CircularProgress } from '@mui/material';

import { CONFIG } from 'src/config-global';
import { DashboardContent } from 'src/layouts/dashboard';

import MexicoMap from './maps';
import { PieChart } from './charts/pie-chart';

import type { Product } from './products/types';
// ---------------------- Interfaces ---------------------- //
interface Metrics {
  title: string;
  series: [ { label: string; value: number } ];
  products: Product[];
}

// ---------------------- Component ---------------------- //

export function DashboardPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<Metrics[]>();
  const [cliente, setCliente] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        if (user) {
          setCliente(JSON.parse(user).empresa);
        }
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        const response = await axios.get(`${CONFIG.API_BASE_URL}/dashboard`);
        const { productMetrics } = response.data;
        setMetrics(productMetrics);
        // Initialize selectedCities based on initiallyHidden
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
        <title>{`${CONFIG.appName}`}</title>
      </Helmet>

      <DashboardContent maxWidth="xl">
        <Typography variant="h3" sx={{ mb: { xs: 3, md: 5 } }}>
          Dashboard de Métricas {cliente}
        </Typography>

        <Grid container spacing={3}>
          {metrics && metrics.map((metric, index) => (
            <Grid key={index} xs={12} sm={6} md={6}>
              <PieChart
              title={`${metric.title}`}
              chart={{
                series: metric.series
              } as Metrics}
              onSectionClick={(data) => {
                console.log(`Clicked on `, data);
                setSelectedTitle(`${metric.title} ${data.label} (${data.products.length})`);
                setSelectedProducts(data.products);
              }}
            />
            </Grid>
          ))}
          { selectedProducts.length > 0 && (
          <Grid xs={12} md={12} lg={12}>
            <Typography variant="h5" sx={{ mb: { xs: 3, md: 5 } }}>
              Detalle {selectedTitle}
            </Typography>
            <Divider sx={{ borderStyle: 'dashed' }} />
            <Paper sx={{ p: 2 }}>
              <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Ciudad</TableCell>
                      <TableCell align="right">Tds</TableCell>
                      <TableCell align="right">Producción</TableCell>
                      <TableCell align="right">Rechazo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedProducts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((product) => (
                      <TableRow>
                        <TableCell component="th" scope="row"> {product.name} </TableCell>
                        <TableCell>{product.city}</TableCell>
                        <TableCell>{product.status.find(s => s.code === 'tds_out')?.value || ''} ppm</TableCell>
                        <TableCell>{product.status.find(s => s.code === 'flowrate_total_1')?.value || ''} ml/min</TableCell>
                        <TableCell>{product.status.find(s => s.code === 'flowrate_total_2')?.value || ''} ml/min</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  component="div"
                  count={selectedProducts.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={(_, newPage) => setPage(newPage)}
                  onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 5))}
                />
              </TableContainer>
            </Paper>
          </Grid>
          )}
          <Grid xs={12} md={12} lg={12}>
            <Typography variant="h5" sx={{ mb: { xs: 3, md: 5 } }}>
              Desgloce por Estado
            </Typography>

            <Divider sx={{ borderStyle: 'dashed' }} />
            <Paper sx={{ p: 2 }}>
              <MexicoMap />
            </Paper>
          </Grid>
        </Grid>
      </DashboardContent>
    </>
  );
}

export default DashboardPage;

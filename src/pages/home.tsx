import type { Dayjs } from 'dayjs'; // Only import Dayjs as a type
import dayjs from 'dayjs';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';

import Grid from '@mui/material/Unstable_Grid2';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { 
  Box, Paper, Table, Select, Divider, MenuItem, TableRow, TableCell, 
  TableBody, TableHead, InputLabel, Typography, FormControl, TableContainer, 
  TablePagination, CircularProgress 
} from '@mui/material';

import { get } from 'src/api/axiosHelper';
import { CONFIG } from 'src/config-global';
import { DashboardContent } from 'src/layouts/dashboard';

import MexicoMap from './maps';
import { PieChart } from './charts/pie-chart';
import { getMetricsByProducts } from '../utils/metrix-filter';

import type { Cliente, Product, MetricsData, DashboardMetrics } from './types';
// ---------------------- Interfaces ---------------------- //

// ---------------------- Component ---------------------- //
const defaultMetric = { cliente: '', client_name: '', product_type: '', tds_range: 0, production_volume_range: 0, temperature_range: 0, rejected_volume_range: 0, flow_rate_speed_range: 0, filter_only_online: true }
export function DashboardPage() {  
  const [currentRole, setCurretRole] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedClient, setSelectedClient] = useState<string>('All');
  const [clientFilters, setClientFilters] = useState<Cliente[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<MetricsData>(defaultMetric);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics[]>([]);
  const [currentProducts, setCurrentProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [cityFilters, setCityFilters] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [startD, setStartDate] = useState<Dayjs | null>(dayjs('2024-01-01'));
  const [endD, setEndDate] = useState<Dayjs | null>(dayjs().endOf('day'));

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const user = localStorage.getItem('user');
        let firstClients: Cliente[] = [];
        if (user) {
          firstClients = await get<Cliente[]>(`/clients/`) || [];
          firstClients = firstClients.filter((client) => client.name !== 'All');
          setClientFilters(firstClients);

          const client = JSON.parse(user).cliente as Cliente;
          setSelectedClient(client.name);
          setCurretRole(JSON.parse(user).role.name);
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };
    fetchClients();
  }, []); // ✅ Run only on mount
  // ✅ Second effect: Fetch dashboard data (products/metrics), depends on selected filters
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setDashboardMetrics([]);
        setCurrentProducts([]);

        const clientId = clientFilters.find((client) => client.name === selectedClient)?._id;

        const productParams = { city: selectedCity, cliente: clientId, startDate: startD, endDate: endD };
        const response = await get<Product[]>(`/products/`, productParams);
        const productos = response || [];
        const ciudades = [...new Set(productos.map((product: Product) => product.city))] as string[];

        setCurrentProducts(productos);

        const metricsResponse = await get<MetricsData[]>(`/metrics`, { cliente: clientId });
        const metric = metricsResponse[0];

        if (metric) {
          setCurrentMetrics(metric);
          const metricsData = getMetricsByProducts(productos, metric);
          setDashboardMetrics(metricsData);
        } else {
          console.warn('No metrics data found for client');
          setDashboardMetrics([]);
        }

        setCityFilters(ciudades);
        setSelectedProducts([]);
      } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [selectedCity, selectedClient, startD, endD, clientFilters]); 



  const handleCityChange = (event: any) => {
    console.log('event', event.target.value);
    setSelectedCity(event.target.value);

  };


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
          Dashboard de Métricas en {selectedClient === 'All' ? 'Todos los clientes' : selectedClient}
        </Typography>

        <Grid container spacing={3} sx={{ background: 'white' }}>
          <Grid xs={12} md={6} lg={3}>
            <FormControl fullWidth>
              <InputLabel>Ciudad</InputLabel>
              <Select value={selectedCity} onChange={handleCityChange}>
                <MenuItem value="All">Todas</MenuItem>
                {cityFilters.map((city) => (
                  <MenuItem key={city} value={city}>{city}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} md={6} lg={3}>
            {currentRole === 'admin' && (
              <FormControl fullWidth>
                <InputLabel>Cliente</InputLabel>
                <Select value={selectedClient}  onChange={(e) => setSelectedClient(e.target.value)}>
                  <MenuItem value="All">Todos</MenuItem>
                  {clientFilters.map((cliente) => (
                    <MenuItem key={cliente._id} value={cliente.name}>{cliente.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Grid>
          <Grid xs={12} md={6} lg={3}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label="Start Date"
                value={startD}
                onChange={(newValue) => setStartDate(newValue)}
                slotProps={{ textField: { fullWidth: true } }} 
              />
            </LocalizationProvider>
          </Grid>
          <Grid xs={12} md={6} lg={3}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label="End Date"
                value={endD}
                onChange={(newValue) => setEndDate(newValue)}
                slotProps={{ textField: { fullWidth: true } }} 
              />
            </LocalizationProvider>
          </Grid>
          {dashboardMetrics && dashboardMetrics.map((metric, index) => (
            <Grid key={index} xs={12} sm={6} md={6} lg={6} xl={3}>
              <PieChart
                title={metric.title}
                chart={{ series: metric.series, colors: metric.series.map((serie) => serie.color)}}
                onSectionClick={(data) => {
                  console.log('data METRICs', data);
                  setSelectedTitle(`${metric.title} ${data.label} (${data.products.length})`);
                  console.log('data',data);
                  setSelectedColor(data.color);
                  setSelectedProducts(data.products);
                }}
              />
            </Grid>
          ))}

          {selectedProducts.length > 0 && (
            <Grid xs={12}>
              <Typography variant="h5" sx={{color: selectedColor}}>
                Detalle {selectedTitle}
              </Typography>
              <Divider sx={{ borderStyle: 'dashed' }} />
              <Paper sx={{ p: 2 }} >
                <TableContainer component={Paper}>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead >
                      <TableRow>
                        <TableCell sx={{color: '#fff', backgroundColor: selectedColor}}>Nombre</TableCell>
                        <TableCell sx={{color: '#fff', backgroundColor: selectedColor}}>Ciudad</TableCell>
                        <TableCell sx={{color: '#fff', backgroundColor: selectedColor}}>Tds</TableCell>
                        <TableCell sx={{color: '#fff', backgroundColor: selectedColor}}>Producción</TableCell>
                        <TableCell sx={{color: '#fff', backgroundColor: selectedColor}}>Rechazo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedProducts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((product) => (
                        <TableRow key={product.name}>
                          <TableCell>{product.name}</TableCell>
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
            <Divider sx={{ borderStyle: 'dashed' }} />
            <Paper sx={{ p: 2 }}>
              <MexicoMap originProducts={currentProducts} currentMetrics={currentMetrics} />
            </Paper>
          </Grid>
        </Grid>
      </DashboardContent>
    </>
  );
}

export default DashboardPage;

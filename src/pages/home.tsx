import type { Dayjs } from 'dayjs'; // Only import Dayjs as a type
import axios from 'axios';
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

import { CONFIG } from 'src/config-global';
import { DashboardContent } from 'src/layouts/dashboard';

import MexicoMap from './maps';
import { PieChart } from './charts/pie-chart';
import { getMetricsByProducts } from '../utils/metrix-filter';

import type { Product } from './products/types';
// ---------------------- Interfaces ---------------------- //
interface DashboardMetrics {
  title: string;
  series: { label: string; color: string; value: number , products: Product[]}[];
}
// ---------------------- Component ---------------------- //
export function DashboardPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [currentClient, setCurrentClient] = useState<string>('');
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics[]>([]);
  const [currentProducts, setCurrentProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [cityFilters, setCityFilters] = useState<string[]>([]);
  const [stateFilters, setStateFilters] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [selectedState, setSelectedState] = useState<string>('All');
  const [startD, setStartDate] = useState<Dayjs | null>(dayjs('2024-01-01'));
  const [endD, setEndDate] = useState<Dayjs | null>(dayjs().endOf('day'));

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setDashboardMetrics([]);
        setCurrentProducts([]);
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        let cliente = '';
        // mocked: true
        const productParams = { city: selectedCity, state: selectedState, startDate: startD, endDate: endD , cliente};
        if (user) {
          setCurrentClient(JSON.parse(user).empresa);
          const { cliente: clientName  } = JSON.parse(user);
          cliente = clientName;
          productParams.cliente = cliente;
        }
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        const response = await axios.get(`${CONFIG.API_BASE_URL}/products/`, { params: productParams });
        const productos = response.data || [];
        const ciudades = [...new Set(productos.map((product: Product) => product.city))] as string[];
        const estados = [...new Set(productos.map((product: Product) => product.state))] as string[];
        setCurrentProducts(productos);
        const metricas = await fetchMetrics(cliente);
        const metricsData = getMetricsByProducts(productos, metricas) || [];
        setDashboardMetrics([...metricsData]); // Force state update
        setCityFilters(ciudades);
        setStateFilters(estados);
        setSelectedProducts([]);
      } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchMetrics = async (cliente: string) => {
      try {
        const token = localStorage.getItem('token');
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        const metricsResponse = await axios.get(`${CONFIG.API_BASE_URL}/metrics`, { params: { cliente } });
        return metricsResponse.data[0];
      } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        return null; // Explicitly return a default value
      }
    };
    

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);

  }, [selectedCity, selectedState, startD, endD]);



  const handleCityChange = (event: any) => {
    console.log('event', event.target.value);
    setSelectedCity(event.target.value);

  };

  const handleStateChange = (event: any) => {
    console.log('event', event.target.value);
    setSelectedState(event.target.value);
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
          Dashboard de Métricas {currentClient}
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
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select value={selectedState} onChange={handleStateChange}>
                <MenuItem value="All">Todos</MenuItem>
                {stateFilters.map((state) => (
                  <MenuItem key={state} value={state}>{state}</MenuItem>
                ))}
              </Select>
            </FormControl>
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
              <MexicoMap originProducts={currentProducts} />
            </Paper>
          </Grid>
        </Grid>
      </DashboardContent>
    </>
  );
}

export default DashboardPage;

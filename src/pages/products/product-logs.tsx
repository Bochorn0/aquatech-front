import type { Dayjs } from 'dayjs'; // Only import Dayjs as a type
import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { Box, Chip, Grid, Table, Paper, TableRow, TextField, TableCell, TableBody, TableHead, Typography, TableContainer, TablePagination, CircularProgress } from '@mui/material';

import { get } from 'src/api/axiosHelper';

import type { Log } from '../types';


const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().startOf('day'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const params = {
          id,
          start_date: startDate?.valueOf(),
          end_date: endDate?.valueOf(),
          limit: 100, // puedes ajustar según el backend
        };

        const response = await get<{ success: boolean; data: Log[] }>(`/products/${id}/logs`, { params });

        if (response.success) {
          setLogs(response.data);
        } else {
          console.warn('API responded with success = false');
          setLogs([]);
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [id, startDate, endDate]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredLogs = logs.filter((log) => {
    const dateString = new Date(log.createdAt).toLocaleString();
    return dateString.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleChangePage = (_event: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Filtrar Logs</Typography>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <DateTimePicker
                label="Fecha inicio"
                value={startDate}
                onChange={setStartDate}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DateTimePicker
                label="Fecha fin"
                value={endDate}
                onChange={setEndDate}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
          </Grid>
        </LocalizationProvider>

        <TextField
          label="Buscar por fecha"
          value={searchTerm}
          onChange={handleSearchChange}
          fullWidth
          sx={{ mt: 2 }}
        />
      </Paper>

      <TableContainer component={Paper}>
        <Typography variant="h5" sx={{ p: 2 }}>Product Logs</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>TDS (ppm)</TableCell>
              <TableCell>Flujo Producción (L)</TableCell>
              <TableCell>Flujo Rechazo (L)</TableCell>
              <TableCell>Tiempo Ejecución (s)</TableCell>
              <TableCell>Origen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs.length > 0 ? (
              filteredLogs
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((log) => {
                  const tiempoEjecucion = log.tiempo_fin !== undefined && log.tiempo_inicio !== undefined
                    ? log.tiempo_fin - log.tiempo_inicio
                    : 'N/A';

                  return (
                    <TableRow key={log._id}>
                      <TableCell>{new Date(log.date).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${log.tds?.toFixed(2) ?? 'N/A'} ppm`}
                          color="default"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${log.flujo_produccion?.toFixed(2) ?? 'N/A'} L`}
                          color="success"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${log.flujo_rechazo?.toFixed(2) ?? 'N/A'} L`}
                          color="error"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${tiempoEjecucion} s`}
                          color="info"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{log.source || 'N/A'}</TableCell>
                    </TableRow>
                  );
                })
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No hay logs disponibles
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[20, 50, 100]}
          component="div"
          count={filteredLogs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Box>
  );
};

export default ProductDetail;

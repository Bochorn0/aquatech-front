import { CSVLink } from 'react-csv';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Box, Grid, Table, Paper, Button, Select, MenuItem, TableRow, TableBody, TextField, TableCell, TableHead, InputLabel, Typography, FormControl, TablePagination, CircularProgress } from '@mui/material';

import { StyledTableRow, StyledTableCell, StyledTableContainer, StyledTableCellHeader } from "src/utils/styles";

import { CONFIG } from 'src/config-global';

import type  { PuntosVenta } from './types';

// ---------------------------------------------
// 📦 COMPONENTE PRINCIPAL (v2.0 - PostgreSQL)
// ---------------------------------------------
export default function PuntoVentaTableListV2() {
  const [puntosVenta, setPuntosVenta] = useState<PuntosVenta[]>([]);
  const [filtered, setFiltered] = useState<PuntosVenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedClient, setSelectedClient] = useState('All');
  const [cityFilters, setCityFilters] = useState<string[]>([]);
  const [clientFilters, setClientFilters] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const navigate = useNavigate();

  // ---------------------------------------------
  // 🔹 Cargar datos desde API (PostgreSQL v2.0) — status y sensors_count vienen en la respuesta
  // ---------------------------------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL_V2}/puntoVentas/all`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const data: PuntosVenta[] = Array.isArray(result) ? result : (result.data || result);
        setPuntosVenta(data);
        setFiltered(data);

        const uniqueCities = Array.from(
          new Set(data.map((pv: PuntosVenta) => typeof pv.city === 'object' && pv.city !== null ? pv.city.city : '').filter(Boolean) as string[])
        );
        const uniqueClients = Array.from(
          new Set(data.map((pv: PuntosVenta) => typeof pv.cliente === 'object' && pv.cliente !== null ? pv.cliente.name : '').filter(Boolean) as string[])
        );
        setCityFilters(uniqueCities);
        setClientFilters(uniqueClients);
      } catch (error) {
        console.error('Error al obtener puntos de venta:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ---------------------------------------------
  // 🔹 Aplicar filtros y búsqueda
  // ---------------------------------------------
  useEffect(() => {
    let data = [...puntosVenta];

    if (selectedCity !== 'All') {
      data = data.filter((pv) => (typeof pv.city === 'object' && pv.city !== null ? pv.city.city : '') === selectedCity);
    }

    if (selectedClient !== 'All') {
      data = data.filter((pv) => (typeof pv.cliente === 'object' && pv.cliente !== null ? pv.cliente.name : '') === selectedClient);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (pv) =>
          pv.name.toLowerCase().includes(q) ||
          (typeof pv.cliente === 'object' && pv.cliente !== null ? pv.cliente.name : '').toLowerCase().includes(q) ||
          (typeof pv.city === 'object' && pv.city !== null ? pv.city.city : '').toLowerCase().includes(q)
      );
    }

    setFiltered(data);
  }, [searchQuery, selectedCity, selectedClient, puntosVenta]);

  // ---------------------------------------------
  // ⏳ Estado de carga
  // ---------------------------------------------
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  // ---------------------------------------------
  // 🧾 Render principal
  // ---------------------------------------------
  return (
    <>
      <Helmet>
        <title>{`Puntos de Venta V2 - ${CONFIG.appName}`}</title>
      </Helmet>

      {/* Filtros */}
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom>
          Filtrar Puntos de Venta
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Buscar punto de venta"
              fullWidth
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Ciudad</InputLabel>
              <Select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
                <MenuItem value="All">Todas</MenuItem>
                {cityFilters.map((city) => (
                  <MenuItem key={city} value={city}>
                    {city}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Cliente</InputLabel>
              <Select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
                <MenuItem value="All">Todos</MenuItem>
                {clientFilters.map((cliente) => (
                  <MenuItem key={cliente} value={cliente}>
                    {cliente}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Tabla */}
      <Box sx={{ p: 2 }}>
        <StyledTableContainer>
          <Paper elevation={3}>
            <Box sx={{ overflowX: 'auto' }}>
              <Grid container>
                <Grid item xs={12} sm={9}>
                  <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
                    Lista de Puntos de Venta ({filtered.length})
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3} textAlign="right" sx={{ p: 2 }}>
                  <CSVLink
                    data={filtered}
                    filename={`PuntosVenta_V2_${new Date().toISOString()}.csv`}
                    style={{ textDecoration: 'none' }}
                  >
                    {/* <Button variant="contained" color="primary" fullWidth>
                      Exportar CSV
                    </Button> */}
                  </CSVLink>
                </Grid>
              </Grid>

              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f4f6f8' }}>
                    <TableCell sx={{ width: 6, minWidth: 6, p: 0 }} />
                    <StyledTableCellHeader>Nombre</StyledTableCellHeader>
                    <StyledTableCellHeader>Cliente</StyledTableCellHeader>
                    <StyledTableCellHeader>Ciudad</StyledTableCellHeader>
                    <StyledTableCellHeader>Estado</StyledTableCellHeader>
                    <StyledTableCellHeader>Sensores</StyledTableCellHeader>
                    <StyledTableCellHeader>Actions</StyledTableCellHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((pv) => {
                      const puntoId = pv._id || (pv as any).id || '';
                      const status = pv.metric_status ?? 'normal';
                      const statusColor = status === 'critico' ? '#d32f2f' : status === 'preventivo' ? '#ed6c02' : '#2e7d32';
                      const formatDate = (iso: string | null | undefined) => {
                        if (!iso) return null;
                        try {
                          const d = new Date(iso);
                          return Number.isNaN(d.getTime()) ? null : d.toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                        } catch {
                          return null;
                        }
                      };
                      const lastReadingStr = formatDate(pv.last_reading_at);
                      const estadoLine1 = pv.online === true ? 'En línea' : 'Desconectado';
                      const estadoLine2 = lastReadingStr ? (pv.online ? lastReadingStr : `Últ. lectura: ${lastReadingStr}`) : null;
                      return (
                        <StyledTableRow key={puntoId}>
                          <TableCell sx={{ width: 6, minWidth: 6, p: 0, verticalAlign: 'middle' }}>
                            <Box sx={{ width: 6, minHeight: 36, height: 40, backgroundColor: statusColor, borderRadius: 0 }} />
                          </TableCell>
                          <StyledTableCell>{pv.name}</StyledTableCell>
                          <StyledTableCell>{typeof pv.cliente === 'object' && pv.cliente !== null ? pv.cliente.name : 'N/A'}</StyledTableCell>
                          <StyledTableCell>{typeof pv.city === 'object' && pv.city !== null ? pv.city.city : 'N/A'}</StyledTableCell>
                          <StyledTableCell>
                            <Box component="span" display="block">{estadoLine1}</Box>
                            {estadoLine2 && <Box component="span" display="block" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{estadoLine2}</Box>}
                          </StyledTableCell>
                          <StyledTableCell>
                            {pv.sensors_count ?? 0}
                          </StyledTableCell>
                          <StyledTableCell>
                            <Button
                                variant="contained"
                                color="inherit"
                                onClick={() => navigate(`/PuntoVenta/${puntoId}`)}
                              >
                              Detalles
                            </Button>
                          </StyledTableCell>
                        </StyledTableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </StyledTableContainer>

        <TablePagination
          component="div"
          count={filtered.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
        />
      </Box>
    </>
  );
}

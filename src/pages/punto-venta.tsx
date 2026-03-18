import { CSVLink } from 'react-csv';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Box, Grid, Chip, Table, Paper, Button, Select, MenuItem, TableRow, TableBody, TextField, TableHead, InputLabel, Typography, FormControl, TablePagination, CircularProgress } from '@mui/material';

import { StyledTableRow, StyledTableCell, StyledTableContainer, StyledTableCellHeader } from "src/utils/styles";

import { get } from "src/api/axiosHelper";
import { CONFIG } from 'src/config-global';

import type  { PuntosVenta } from './types';

// ---------------------------------------------
// 📦 COMPONENTE PRINCIPAL (v1.0 - MongoDB)
// ---------------------------------------------
export default function PuntoVentaTableList() {
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
  // 🔹 Cargar datos desde API (MongoDB v1.0)
  // ---------------------------------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use v1.0 API endpoint for MongoDB data
        const data = await get<PuntosVenta[]>('/puntoVentas/all');
        setPuntosVenta(data);
        setFiltered(data);

        // Generar filtros únicos
        const uniqueCities = Array.from(
          new Set(data.map((pv) => typeof pv.city === 'object' && pv.city !== null ? pv.city.city : '').filter(Boolean))
        );
        const uniqueClients = Array.from(
          new Set(data.map((pv) => typeof pv.cliente === 'object' && pv.cliente !== null ? pv.cliente.name : '').filter(Boolean))
        );

        setCityFilters(uniqueCities as string[]);
        setClientFilters(uniqueClients as string[]);
      } catch (error) {
        console.error('Error al obtener puntos de venta:', error);
      } finally {
        setLoading(false);
      }
    };


    // const fetchPuntosVenta = async () => {
    //   try {
    //     const response = await get<PuntosVenta[]>(`/puntoVentas/all`);

    //     // Normalizamos todos los puntos de venta
    //     const formatted = response.map((pv) => ({
    //       ...pv,
    //       cliente: pv.cliente?._id || pv.cliente,
    //       client_name: pv.cliente?.name || "",
    //       city: pv.city?._id || pv.city,
    //       city_name: pv.city?.city || "",
    //       productos: pv.productos?.map((p) => p._id) || []
    //     }));

    //     setPuntosVenta(formatted as unknown as PuntosVenta[]);

    //   } catch (error) {
    //     console.error("Error fetching puntos de venta:", error);
    //   }
    // };

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
        <title>{`Puntos de Venta - ${CONFIG.appName}`}</title>
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
              <InputLabel shrink>Ciudad</InputLabel>
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
              <InputLabel shrink>Cliente</InputLabel>
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
                    filename={`PuntosVenta_${new Date().toISOString()}.csv`}
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
                    <StyledTableCellHeader>Nombre</StyledTableCellHeader>
                    <StyledTableCellHeader>Cliente</StyledTableCellHeader>
                    <StyledTableCellHeader>Ciudad</StyledTableCellHeader>
                    <StyledTableCellHeader>Estado</StyledTableCellHeader>
                    <StyledTableCellHeader>En línea</StyledTableCellHeader>
                    <StyledTableCellHeader>Productos</StyledTableCellHeader>
                    <StyledTableCellHeader>Actions</StyledTableCellHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((pv) => (
                      <StyledTableRow key={pv._id}>
                        <StyledTableCell>{pv.name}</StyledTableCell>
                        <StyledTableCell>{typeof pv.cliente === 'object' && pv.cliente !== null ? pv.cliente.name : 'N/A'}</StyledTableCell>
                        <StyledTableCell>{typeof pv.city === 'object' && pv.city !== null ? pv.city.city : 'N/A'}</StyledTableCell>
                        <StyledTableCell>{typeof pv.city === 'object' && pv.city !== null ? pv.city.state : 'N/A'}</StyledTableCell>
                        <StyledTableCell>
                          <Chip
                            label={pv.online ? 'En línea' : 'Desconectado'}
                            size="small"
                            color={pv.online ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </StyledTableCell>
                        <StyledTableCell>
                          {pv.productos?.length ?? 0}
                        </StyledTableCell>
                        <StyledTableCell>
                          <Button
                              variant="contained"
                              color="inherit"
                              onClick={() => navigate(`/v1/PuntoVenta/${pv._id}`)}
                            >
                            Detalles
                          </Button>
                        </StyledTableCell>
                      </StyledTableRow>
                    ))}
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

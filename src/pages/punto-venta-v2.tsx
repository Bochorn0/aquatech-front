import { CSVLink } from 'react-csv';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import TableSortLabel from '@mui/material/TableSortLabel';
import Tooltip from '@mui/material/Tooltip';
import { Box, Grid, Paper, Table, Button, Select, MenuItem, TableRow, TableBody, TableCell, TableHead, TextField, InputLabel, Typography, FormControl, ToggleButton, TablePagination, CircularProgress, ToggleButtonGroup } from '@mui/material';

import { StyledTableRow, StyledTableCell, StyledTableContainer, StyledTableCellHeader } from "src/utils/styles";

import { CONFIG } from 'src/config-global';

import type  { PuntosVenta } from './types';

/** Human-readable label for sensor_type (e.g. nivel_cruda → Nivel cruda). */
function sensorTypeDisplayName(sensorType: string | null | undefined): string {
  if (!sensorType || typeof sensorType !== 'string') return 'Métrica';
  const s = sensorType.toLowerCase().replace(/^electronivel_/, 'nivel_').replace(/^level_/, 'nivel_');
  const map: Record<string, string> = {
    nivel_cruda: 'Nivel cruda',
    nivel_purificada: 'Nivel purificada',
    nivel_recuperada: 'Nivel recuperada',
    electronivel_cruda: 'Nivel cruda',
    electronivel_purificada: 'Nivel purificada',
    flujo_produccion: 'Flujo producción',
    flujo_rechazo: 'Flujo rechazo',
    eficiencia: 'Eficiencia',
    tds: 'TDS',
  };
  return map[s] || s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Build tooltip title for the status color label. */
function getStatusTooltipTitle(pv: PuntosVenta): string {
  const status = pv.metric_status ?? 'normal';
  if (status === 'normal') {
    return 'Estado normal. Las métricas están dentro del rango configurado.';
  }
  const detail = pv.metric_status_detail;
  const metricLabel = detail
    ? (detail.metric_name || sensorTypeDisplayName(detail.sensor_type))
    : 'Métrica';
  const valueStr = detail && detail.value != null ? String(Number(detail.value)) : '—';
  const hintStr = detail?.hint ? ` ${detail.hint}` : '';
  if (status === 'critico') {
    return `${metricLabel}: ${valueStr}.${hintStr ? ` ${hintStr}` : ''}`;
  }
  return `${metricLabel}: ${valueStr}.${hintStr ? ` ${hintStr}` : ''}`;
}

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
  const [statusQuickFilter, setStatusQuickFilter] = useState<'all' | 'online' | 'critico' | 'preventivo'>('all');
  const [orderBy, setOrderBy] = useState<string>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
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

    if (statusQuickFilter === 'online') {
      data = data.filter((pv) => pv.online === true);
    } else if (statusQuickFilter === 'critico') {
      data = data.filter((pv) => (pv.metric_status ?? 'normal') === 'critico');
    } else if (statusQuickFilter === 'preventivo') {
      data = data.filter((pv) => (pv.metric_status ?? 'normal') === 'preventivo');
    }

    setFiltered(data);
  }, [searchQuery, selectedCity, selectedClient, statusQuickFilter, puntosVenta]);

  // ---------------------------------------------
  // 🔹 Ordenar por columna
  // ---------------------------------------------
  const getSortValue = (pv: PuntosVenta, key: string): string | number => {
    switch (key) {
      case 'name':
        return (pv.name ?? '').toLowerCase();
      case 'cliente':
        return (typeof pv.cliente === 'object' && pv.cliente !== null ? pv.cliente.name : '').toLowerCase();
      case 'city':
        return (typeof pv.city === 'object' && pv.city !== null ? pv.city.city : '').toLowerCase();
      case 'estado':
        return pv.online === true ? 1 : 0;
      case 'sensors_count':
        return pv.sensors_count ?? 0;
      default:
        return '';
    }
  };

  const sortedRows = [...filtered].sort((a, b) => {
    const va = getSortValue(a, orderBy);
    const vb = getSortValue(b, orderBy);
    const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return order === 'asc' ? cmp : -cmp;
  });

  const handleSort = (column: string) => {
    if (orderBy === column) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(column);
      setOrder('asc');
    }
    setPage(0);
  };

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
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Quick filters
            </Typography>
            <ToggleButtonGroup
              value={statusQuickFilter}
              exclusive
              onChange={(_, v) => v != null && setStatusQuickFilter(v)}
              size="small"
            >
              <ToggleButton value="all">Todos</ToggleButton>
              <ToggleButton value="online">Solo en línea</ToggleButton>
              <ToggleButton value="critico">Solo críticos</ToggleButton>
              <ToggleButton value="preventivo">Solo preventivos</ToggleButton>
            </ToggleButtonGroup>
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
                    data={sortedRows}
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
                    <StyledTableCellHeader>
                      <TableSortLabel active={orderBy === 'name'} direction={orderBy === 'name' ? order : 'asc'} onClick={() => handleSort('name')}>
                        Nombre
                      </TableSortLabel>
                    </StyledTableCellHeader>
                    <StyledTableCellHeader>
                      <TableSortLabel active={orderBy === 'cliente'} direction={orderBy === 'cliente' ? order : 'asc'} onClick={() => handleSort('cliente')}>
                        Cliente
                      </TableSortLabel>
                    </StyledTableCellHeader>
                    <StyledTableCellHeader>
                      <TableSortLabel active={orderBy === 'city'} direction={orderBy === 'city' ? order : 'asc'} onClick={() => handleSort('city')}>
                        Ciudad
                      </TableSortLabel>
                    </StyledTableCellHeader>
                    <StyledTableCellHeader>
                      <TableSortLabel active={orderBy === 'estado'} direction={orderBy === 'estado' ? order : 'asc'} onClick={() => handleSort('estado')}>
                        Estado
                      </TableSortLabel>
                    </StyledTableCellHeader>
                    <StyledTableCellHeader>
                      <TableSortLabel active={orderBy === 'sensors_count'} direction={orderBy === 'sensors_count' ? order : 'asc'} onClick={() => handleSort('sensors_count')}>
                        Sensores
                      </TableSortLabel>
                    </StyledTableCellHeader>
                    <StyledTableCellHeader>Actions</StyledTableCellHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedRows
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
                            <Tooltip title={getStatusTooltipTitle(pv)} placement="right" arrow>
                              <Box sx={{ width: 6, minHeight: 36, height: 40, backgroundColor: statusColor, borderRadius: 0 }} />
                            </Tooltip>
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
          count={sortedRows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
        />
      </Box>
    </>
  );
}

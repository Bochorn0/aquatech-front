import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Box,
  Chip,
  Grid,
  Paper,
  Table,
  Alert,
  Button,
  TableRow,
  TableBody,
  TableHead,
  TextField,
  Typography,
  TablePagination,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';

import { fNumber } from 'src/utils/format-number';
import {
  StyledTableRow,
  StyledTableCell,
  StyledTableContainer,
  StyledTableCellHeader,
} from 'src/utils/styles';
import { get } from 'src/api/axiosHelperV2';
import { CONFIG } from 'src/config-global';

export type MeterSnapshot = {
  deviceCode?: string;
  litersForward?: number | null;
  litersReverse?: number | null;
  lastReportAt?: string | null;
  stale?: boolean;
  online?: boolean;
};

export type MeterDeviceRow = {
  id?: number;
  deviceCode?: string;
  deviceType?: string;
  isOnline?: string | boolean | number;
  valveStatus?: string | number;
  totalMetering?: number | null;
  lastConnTime?: string | null;
  installAddress?: string | null;
  snapshot?: MeterSnapshot;
  [key: string]: unknown;
};

type ListResponse = {
  success: boolean;
  message?: string;
  data?: {
    pageNum: number;
    pageSize: number;
    total: number;
    rows: MeterDeviceRow[];
  };
};

type StatusFilter = 'all' | 'online' | 'stale' | 'zero';

function isOnline(v: MeterDeviceRow['isOnline'] | boolean | undefined) {
  if (v === true) return true;
  const s = String(v ?? '').toLowerCase();
  return s === '1' || s === 'on_line' || s === 'online';
}

function formatWhen(raw?: string | null) {
  if (!raw) return '—';
  const d = new Date(String(raw).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBarColor(row: MeterDeviceRow) {
  const online = row.snapshot?.online ?? isOnline(row.isOnline);
  const liters = row.snapshot?.litersForward;
  if (online && liters != null && liters > 0) return '#2e7d32';
  if (row.snapshot?.stale || !online) return '#ed6c02';
  return '#9e9e9e';
}

function statusLabel(row: MeterDeviceRow) {
  const online = row.snapshot?.online ?? isOnline(row.isOnline);
  if (online) return { line1: 'En línea', color: 'success' as const };
  if (row.snapshot?.lastReportAt) return { line1: 'Sin actualizar', color: 'warning' as const };
  return { line1: 'Desconectado', color: 'default' as const };
}

export default function MeterPlatformListPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MeterDeviceRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await get<ListResponse>('/external-providers/meter-platform/devices', {
        pageNum: 1,
        pageSize: 100,
        enrich: true,
      });
      if (!res?.success) {
        setError(res?.message || 'No se pudo cargar la lista');
        setRows([]);
        return;
      }
      setRows(res.data?.rows || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error de red');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let data = [...rows];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      data = data.filter(
        (r) =>
          String(r.deviceCode || '').toLowerCase().includes(q)
          || String(r.deviceType || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter === 'online') {
      data = data.filter((r) => r.snapshot?.online ?? isOnline(r.isOnline));
    } else if (statusFilter === 'stale') {
      data = data.filter((r) => r.snapshot?.stale || !(r.snapshot?.online ?? isOnline(r.isOnline)));
    } else if (statusFilter === 'zero') {
      data = data.filter((r) => !r.snapshot?.litersForward);
    }
    return data;
  }, [rows, searchQuery, statusFilter]);

  return (
    <>
      <Helmet>
        <title>{`Sitios medidor (demo) - ${CONFIG.appName}`}</title>
      </Helmet>

      <Box sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">
          Demo · meter-platform · origen externo
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          Sitios
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
          Vista previa de un sitio (equivalente a punto de venta) alimentado por medidor pull, no Tuya.
          Métricas: litros acumulados, último reporte y estado de enlace. Alertas y personalización vendrán después.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              label="Buscar sitio / device code"
              fullWidth
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
            />
          </Grid>
          <Grid item xs={12} md={7}>
            <ToggleButtonGroup
              value={statusFilter}
              exclusive
              onChange={(_, v) => {
                if (v != null) {
                  setStatusFilter(v);
                  setPage(0);
                }
              }}
              size="small"
            >
              <ToggleButton value="all">Todos</ToggleButton>
              <ToggleButton value="online">En línea</ToggleButton>
              <ToggleButton value="stale">Sin actualizar</ToggleButton>
              <ToggleButton value="zero">Sin litros</ToggleButton>
            </ToggleButtonGroup>
            <Button sx={{ ml: 2 }} variant="outlined" onClick={load} disabled={loading}>
              Actualizar
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ p: 2 }}>
        <StyledTableContainer>
          <Paper elevation={3}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h5">Lista de sitios ({filtered.length})</Typography>
            </Box>
            {loading ? (
              <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f4f6f8' }}>
                    <StyledTableCellHeader sx={{ width: 8, p: 0 }} />
                    <StyledTableCellHeader>Sitio</StyledTableCellHeader>
                    <StyledTableCellHeader>Estado</StyledTableCellHeader>
                    <StyledTableCellHeader>Origen</StyledTableCellHeader>
                    <StyledTableCellHeader align="right">Litros acumulados</StyledTableCellHeader>
                    <StyledTableCellHeader align="right">Reverse (L)</StyledTableCellHeader>
                    <StyledTableCellHeader>Último reporte</StyledTableCellHeader>
                    <StyledTableCellHeader />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row) => {
                      const code = String(row.deviceCode || '');
                      const st = statusLabel(row);
                      return (
                        <StyledTableRow
                          key={code || row.id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/meter-platform/${encodeURIComponent(code)}`)}
                        >
                          <StyledTableCell sx={{ width: 8, p: 0 }}>
                            <Box sx={{ width: 6, minHeight: 40, bgcolor: statusBarColor(row) }} />
                          </StyledTableCell>
                          <StyledTableCell>
                            <Typography variant="subtitle2" sx={{ fontFamily: 'ui-monospace, monospace' }}>
                              {code}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {row.deviceType || 'Medidor'}
                            </Typography>
                          </StyledTableCell>
                          <StyledTableCell>
                            <Chip size="small" label={st.line1} color={st.color} variant="outlined" />
                          </StyledTableCell>
                          <StyledTableCell>
                            <Chip size="small" label="Externo" variant="outlined" />
                          </StyledTableCell>
                          <StyledTableCell align="right">
                            {row.snapshot?.litersForward != null
                              ? fNumber(row.snapshot.litersForward)
                              : '—'}
                          </StyledTableCell>
                          <StyledTableCell align="right">
                            {row.snapshot?.litersReverse != null
                              ? fNumber(row.snapshot.litersReverse)
                              : '—'}
                          </StyledTableCell>
                          <StyledTableCell>{formatWhen(row.snapshot?.lastReportAt || row.lastConnTime)}</StyledTableCell>
                          <StyledTableCell>
                            <Button
                              variant="contained"
                              color="inherit"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/meter-platform/${encodeURIComponent(code)}`);
                              }}
                            >
                              Detalles
                            </Button>
                          </StyledTableCell>
                        </StyledTableRow>
                      );
                    })}
                </TableBody>
              </Table>
            )}
          </Paper>
        </StyledTableContainer>
        <TablePagination
          component="div"
          count={filtered.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Box>
    </>
  );
}

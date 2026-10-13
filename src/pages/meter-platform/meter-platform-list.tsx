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
import { toLatinDisplay } from './latin-display';
import { displayVolume, volumeScaleLabel, type VolumeScale } from './meter-platform-demo';

export type MeterSnapshot = {
  deviceCode?: string;
  litersForward?: number | null;
  litersReverse?: number | null;
  rawForward?: number | null;
  rawReverse?: number | null;
  reportSuccess?: number | null;
  reportTotal?: number | null;
  voltage?: number | null;
  temperatureRaw?: number | null;
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

function formatPlatformWhen(raw?: string | null) {
  if (!raw) return '—';
  const wall = String(raw).trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (wall) return `${wall[3]}/${wall[2]}/${wall[1]} ${wall[4]}:${wall[5]}`;
  return String(raw);
}

function statusBarColor(scale: VolumeScale, row: MeterDeviceRow) {
  const online = row.snapshot?.online ?? isOnline(row.isOnline);
  if (scale !== 'as-reported') return '#ed6c02';
  const liters = row.snapshot?.litersForward;
  if (online && liters != null && liters > 0) return '#2e7d32';
  if (row.snapshot?.stale || !online) return '#ed6c02';
  return '#9e9e9e';
}

function statusLabel(row: MeterDeviceRow) {
  const online = row.snapshot?.online ?? isOnline(row.isOnline);
  const hasReading = row.totalMetering != null || row.snapshot?.litersForward != null || Boolean(row.lastConnTime);
  if (online) return { line1: 'En línea', color: 'success' as const };
  if (hasReading) return { line1: 'Sin actualizar', color: 'warning' as const };
  return { line1: 'Sin lectura', color: 'default' as const };
}

function finiteNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function listedRawM3(row: MeterDeviceRow): number | null {
  const fromReport = finiteNumber(row.snapshot?.rawForward);
  if (fromReport != null) return fromReport;
  const listed = finiteNumber(row.totalMetering);
  if (listed != null) return listed;
  const liters = finiteNumber(row.snapshot?.litersForward);
  if (liters != null) return liters / 1000;
  return null;
}

function scaleColor(scale: VolumeScale): 'warning' | 'info' | 'default' {
  if (scale === 'divided-1000') return 'warning';
  if (scale === 'integer-unverified') return 'info';
  return 'default';
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

  const peerRaw = useMemo(
    () => rows.map(listedRawM3).filter((n): n is number => n != null && n > 0),
    [rows]
  );

  const fleet = useMemo(() => {
    let online = 0;
    let withReading = 0;
    let never = 0;
    let scaleReview = 0;
    rows.forEach((row) => {
      const on = row.snapshot?.online ?? isOnline(row.isOnline);
      const raw = listedRawM3(row);
      if (on) online += 1;
      if (raw == null) never += 1;
      else withReading += 1;
      const scale = displayVolume(raw, peerRaw).scale;
      if (scale !== 'as-reported') scaleReview += 1;
    });
    return { online, withReading, never, scaleReview, total: rows.length };
  }, [rows, peerRaw]);

  return (
    <>
      <Helmet>
        <title>{`Medidores en plataforma - ${CONFIG.appName}`}</title>
      </Helmet>

      <Box sx={{ p: { xs: 2, md: 3 }, pb: 0 }}>
        <Typography variant="overline" color="text.secondary">
          Plataforma de medidores
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          Medidores
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 720 }}>
          Volumen en litros, con el m³ de origen debajo. Si un acumulado se sale del lote, la fila lo marca
          y conserva el número crudo.
        </Typography>

        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {[
            { label: 'Medidores', value: fleet.total, hint: 'en la cuenta' },
            { label: 'En línea', value: fleet.online, hint: 'reportando ahora' },
            { label: 'Con lectura', value: fleet.withReading, hint: 'tienen acumulado' },
            { label: 'Sin lectura', value: fleet.never, hint: 'aún no reportan' },
            { label: 'Escala', value: fleet.scaleReview, hint: 'hay que confirmar' },
          ].map((item) => (
            <Grid item xs={6} sm={4} md key={item.label}>
              <Paper variant="outlined" sx={{ px: 2, py: 1.5, height: '100%', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.15 }}>
                  {item.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.hint}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

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

      <Box sx={{ p: { xs: 2, md: 3 }, pt: 1 }}>
        <StyledTableContainer>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Lista ({filtered.length})
              </Typography>
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
                    <StyledTableCellHeader>Medidor</StyledTableCellHeader>
                    <StyledTableCellHeader>Estado</StyledTableCellHeader>
                    <StyledTableCellHeader>Válvula</StyledTableCellHeader>
                    <StyledTableCellHeader align="right">Volumen</StyledTableCellHeader>
                    <StyledTableCellHeader align="right">Reportes</StyledTableCellHeader>
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
                      const volume = displayVolume(listedRawM3(row), peerRaw);
                      const valve = toLatinDisplay(row.valveStatus, '—');
                      const reportTotal = row.snapshot?.reportTotal;
                      const reportSuccess = row.snapshot?.reportSuccess;
                      return (
                        <StyledTableRow
                          key={code || row.id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/meter-platform/${encodeURIComponent(code)}`)}
                        >
                          <StyledTableCell sx={{ width: 8, p: 0 }}>
                            <Box sx={{ width: 6, minHeight: 40, bgcolor: statusBarColor(volume.scale, row) }} />
                          </StyledTableCell>
                          <StyledTableCell>
                            <Typography variant="subtitle2" sx={{ fontFamily: 'ui-monospace, monospace' }}>
                              {code}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {toLatinDisplay(row.deviceType, 'Medidor')}
                            </Typography>
                          </StyledTableCell>
                          <StyledTableCell>
                            <Chip size="small" label={st.line1} color={st.color} variant="outlined" />
                          </StyledTableCell>
                          <StyledTableCell>{valve}</StyledTableCell>
                          <StyledTableCell align="right">
                            {volume.liters != null ? (
                              <Box>
                                <Typography variant="body2" fontWeight={700}>
                                  {fNumber(Math.round(volume.liters))} L
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {volume.m3?.toFixed(3)} m³
                                  {volume.scale !== 'as-reported' && volume.raw != null
                                    ? ` · crudo ${volume.raw}`
                                    : ''}
                                </Typography>
                                {volume.scale !== 'as-reported' && (
                                  <Chip
                                    size="small"
                                    color={scaleColor(volume.scale)}
                                    label={volumeScaleLabel(volume.scale)}
                                    sx={{ mt: 0.5 }}
                                  />
                                )}
                              </Box>
                            ) : (
                              '—'
                            )}
                          </StyledTableCell>
                          <StyledTableCell align="right">
                            {reportTotal != null && reportTotal > 0
                              ? `${reportSuccess ?? 0}/${reportTotal}`
                              : '—'}
                          </StyledTableCell>
                          <StyledTableCell>
                            <Typography variant="body2">
                              {formatPlatformWhen(row.snapshot?.lastReportAt || row.lastConnTime)}
                            </Typography>
                          </StyledTableCell>
                          <StyledTableCell>
                            <Button
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/meter-platform/${encodeURIComponent(code)}`);
                              }}
                            >
                              Abrir
                            </Button>
                          </StyledTableCell>
                        </StyledTableRow>
                      );
                    })}
                </TableBody>
              </Table>
            )}
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
          </Paper>
        </StyledTableContainer>
      </Box>
    </>
  );
}

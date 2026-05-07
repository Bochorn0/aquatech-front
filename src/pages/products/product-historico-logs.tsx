import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
import { useRef, useMemo, useState, useEffect } from 'react';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import {
  Box,
  Chip,
  Grid,
  Alert,
  Paper,
  Stack,
  Table,
  Button,
  Divider,
  TableRow,
  Collapse,
  TableBody,
  TableCell,
  TableHead,
  TextField,
  Typography,
  ToggleButton,
  TableContainer,
  TablePagination,
  CircularProgress,
  ToggleButtonGroup,
} from '@mui/material';

import { get } from 'src/api/axiosHelper';

import {
  type HistoricoViewMode,
  buildHistoricoTableRows,
} from './product-historico-view-utils';

import type { Log } from '../types';

type HistoricoApiResponse = {
  success: boolean;
  data?: Log[];
  message?: string;
  code?: string;
  inserted_count?: number;
  skipped_duplicates?: number;
  /** True when this request pulled from Tuya API (costs quota). */
  refresh_tuya_performed?: boolean;
  tuya?: {
    warnings?: { code?: string; page?: number; error?: string; tuya_code?: number }[];
    codes_queried?: string[];
  };
  meta?: {
    max_range_ms?: number;
    start_ms?: number;
    end_ms?: number;
    row_limit?: number;
    data_source?: string;
    /** Presente en API actual: true si este request invocó Tuya (inserts); false si solo DB. */
    tuya_api_called?: boolean;
    refresh_tuya_performed?: boolean;
  };
};

type ProductHistoricoLogsProps = {
  routineEnabled: boolean;
};

type HistoricoDaysSummaryResponse = {
  success: boolean;
  items?: { day: string; logs_count: number }[];
  meta?: { total_days?: number; total_logs?: number };
  message?: string;
};

dayjs.extend(utc);

/** Corto por defecto para no disparar rate limits Tuya (ej. 40000309) en trial. */
const DEFAULT_HISTORICO_RANGE_MINUTES = 20;

function getDefaultHistoricoRange(): { start: Dayjs; end: Dayjs } {
  const end = dayjs();
  return { start: end.subtract(DEFAULT_HISTORICO_RANGE_MINUTES, 'minute'), end };
}

const PRESETS: { label: string; getRange: () => { start: Dayjs; end: Dayjs } }[] = [
  {
    label: 'Últimos 20 min',
    getRange: getDefaultHistoricoRange,
  },
  {
    label: 'Hoy',
    getRange: () => ({ start: dayjs().startOf('day'), end: dayjs() }),
  },
  {
    label: 'Últimos 3 días',
    getRange: () => ({ start: dayjs().subtract(3, 'day').startOf('day'), end: dayjs() }),
  },
  {
    label: 'Última semana',
    getRange: () => ({ start: dayjs().subtract(7, 'day').startOf('day'), end: dayjs() }),
  },
  {
    label: 'Último mes',
    // Exactamente 31 días hacia atrás para no rebasar el tope Tuya por horas extra del startOf('day').
    getRange: () => ({ start: dayjs().subtract(31, 'day'), end: dayjs() }),
  },
];

const ProductHistoricoLogs: React.FC<ProductHistoricoLogsProps> = ({ routineEnabled }) => {
  const { id } = useParams<{ id: string }>();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [startDate, setStartDate] = useState<Dayjs | null>(() => getDefaultHistoricoRange().start);
  const [endDate, setEndDate] = useState<Dayjs | null>(() => getDefaultHistoricoRange().end);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiCode, setApiCode] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<{
    inserted: number;
    skippedDuplicates: number;
    rowsInResponse: number;
    fetchedAt: number;
    refreshTuyaPerformed: boolean;
  } | null>(null);
  const [tuyaNotes, setTuyaNotes] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<HistoricoViewMode>('raw');
  const [showDaysHelper, setShowDaysHelper] = useState(false);
  const [daysHelperLoading, setDaysHelperLoading] = useState(false);
  const [daysHelperError, setDaysHelperError] = useState<string | null>(null);
  const [daysHelperRows, setDaysHelperRows] = useState<{ day: string; logs_count: number }[]>([]);
  const [daysHelperTotals, setDaysHelperTotals] = useState<{ totalDays: number; totalLogs: number } | null>(null);

  /** Descarta respuestas obsoletas si el usuario lanzó otra petición (p. ej. Tuya lento y luego solo local). */
  const historicoRequestId = useRef(0);

  const now = dayjs();
  const safeStart = startDate?.isAfter(now) ? now : startDate;
  const safeEnd = endDate?.isAfter(now) ? now : endDate;

  const applyPreset = (getRange: () => { start: Dayjs; end: Dayjs }) => {
    const { start, end } = getRange();
    setStartDate(start);
    setEndDate(end);
  };

  const fetchHistorico = async (refreshTuya: boolean) => {
    if (!id || !routineEnabled) return;
    historicoRequestId.current += 1;
    const myId = historicoRequestId.current;
    setLoading(true);
    setApiError(null);
    setApiCode(null);
    setLastSync(null);
    setTuyaNotes(null);
    try {
      /** Query plana: `get` pasa esto directo a Axios `params` (no anidar otra llave `params`). */
      const query: Record<string, string | number> = {
        start_date: safeStart?.utc().valueOf() as number,
        end_date: safeEnd?.utc().valueOf() as number,
        limit: 2000,
      };
      if (refreshTuya) {
        query.refresh_tuya = '1';
      }
      const response = await get<HistoricoApiResponse>(
        `/products/${encodeURIComponent(id)}/logs/historico`,
        query
      );

      if (myId !== historicoRequestId.current) {
        return;
      }

      if (response.success && Array.isArray(response.data)) {
        const rows = response.data as Log[];
        setLogs(rows);
        const ranTuyaRefresh =
          response.meta?.tuya_api_called ??
          response.refresh_tuya_performed ??
          response.meta?.refresh_tuya_performed ??
          refreshTuya;
        setLastSync({
          inserted: Number(response.inserted_count) || 0,
          skippedDuplicates: Number(response.skipped_duplicates) || 0,
          rowsInResponse: rows.length,
          fetchedAt: Date.now(),
          refreshTuyaPerformed: !!ranTuyaRefresh,
        });
        const w = response.tuya?.warnings;
        /** Avisos Tuya solo cuando esta respuesta incluyó llamada a la nube (`tuya_api_called` o equivalente). */
        if (Boolean(ranTuyaRefresh) && Array.isArray(w) && w.length > 0) {
          setTuyaNotes(
            w
              .map((x) => {
                const code = x.code ?? '?';
                const msg = x.error ?? 'error';
                const tc = x.tuya_code != null ? ` (${x.tuya_code})` : '';
                if (String(x.tuya_code) === '40000309' || /too frequent|demasiado frecuente/i.test(msg)) {
                  return `[${code}] ${msg}${tc} — espere 1–2 min entre actualizaciones amplias.`;
                }
                return `[${code}] ${msg}${tc}`;
              })
              .join(' · ')
          );
        } else {
          setTuyaNotes(null);
        }
        setInitialized(true);
      } else {
        setLogs([]);
        setApiError(response.message ?? 'No se pudieron obtener los datos');
      }
    } catch (error: unknown) {
      if (myId !== historicoRequestId.current) {
        return;
      }
      const err = error as { response?: { data?: { message?: string; code?: string } }; message?: string };
      const body = err.response?.data;
      setLogs([]);
      setApiError(body?.message ?? err.message ?? 'Error al consultar histórico');
      setApiCode(body?.code ?? null);
    } finally {
      if (myId === historicoRequestId.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (id && routineEnabled) {
      fetchHistorico(false);
    } else {
      setInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when id / flag available
  }, [id, routineEnabled]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const fetchDaysHelper = async () => {
    if (!id || !routineEnabled) return;
    setDaysHelperLoading(true);
    setDaysHelperError(null);
    try {
      const res = await get<HistoricoDaysSummaryResponse>(
        `/products/${encodeURIComponent(id)}/logs/historico-days-summary`
      );
      if (!res?.success) {
        setDaysHelperRows([]);
        setDaysHelperTotals(null);
        setDaysHelperError(res?.message ?? 'No se pudo cargar el detalle por día');
        return;
      }
      const rows = Array.isArray(res.items) ? res.items : [];
      setDaysHelperRows(rows);
      const totalLogs =
        Number(res.meta?.total_logs) ||
        rows.reduce((acc, row) => acc + (Number(row.logs_count) || 0), 0);
      setDaysHelperTotals({
        totalDays: Number(res.meta?.total_days) || rows.length,
        totalLogs,
      });
    } catch (e) {
      setDaysHelperRows([]);
      setDaysHelperTotals(null);
      setDaysHelperError(e instanceof Error ? e.message : 'Error al cargar detalle por día');
    } finally {
      setDaysHelperLoading(false);
    }
  };

  const toggleDaysHelper = async () => {
    const next = !showDaysHelper;
    setShowDaysHelper(next);
    if (next && !daysHelperLoading && daysHelperRows.length === 0 && !daysHelperError) {
      await fetchDaysHelper();
    }
  };

  const filteredLogs = logs.filter((log) => {
    const dateString = new Date(log.date).toLocaleString();
    return dateString.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const displayRows = useMemo(
    () => buildHistoricoTableRows(filteredLogs, viewMode),
    [filteredLogs, viewMode]
  );

  useEffect(() => {
    setPage(0);
  }, [viewMode, searchTerm, logs.length]);

  const handleChangePage = (_event: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (!routineEnabled) {
    return (
      <Box sx={{ p: 0, pt: 2 }}>
        <Alert severity="info">
          <Typography variant="body2">
            El histórico Tuya desde esta vista requiere que el equipo esté incluido en la rutina de logs.
            Active &quot;rutina de logs&quot; en Personalización → Productos rutina logs para este equipo; luego
            vuelva a abrir esta pestaña.
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (!initialized && loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 0, pt: 2 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Histórico Tuya (totales + TDS)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          La tabla muestra <strong>datos ya guardados en la base</strong> (<code>product_logs</code>) en el rango elegido:
          sin llamar a Tuya. <strong>Obtener datos locales</strong> solo consulta la base.{' '}
          <strong>Obtener de Tuya</strong> llama a la nube (códigos <code>flowrate_total_1</code>,{' '}
          <code>flowrate_total_2</code>, <code>tds_out</code>), guarda lo nuevo y muestra el mismo rango desde la base.
          Ventana inicial: últimos {DEFAULT_HISTORICO_RANGE_MINUTES} minutos.
        </Typography>

        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
            {apiCode ? ` (${apiCode})` : ''}
          </Alert>
        )}

        {tuyaNotes && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {tuyaNotes}
          </Alert>
        )}

        {lastSync && !apiError &&
          (lastSync.refreshTuyaPerformed ? (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mb: 2,
                bgcolor: 'action.hover',
                borderColor: 'success.light',
              }}
            >
              <Typography variant="subtitle2" color="success.dark" gutterBottom>
                Sincronización con Tuya y lectura desde la base
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Los duplicados son normales: misma marca de tiempo que ya teníamos guardada.
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
                <Chip
                  size="small"
                  color="success"
                  variant="filled"
                  label={`${lastSync.inserted.toLocaleString('es-MX')} nuevas guardadas`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${lastSync.skippedDuplicates.toLocaleString('es-MX')} ya existían (omitidas)`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${lastSync.rowsInResponse.toLocaleString('es-MX')} filas mostradas (desde BD)`}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
                Consulta:{' '}
                {new Date(lastSync.fetchedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'medium' })}
              </Typography>
            </Paper>
          ) : (
            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.hover', borderColor: 'divider' }}>
              <Typography variant="subtitle2" gutterBottom>
                Historial desde la base de datos
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Esta carga no llamó a Tuya. Pulse <strong>Obtener de Tuya</strong> cuando quiera traer puntos nuevos del
                periodo seleccionado.
              </Typography>
              <Chip
                size="small"
                variant="outlined"
                label={`${lastSync.rowsInResponse.toLocaleString('es-MX')} registros en el rango`}
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
                Consulta:{' '}
                {new Date(lastSync.fetchedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'medium' })}
              </Typography>
            </Paper>
          ))}

        <Divider sx={{ mb: 2 }} />

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <DateTimePicker
                label="Fecha inicio"
                value={startDate}
                onChange={setStartDate}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DateTimePicker
                label="Fecha fin"
                value={endDate}
                onChange={setEndDate}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={6}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  variant="contained"
                  onClick={() => fetchHistorico(false)}
                  disabled={loading}
                  fullWidth
                  sx={{ flex: 1 }}
                >
                  {loading ? 'Cargando…' : 'Obtener datos locales'}
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => fetchHistorico(true)}
                  disabled={loading}
                  fullWidth
                  sx={{ flex: 1 }}
                  title="Llama a la API Tuya y escribe en la base; puede tener límites de frecuencia"
                >
                  {loading ? '…' : 'Obtener de Tuya'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </LocalizationProvider>

        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', mr: 1 }}>
            Rangos rápidos:
          </Typography>
          {PRESETS.map((p) => (
            <Chip
              key={p.label}
              label={p.label}
              variant="outlined"
              size="small"
              onClick={() => applyPreset(p.getRange)}
            />
          ))}
        </Stack>

        <TextField
          label="Buscar por fecha"
          value={searchTerm}
          onChange={handleSearchChange}
          fullWidth
          sx={{ mt: 2 }}
        />

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Vista de datos
          </Typography>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            size="small"
            onChange={(_e, v) => v != null && setViewMode(v)}
            aria-label="Vista histórico"
          >
            <ToggleButton value="raw">Por registro</ToggleButton>
            <ToggleButton value="hour">Por hora</ToggleButton>
            <ToggleButton value="day">Por día</ToggleButton>
            <ToggleButton value="first_last">Primera vs última</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            En <strong>por hora</strong> y <strong>por día</strong>, los volúmenes son Δ del contador acumulado
            (última muestra − primera en ese periodo). TDS muestra trayectoria y rango en el bucket. «Primera vs
            última» resume todo el conjunto cargado (mismo criterio de Δ).
          </Typography>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <Button variant="text" size="small" onClick={toggleDaysHelper}>
              {showDaysHelper ? 'Ocultar detalle de días' : 'Ver detalle de días con información'}
            </Button>
            {showDaysHelper && (
              <Button
                variant="outlined"
                size="small"
                onClick={fetchDaysHelper}
                disabled={daysHelperLoading}
              >
                {daysHelperLoading ? 'Actualizando…' : 'Actualizar detalle'}
              </Button>
            )}
          </Stack>

          <Collapse in={showDaysHelper}>
            <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, borderColor: 'divider', bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" gutterBottom>
                Ayuda: días con información en base de datos (global)
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Este resumen muestra cuántos logs existen por día para detectar huecos de captura y decidir qué rango sincronizar.
              </Typography>

              {daysHelperError && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  {daysHelperError}
                </Alert>
              )}

              {daysHelperTotals && !daysHelperLoading && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {`${daysHelperTotals.totalDays.toLocaleString('es-MX')} días con datos · ${daysHelperTotals.totalLogs.toLocaleString('es-MX')} logs totales`}
                </Typography>
              )}

              {daysHelperLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={22} />
                </Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Día</TableCell>
                      <TableCell align="right">Logs</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {daysHelperRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} align="center">
                          No hay días registrados aún.
                        </TableCell>
                      </TableRow>
                    ) : (
                      daysHelperRows.slice(0, 45).map((row) => (
                        <TableRow key={row.day}>
                          <TableCell>
                            {new Date(row.day).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </TableCell>
                          <TableCell align="right">
                            {Number(row.logs_count || 0).toLocaleString('es-MX')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </Paper>
          </Collapse>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Box sx={{ p: 2, pb: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1 }}>
          <Typography variant="h5" component="span">
            Registros almacenados
          </Typography>
          {!loading && logs.length > 0 && (
            <Typography variant="body2" color="text.secondary" component="span">
              {viewMode !== 'raw'
                ? `${displayRows.length.toLocaleString('es-MX')} filas (${viewMode === 'first_last' ? 'resumen' : 'agrupadas'}) · base: ${
                    filteredLogs.length === logs.length
                      ? `${logs.length.toLocaleString('es-MX')} puntos`
                      : `${filteredLogs.length.toLocaleString('es-MX')} filtrados de ${logs.length.toLocaleString('es-MX')}`
                  }`
                : filteredLogs.length === logs.length
                  ? `${logs.length.toLocaleString('es-MX')} en el rango`
                  : `${filteredLogs.length.toLocaleString('es-MX')} filtradas de ${logs.length.toLocaleString('es-MX')}`}
            </Typography>
          )}
        </Box>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        <Table>
          <TableHead>
            <TableRow>
              {viewMode === 'raw' ? (
                <>
                  <TableCell>Fecha</TableCell>
                  <TableCell>TDS (ppm)</TableCell>
                  <TableCell>Volumen producción (L)</TableCell>
                  <TableCell>Volumen rechazo (L)</TableCell>
                  <TableCell>Origen</TableCell>
                </>
              ) : (
                <>
                  <TableCell>Periodo</TableCell>
                  <TableCell align="right">Muestras</TableCell>
                  <TableCell>TDS</TableCell>
                  <TableCell>Volumen producción</TableCell>
                  <TableCell>Volumen rechazo</TableCell>
                  <TableCell>Detalle</TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && filteredLogs.length > 0 ? (
              (() => {
                const start = page * rowsPerPage;
                const slice = displayRows.slice(start, start + rowsPerPage);
                return slice.map((row, idx) => {
                  const orig =
                    viewMode === 'raw' ? (filteredLogs[start + idx] as Log | undefined) : undefined;
                  return (
                    <TableRow key={row.key}>
                      <TableCell>
                        {viewMode === 'raw'
                          ? (orig ? new Date(orig.date).toLocaleString() : row.periodLabel)
                          : row.periodLabel}
                      </TableCell>
                      {viewMode === 'raw' && orig ? (
                        <>
                          <TableCell>
                            <Chip
                              label={orig.tds != null ? `${Number(orig.tds).toFixed(2)} ppm` : 'N/A'}
                              color="default"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={
                                orig.production_volume != null
                                  ? `${Number(orig.production_volume).toFixed(2)} L`
                                  : 'N/A'
                              }
                              color="success"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={
                                orig.rejected_volume != null
                                  ? `${Number(orig.rejected_volume).toFixed(2)} L`
                                  : 'N/A'
                              }
                              color="error"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{orig.source || '—'}</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell align="right">{row.samples.toLocaleString('es-MX')}</TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.tdsSummary}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.productionSummary}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.rejectionSummary}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {row.detail ?? '—'}
                            </Typography>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                });
              })()
            ) : (
              !loading && (
                <TableRow>
                  <TableCell colSpan={viewMode === 'raw' ? 5 : 6} align="center">
                    No hay registros para el rango seleccionado
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[20, 50, 100]}
          component="div"
          count={displayRows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Box>
  );
};

ProductHistoricoLogs.propTypes = {
  routineEnabled: PropTypes.bool.isRequired,
};

export default ProductHistoricoLogs;

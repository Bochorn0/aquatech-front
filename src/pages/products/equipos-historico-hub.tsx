import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Box,
  Alert,
  Paper,
  Table,
  Button,
  Dialog,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';

import { CONFIG } from 'src/config-global';
import { get, post } from 'src/api/axiosHelper';

import type { Product } from '../types';

type HubSummaryItem = {
  product_id: string;
  eligible: boolean;
  reason?: string;
  log_count?: number;
  min_date?: string | null;
  max_date?: string | null;
  distinct_calendar_days?: number;
  calendar_span_days?: number;
};

type HubDailyBreakdownItem = {
  day: string;
  logs_count: number;
};

type HubDailyBreakdownResponse = {
  success: boolean;
  items?: HubDailyBreakdownItem[];
  meta?: { total_days?: number; total_logs?: number };
  message?: string;
};

function formatShortDateTime(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

function isHistoricoEligible(p: Product) {
  const t = String(p.product_type ?? 'Osmosis').toLowerCase();
  return t === 'osmosis' && !!p.tuya_logs_routine_enabled;
}

/** Hub: lista de equipos Osmosis con acceso rápido a la ruta dedicada `/Equipos/:id/historico`. */
export default function EquiposHistoricoHubPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [summaryById, setSummaryById] = useState<Record<string, HubSummaryItem>>({});
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [daysModalOpen, setDaysModalOpen] = useState(false);
  const [daysModalProduct, setDaysModalProduct] = useState<{ id: string; name: string } | null>(null);
  const [daysRows, setDaysRows] = useState<HubDailyBreakdownItem[]>([]);
  const [daysLoading, setDaysLoading] = useState(false);
  const [daysError, setDaysError] = useState<string | null>(null);
  const [daysTotals, setDaysTotals] = useState<{ total_days: number; total_logs: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await get<Product[]>('/products/', {
          city: 'All',
          drive: 'All',
          status: 'All',
        });
        if (!cancelled) {
          setProducts(Array.isArray(rows) ? rows.filter(isHistoricoEligible) : []);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error cargando equipos';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (products.length === 0) {
      setSummaryById({});
      setSummaryError(null);
      return () => {};
    }
    let cancelled = false;
    const run = async () => {
      setSummaryLoading(true);
      setSummaryError(null);
      try {
        const res = await post<{ success: boolean; items?: HubSummaryItem[]; message?: string }>(
          '/products/logs/historico-hub-summary',
          { product_ids: products.map((p) => p.id) }
        );
        if (cancelled) return;
        if (!res?.success || !Array.isArray(res.items)) {
          setSummaryError(res?.message ?? 'No se pudieron cargar las métricas del histórico');
          setSummaryById({});
          return;
        }
        const next = res.items.reduce<Record<string, HubSummaryItem>>((acc, it) => {
          if (it?.product_id) acc[it.product_id] = it;
          return acc;
        }, {});
        setSummaryById(next);
      } catch (e) {
        if (!cancelled) {
          setSummaryById({});
          setSummaryError(e instanceof Error ? e.message : 'Error métricas histórico');
        }
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [products]);

  const closeDaysModal = () => {
    setDaysModalOpen(false);
    setDaysModalProduct(null);
    setDaysRows([]);
    setDaysTotals(null);
    setDaysError(null);
    setDaysLoading(false);
  };

  const openDaysModal = async (product: Product) => {
    setDaysModalOpen(true);
    setDaysModalProduct({ id: product.id, name: product.name ?? 'Equipo' });
    setDaysRows([]);
    setDaysTotals(null);
    setDaysError(null);
    setDaysLoading(true);
    try {
      const res = await get<HubDailyBreakdownResponse>(
        `/products/${encodeURIComponent(product.id)}/logs/historico-days-summary`
      );
      if (!res?.success) {
        setDaysError(res?.message ?? 'No se pudo cargar el detalle por día');
        return;
      }
      const items = Array.isArray(res.items) ? res.items : [];
      setDaysRows(items);
      setDaysTotals({
        total_days: Number(res.meta?.total_days) || items.length,
        total_logs:
          Number(res.meta?.total_logs) ||
          items.reduce((acc, row) => acc + (Number(row.logs_count) || 0), 0),
      });
    } catch (e) {
      setDaysError(e instanceof Error ? e.message : 'Error al cargar detalle por día');
    } finally {
      setDaysLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{`Histórico Tuya (equipos) - ${CONFIG.appName}`}</title>
      </Helmet>
      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <Button variant="outlined" component="a" href="/Equipos">
            Volver a Equipos
          </Button>
          <Typography variant="h5" component="span">
            Histórico Tuya
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Sólo aparecen equipos Osmosis con rutina de logs Tuya activa (Personalización → Productos rutina logs). Las columnas numéricas resumen lo guardado en la tabla{' '}
          <Box component="code" sx={{ fontSize: '0.85em' }}>product_logs</Box> por equipo (device ids enlazados al producto): sirven como tablero antes de abrir el detalle.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {!loading && summaryError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {summaryError}
          </Alert>
        )}

        <Paper sx={{ overflow: 'auto' }}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
              <CircularProgress />
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Equipo</TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>Ciudad</TableCell>
                  <TableCell align="right">Registros</TableCell>
                  <TableCell align="right">Días con datos</TableCell>
                  <TableCell align="right">Amplitud (días)</TableCell>
                  <TableCell>Desde → hasta</TableCell>
                  <TableCell align="right">Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No hay equipos Osmosis con rutina de logs activa en su alcance actual. Actívela en
                      Personalización si aplica.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((p) => {
                    const s = summaryById[p.id];
                    const hasStats = !!(s?.eligible === true && !summaryLoading);
                    const withData =
                      !!(s?.eligible === true && (s.log_count ?? 0) > 0 && !summaryLoading);

                    const metricSpinner = summaryLoading ? <CircularProgress size={18} /> : null;

                    return (
                      <TableRow key={p.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{p.name ?? '—'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" component="code" sx={{ wordBreak: 'break-all' }}>
                            {p.id}
                          </Typography>
                        </TableCell>
                        <TableCell>{p.city ?? '—'}</TableCell>
                        <TableCell align="right">
                          {metricSpinner ??
                            (!hasStats && !summaryLoading ? '—' : (s?.log_count ?? 0).toLocaleString('es-MX'))}
                        </TableCell>
                        <TableCell align="right">
                          {metricSpinner ??
                            (!hasStats && !summaryLoading
                              ? '—'
                              : withData
                                ? (s?.distinct_calendar_days ?? 0).toLocaleString('es-MX')
                                : '0')}
                          <Box sx={{ mt: 0.5 }}>
                            <Button
                              size="small"
                              variant="text"
                              disabled={!withData}
                              onClick={() => openDaysModal(p)}
                            >
                              Ver días
                            </Button>
                          </Box>
                        </TableCell>
                        <TableCell align="right" title="Días calendario entre primera y última muestra guardada">
                          {metricSpinner ??
                            (!hasStats && !summaryLoading
                              ? '—'
                              : withData
                                ? (s?.calendar_span_days ?? 0).toLocaleString('es-MX')
                                : '0')}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 260 }}>
                          {summaryLoading ? (
                            <CircularProgress size={18} />
                          ) : withData ? (
                            <Typography
                              variant="caption"
                              component="span"
                              display="block"
                              sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                              title={`${formatShortDateTime(s?.min_date)} — ${formatShortDateTime(s?.max_date)}`}
                            >
                              {formatShortDateTime(s?.min_date)} → {formatShortDateTime(s?.max_date)}
                            </Typography>
                          ) : hasStats ? (
                            <Typography variant="caption" color="text.secondary">
                              Sin muestras aún en BD
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() =>
                              navigate(`/Equipos/${encodeURIComponent(p.id)}/historico`)
                            }
                          >
                            Abrir histórico
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </Paper>

        <Dialog open={daysModalOpen} onClose={closeDaysModal} fullWidth maxWidth="sm">
          <DialogTitle>
            Días con información {daysModalProduct ? `— ${daysModalProduct.name}` : ''}
          </DialogTitle>
          <DialogContent dividers>
            {daysLoading ? (
              <Box display="flex" justifyContent="center" py={3}>
                <CircularProgress />
              </Box>
            ) : daysError ? (
              <Alert severity="error">{daysError}</Alert>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {daysTotals
                    ? `${daysTotals.total_days.toLocaleString('es-MX')} días con datos · ${daysTotals.total_logs.toLocaleString('es-MX')} logs totales`
                    : 'Detalle por día en product_logs'}
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Día</TableCell>
                      <TableCell align="right">Logs</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {daysRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} align="center">
                          No hay registros diarios para este equipo.
                        </TableCell>
                      </TableRow>
                    ) : (
                      daysRows.map((row) => (
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
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDaysModal}>Cerrar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}

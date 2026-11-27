import { useState, useEffect } from 'react';

import { Box, Card, Grid, Alert, Stack, Button, Typography, ToggleButton, CircularProgress, ToggleButtonGroup } from '@mui/material';

import { fNumber } from 'src/utils/format-number';
import { isTodoEnUnoType } from 'src/utils/product-types';

import { get as getV2 } from 'src/api/axiosHelperV2';

import { MultipleBarChart } from '../charts/multiple-bar-chart';

import type { Product } from '../types';

const GROUPS = [
  {
    title: 'Presiones',
    unit: 'PSI',
    rows: [
      { label: 'Presión 1 entrada', codes: ['pressure_in', 'presion_in'], series: 'Presión Entrada' },
      { label: 'Presión 2', codes: ['pressure_2', 'presion_2'], series: '' },
      { label: 'Presión 3', codes: ['pressure_3', 'presion_3'], series: '' },
      { label: 'Presión 4', codes: ['pressure_4', 'presion_4'], series: '' },
      { label: 'Presión 5', codes: ['pressure_5', 'presion_5'], series: '' },
    ],
  },
  {
    title: 'Flujos',
    unit: 'L/min',
    rows: [
      { label: 'Flujo 1 entrada cruda', codes: ['flujo_entrada', 'caudal_entrada'], series: '' },
      { label: 'Flujo 2 tienda cruda', codes: ['caudal_cruda', 'caudal_cruda_lmin'], series: 'Caudal Cruda' },
      { label: 'Flujo 3 producción', codes: ['flujo_produccion', 'flowrate_speed_1'], series: '' },
      { label: 'Flujo 4 rechazo', codes: ['flujo_rechazo', 'flowrate_speed_2'], series: '' },
      { label: 'Flujo 5 tienda purificada', codes: ['flujo_purificada', 'caudal_purificada'], series: '' },
    ],
  },
  {
    title: 'Relevadores',
    unit: '',
    rows: [
      { label: 'Relevador 1 bomba', codes: ['relay_1', 'bomba'], series: '' },
      { label: 'Relevador 2 cloro', codes: ['relay_2', 'cloro'], series: '' },
      { label: 'Relevador 3 flush', codes: ['relay_3', 'flush'], series: '' },
    ],
  },
];

const REPORT_SERIES = ['Presión Entrada', 'Caudal Cruda', 'Acumulado Cruda'];

type PuntoRow = { id?: string; _id?: string; name?: string; codigo_tienda?: string; code?: string; product_type?: string };
type Reading = { code?: string; label?: string; value?: number | string | null };
type SeriesRow = { time_bucket?: string; avg_value?: number | string | null };

function readingOf(status: Reading[], codes: string[]) {
  const found = status.find((sensor) => codes.some((code) => String(sensor.code || '').toLowerCase() === code || String(sensor.label || '').toLowerCase() === code));
  if (found?.value == null || found.value === '') return null;
  return found.value;
}

function asList(payload: unknown): PuntoRow[] {
  if (Array.isArray(payload)) return payload;
  const data = (payload as { data?: unknown })?.data;
  return Array.isArray(data) ? data as PuntoRow[] : [];
}

export function TodoEnUnoPanel({ product }: { product: Product }) {
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [punto, setPunto] = useState<PuntoRow | null>(null);
  const [status, setStatus] = useState<Reading[]>([]);
  const [range, setRange] = useState<'today' | 'week'>('today');
  const [chartLoading, setChartLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [series, setSeries] = useState<{ name: string; data: number[] }[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getV2<unknown>('/puntoVentas/all')
      .then(async (payload) => {
        if (cancelled) return;
        const list = asList(payload);
        const match = list.find((row) => isTodoEnUnoType(row.product_type)) || null;
        setPunto(match);
        if (!match) {
          setStatus([]);
          setNote('Marca el punto de venta como Todo en uno para ver sus lecturas y el reporte.');
          return;
        }
        const puntoId = String(match.id || match._id || '');
        const detail = await getV2<{ data?: { productos?: { status?: Reading[]; product_type?: string }[] } }>(`/puntoVentas/${encodeURIComponent(puntoId)}?light=1`);
        const productos = detail?.data?.productos || [];
        const reported = productos.find((item) => isTodoEnUnoType(item.product_type)) || productos[0];
        if (!cancelled) {
          setStatus(Array.isArray(reported?.status) ? reported.status : []);
          setNote('');
        }
      })
      .catch(() => {
        if (!cancelled) setNote('No se pudo cargar el reporte del punto de venta.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product._id, product.id, product.device_id]);

  useEffect(() => {
    const codigo = String(punto?.codigo_tienda || punto?.code || '').trim();
    if (!codigo) {
      setCategories([]);
      setSeries([]);
      return undefined;
    }
    let cancelled = false;
    setChartLoading(true);
    const start = new Date();
    if (range === 'week') start.setDate(start.getDate() - 7);
    else start.setHours(0, 0, 0, 0);
    const interval = range === 'week' ? '1 day' : '1 hour';
    Promise.all(REPORT_SERIES.map((name) => getV2<{ data?: SeriesRow[] }>('/timeseries', {
      codigoTienda: codigo,
      sensorName: name,
      resourceType: 'tiwater',
      interval,
      startDate: start.toISOString(),
    }).catch(() => ({ data: [] }))))
      .then((responses) => {
        if (cancelled) return;
        const buckets = new Map<string, Record<string, number>>();
        responses.forEach((response, index) => {
          const name = REPORT_SERIES[index];
          (response?.data || []).forEach((row) => {
            const stamp = row.time_bucket ? new Date(row.time_bucket) : null;
            if (!stamp || Number.isNaN(stamp.getTime())) return;
            const label = range === 'week'
              ? stamp.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
              : stamp.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
            const current = buckets.get(label) || {};
            current[name] = Number(row.avg_value) || 0;
            buckets.set(label, current);
          });
        });
        const labels = Array.from(buckets.keys()).reverse();
        setCategories(labels);
        setSeries(REPORT_SERIES.map((name) => ({
          name,
          data: labels.map((label) => buckets.get(label)?.[name] ?? 0),
        })).filter((item) => item.data.some((value) => value !== 0)));
      })
      .finally(() => {
        if (!cancelled) setChartLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [punto, range]);

  const acumulado = readingOf(status, ['acumulado_cruda']);
  const puntoId = String(punto?.id || punto?._id || '');

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3} sx={{ mb: 4 }}>
      <Card sx={{ p: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h5">Todo en uno</Typography>
            <Typography variant="body2" color="text.secondary">
              {punto?.name || product.name}. Lecturas actuales y reporte del punto de venta.
            </Typography>
          </Box>
          {puntoId ? (
            <Button variant="outlined" href={`/PuntoVenta/${encodeURIComponent(puntoId)}`}>
              Abrir punto de venta
            </Button>
          ) : null}
        </Stack>
        {note ? <Alert severity="info" sx={{ mt: 2 }}>{note}</Alert> : null}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {GROUPS.map((group) => (
            <Grid item xs={12} md={4} key={group.title}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>{group.title}</Typography>
              {group.rows.map((row) => {
                const value = readingOf(status, row.codes);
                return (
                  <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2">{row.label}</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {value == null ? 'Sin lectura' : `${fNumber(value)}${group.unit ? ` ${group.unit}` : ''}`}
                    </Typography>
                  </Box>
                );
              })}
            </Grid>
          ))}
        </Grid>
        {acumulado != null && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Acumulado cruda: {fNumber(acumulado)} L
          </Typography>
        )}
      </Card>

      <Card sx={{ p: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6">Reporte</Typography>
            <Typography variant="body2" color="text.secondary">
              Presión de entrada, caudal cruda y acumulado del punto.
            </Typography>
          </Box>
          <ToggleButtonGroup exclusive size="small" value={range} onChange={(_event, value) => value && setRange(value)}>
            <ToggleButton value="today">Hoy</ToggleButton>
            <ToggleButton value="week">7 días</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        {chartLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
        ) : series.length === 0 ? (
          <Alert severity="info">Todavía no hay lecturas en este periodo.</Alert>
        ) : (
          <MultipleBarChart
            title="Histórico"
            subheader={range === 'today' ? 'Promedio por hora' : 'Promedio por día'}
            chart={{ categories, series }}
          />
        )}
      </Card>
    </Stack>
  );
}

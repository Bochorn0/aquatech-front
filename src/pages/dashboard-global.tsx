import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import { Speed, WaterDrop, TrendingUp, Visibility } from '@mui/icons-material';

import { CONFIG } from 'src/config-global';
import { get as getV2 } from 'src/api/axiosHelperV2';
import { DashboardContent } from 'src/layouts/dashboard';
import { MultipleBarChart, type BarClickInfo } from 'src/pages/charts/multiple-bar-chart';

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

type ClienteV2 = { id?: string; _id?: string; name: string };
type PuntoVentaV2 = {
  id: string;
  _id?: string;
  name: string;
  clientId?: string;
  cliente?: ClienteV2 | string;
  updatedAt?: string;
};
type SensorReading = {
  sensorType?: string;
  sensor_type?: string;
  latestReading?: { value: number | string | null; timestamp?: string } | null;
};

/** Per-PV metrics from global-metrics (for nivel/produccion/rechazo/eficiencia charts) */
type PerPvMetric = {
  pvId: string;
  name: string;
  codigo?: string;
  nivelPurificada: number | null;
  nivelCruda: number | null;
  nivelPurificadaLevel?: string | null;
  nivelCrudaLevel?: string | null;
  produccion: number | null;
  rechazo: number | null;
  eficiencia: number | null;
};

/** Response from GET /dashboard/global-metrics */
type GlobalMetrics = {
  puntosVentaCount?: number;
  productionSum?: number;
  rechazoSum?: number;
  eficienciaAvg?: number;
  nivelPurificadaAvg?: number;
  nivelCrudaAvg?: number;
  byLevel?: {
    nivelPurificada?: { normal?: number; preventivo?: number; critico?: number };
    nivelCruda?: { normal?: number; preventivo?: number; critico?: number };
  };
  perPvMetrics?: PerPvMetric[];
};

// Global metrics: nivel, producción, eficiencia, rechazo (exclude maquinas frape/nieve = corriente_ch1-4)

function normalizeType(s: string): string {
  return s
    .toLowerCase()
    .replace(/^electronivel_/, 'nivel_')
    .replace(/^level_/, 'nivel_');
}

function matchGlobalType(sensorType: string): 'nivel_purificada' | 'nivel_cruda' | 'flujo_produccion' | 'flujo_rechazo' | 'eficiencia' | null {
  const n = normalizeType(sensorType);
  if (n.includes('purificada')) return 'nivel_purificada';
  if (n.includes('cruda')) return 'nivel_cruda';
  if (n.includes('flujo_produccion') || n === 'flujo_produccion') return 'flujo_produccion';
  if (n.includes('flujo_rechazo') || n === 'flujo_rechazo') return 'flujo_rechazo';
  if (n === 'eficiencia') return 'eficiencia';
  return null;
}

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

export function DashboardGlobal() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [puntosError, setPuntosError] = useState<string | null>(null);
  const [puntosVenta, setPuntosVenta] = useState<PuntoVentaV2[]>([]);
  const [pvMetrics, setPvMetrics] = useState<Record<string, {
    nivelPurificada: number | null;
    nivelCruda: number | null;
    produccion: number | null;
    rechazo: number | null;
    eficiencia: number | null;
    clientName: string;
  }>>({});
  const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics | null>(null);

  // Global dashboard shows ALL puntos de venta (no client filter)
  const filteredPuntos = useMemo(() => puntosVenta, [puntosVenta]);

  // Sort by last updated (newest first) for the carousel; no date = put at end
  const sortedPuntosForCarousel = useMemo(
    () => [...filteredPuntos].sort((a, b) => {
      const tA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tB - tA;
    }),
    [filteredPuntos]
  );

  const filteredPuntoIds = useMemo(() => filteredPuntos.map((p) => p.id ?? p._id).join(','), [filteredPuntos]);

  useEffect(() => {
    const fetchPuntos = async () => {
      setPuntosError(null);
      try {
        const response = await getV2<PuntoVentaV2[]>('/puntoVentas/all');
        setPuntosVenta(Array.isArray(response) ? response : []);
      } catch (e) {
        setPuntosVenta([]);
        setPuntosError('No se pudieron cargar los puntos de venta. Verifique la conexión.');
      }
    };
    fetchPuntos();
  }, []);

  useEffect(() => {
    const fetchGlobalMetrics = async () => {
      try {
        const data = await getV2<GlobalMetrics>('/dashboard/global-metrics');
        setGlobalMetrics(data ?? null);
      } catch {
        setGlobalMetrics(null);
      }
    };
    fetchGlobalMetrics();
  }, []);

  // If only one punto de venta, go straight to the detail page (sensor-level dashboard)
  useEffect(() => {
    if (!loading && puntosError == null && puntosVenta.length === 1) {
      const id = puntosVenta[0].id ?? puntosVenta[0]._id;
      if (id) navigate(`/dashboard/v2/detalle/${id}`, { replace: true });
    }
  }, [loading, puntosError, puntosVenta, navigate]);

  useEffect(() => {
    if (filteredPuntos.length === 0) {
      setPvMetrics({});
      setLoading(false);
      return () => {};
    }

    let cancelled = false;
    setLoading(true);

    const run = async () => {
      const results = await Promise.all(
        filteredPuntos.map(async (pv) => {
          try {
            const sensors = await getV2<SensorReading[]>(
              `/puntoVentas/${pv.id}/sensors/readings`,
              { timeRange: 'today' }
            );
            const list = Array.isArray(sensors) ? sensors : [];
            const clientName =
              typeof pv.cliente === 'object' && pv.cliente != null
                ? (pv.cliente as ClienteV2).name
                : '';

            const out = {
              nivelPurificada: null as number | null,
              nivelCruda: null as number | null,
              produccion: null as number | null,
              rechazo: null as number | null,
              eficiencia: null as number | null,
            };

            list.forEach((s) => {
              const type = s.sensorType ?? s.sensor_type ?? '';
              const key = matchGlobalType(type);
              if (!key) return;
              const raw = s.latestReading?.value;
              const num = raw !== null && raw !== undefined ? (typeof raw === 'string' ? parseFloat(raw) : raw) : null;
              if (num === null || Number.isNaN(num)) return;
              if (key === 'nivel_purificada') out.nivelPurificada = num;
              else if (key === 'nivel_cruda') out.nivelCruda = num;
              else if (key === 'flujo_produccion') out.produccion = num;
              else if (key === 'flujo_rechazo') out.rechazo = num;
              else if (key === 'eficiencia') out.eficiencia = num;
            });

            return { pvId: String(pv.id ?? pv._id), pvName: pv.name || `PV ${pv.id}`, clientName, ...out };
          } catch {
            return {
              pvId: String(pv.id ?? pv._id),
              pvName: pv.name || `PV ${pv.id}`,
              clientName: typeof pv.cliente === 'object' && pv.cliente != null ? (pv.cliente as ClienteV2).name : '',
              nivelPurificada: null,
              nivelCruda: null,
              produccion: null,
              rechazo: null,
              eficiencia: null,
            };
          }
        })
      );

      if (cancelled) return;
      const map: Record<string, { nivelPurificada: number | null; nivelCruda: number | null; produccion: number | null; rechazo: number | null; eficiencia: number | null; clientName: string }> = {};
      results.forEach((r) => {
        map[r.pvId] = {
          nivelPurificada: r.nivelPurificada,
          nivelCruda: r.nivelCruda,
          produccion: r.produccion,
          rechazo: r.rechazo,
          eficiencia: r.eficiencia,
          clientName: r.clientName,
        };
      });
      setPvMetrics(map);
      setLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [filteredPuntoIds, filteredPuntos]);

  const chartCategories = useMemo(
    () => (filteredPuntos.map((p) => p.name || `PV ${p.id}`)),
    [filteredPuntos]
  );

  // Prefer per-PV metrics from global-metrics (same source as summary); fallback to sensors/readings per PV
  const chartPvMetrics = useMemo((): Record<string, { nivelPurificada: number | null; nivelCruda: number | null; produccion: number | null; rechazo: number | null; eficiencia: number | null; clientName: string }> => {
    if (globalMetrics?.perPvMetrics && globalMetrics.perPvMetrics.length > 0) {
      return globalMetrics.perPvMetrics.reduce(
        (acc, m) => {
          const pv = filteredPuntos.find((p) => String(p.id ?? p._id) === m.pvId);
          const clientName = typeof pv?.cliente === 'object' ? (pv?.cliente as ClienteV2)?.name ?? '' : '';
          acc[m.pvId] = {
            nivelPurificada: m.nivelPurificada,
            nivelCruda: m.nivelCruda,
            produccion: m.produccion,
            rechazo: m.rechazo,
            eficiencia: m.eficiencia,
            clientName,
          };
          return acc;
        },
        {} as Record<string, { nivelPurificada: number | null; nivelCruda: number | null; produccion: number | null; rechazo: number | null; eficiencia: number | null; clientName: string }>
      );
    }
    return pvMetrics;
  }, [globalMetrics?.perPvMetrics, filteredPuntos, pvMetrics]);

  const nivelChart = useMemo(
    () => ({
      categories: chartCategories,
      colors: [theme.palette.success.dark, theme.palette.success.main],
      series: [
        {
          name: 'Nivel Purificada (%)',
          data: chartCategories.map((_, i) =>
            (chartPvMetrics[String(filteredPuntos[i]?.id ?? filteredPuntos[i]?._id)]?.nivelPurificada ?? 0)
          ),
        },
        {
          name: 'Nivel Cruda (%)',
          data: chartCategories.map((_, i) =>
            (chartPvMetrics[String(filteredPuntos[i]?.id ?? filteredPuntos[i]?._id)]?.nivelCruda ?? 0)
          ),
        },
      ],
    }),
    [chartCategories, filteredPuntos, chartPvMetrics, theme.palette.success.dark, theme.palette.success.main]
  );
  const produccionRechazoChart = useMemo(
    () => ({
      categories: chartCategories,
      colors: [theme.palette.success.main, theme.palette.warning.main],
      series: [
        { name: 'Producción (L/min)', data: chartCategories.map((_, i) => (chartPvMetrics[String(filteredPuntos[i]?.id ?? filteredPuntos[i]?._id)]?.produccion ?? 0)) },
        { name: 'Rechazo (L/min)', data: chartCategories.map((_, i) => (chartPvMetrics[String(filteredPuntos[i]?.id ?? filteredPuntos[i]?._id)]?.rechazo ?? 0)) },
      ],
    }),
    [chartCategories, filteredPuntos, chartPvMetrics, theme.palette.success.main, theme.palette.warning.main]
  );
  const eficienciaChart = useMemo(
    () => ({
      categories: chartCategories,
      colors: [theme.palette.info.main],
      series: [
        { name: 'Eficiencia (%)', data: chartCategories.map((_, i) => (chartPvMetrics[String(filteredPuntos[i]?.id ?? filteredPuntos[i]?._id)]?.eficiencia ?? 0)) },
      ],
    }),
    [chartCategories, filteredPuntos, chartPvMetrics, theme.palette.info.main]
  );

  const summary = useMemo((): {
    puntosCount: number;
    avgNivelPurificada: number | null;
    avgNivelCruda: number | null;
    totalProduccion: number;
    totalRechazo: number;
    avgEficiencia: number | null;
  } => {
    if (globalMetrics) {
      return {
        puntosCount: globalMetrics.puntosVentaCount ?? filteredPuntos.length,
        avgNivelPurificada: globalMetrics.nivelPurificadaAvg ?? null,
        avgNivelCruda: globalMetrics.nivelCrudaAvg ?? null,
        totalProduccion: globalMetrics.productionSum ?? 0,
        totalRechazo: globalMetrics.rechazoSum ?? 0,
        avgEficiencia: globalMetrics.eficienciaAvg ?? null,
      };
    }
    const values = Object.values(pvMetrics);
    const nivP = values.map((v) => v.nivelPurificada).filter((n) => n != null) as number[];
    const nivC = values.map((v) => v.nivelCruda).filter((n) => n != null) as number[];
    const prod = values.map((v) => v.produccion).filter((n) => n != null) as number[];
    const eff = values.map((v) => v.eficiencia).filter((n) => n != null) as number[];
    const rechazo = values.map((v) => v.rechazo).filter((n) => n != null) as number[];
    return {
      puntosCount: filteredPuntos.length,
      avgNivelPurificada: nivP.length ? nivP.reduce((a, b) => a + b, 0) / nivP.length : null,
      avgNivelCruda: nivC.length ? nivC.reduce((a, b) => a + b, 0) / nivC.length : null,
      totalProduccion: prod.reduce((a, b) => a + b, 0),
      totalRechazo: rechazo.reduce((a, b) => a + b, 0),
      avgEficiencia: eff.length ? eff.reduce((a, b) => a + b, 0) / eff.length : null,
    };
  }, [globalMetrics, pvMetrics, filteredPuntos.length]);

  const nivelPorEstadoChart = useMemo(() => {
    const byLevel = globalMetrics?.byLevel;
    const categories = ['Normal', 'Preventivo', 'Crítico'];
    const purificada = byLevel?.nivelPurificada;
    const cruda = byLevel?.nivelCruda;
    const nNorm = purificada?.normal ?? 0;
    const nPrev = purificada?.preventivo ?? 0;
    const nCrit = purificada?.critico ?? 0;
    const cNorm = cruda?.normal ?? 0;
    const cPrev = cruda?.preventivo ?? 0;
    const cCrit = cruda?.critico ?? 0;
    return {
      categories,
      colors: [
        theme.palette.success.dark,
        theme.palette.success.light,
        theme.palette.warning.dark,
        theme.palette.warning.light,
        theme.palette.error.dark,
        theme.palette.error.light,
      ],
      series: [
        { name: 'Purificada (Normal)', data: [nNorm, 0, 0] },
        { name: 'Cruda (Normal)', data: [cNorm, 0, 0] },
        { name: 'Purificada (Preventivo)', data: [0, nPrev, 0] },
        { name: 'Cruda (Preventivo)', data: [0, cPrev, 0] },
        { name: 'Purificada (Crítico)', data: [0, 0, nCrit] },
        { name: 'Cruda (Crítico)', data: [0, 0, cCrit] },
      ],
    };
  }, [globalMetrics?.byLevel, theme.palette.success.dark, theme.palette.success.light, theme.palette.warning.dark, theme.palette.warning.light, theme.palette.error.dark, theme.palette.error.light]);

  // Bar-click descriptions: how the value was calculated (which PVs contribute)
  const getNivelPorEstadoDescription = useCallback(
    (info: BarClickInfo): { title: string; content: string | string[] } | null => {
      const perPv = globalMetrics?.perPvMetrics ?? [];
      const levelBySeries = ['normal', 'normal', 'preventivo', 'preventivo', 'critico', 'critico'] as const;
      const typeBySeries = ['Purificada', 'Cruda', 'Purificada', 'Cruda', 'Purificada', 'Cruda'];
      const level = levelBySeries[info.seriesIndex];
      const typeLabel = typeBySeries[info.seriesIndex];
      const usePurificada = info.seriesIndex % 2 === 0;
      const names = perPv
        .filter((m) => (usePurificada ? m.nivelPurificadaLevel : m.nivelCrudaLevel) === level)
        .map((m) => m.name);
      const categoryLabel = info.category;
      return {
        title: `Nivel ${typeLabel} — ${categoryLabel} (${info.value} puntos)`,
        content: names.length > 0 ? names : ['Ningún punto de venta en este nivel.'],
      };
    },
    [globalMetrics?.perPvMetrics]
  );

  const getNivelPorPvDescription = useCallback(
    (info: BarClickInfo): { title: string; content: string } | null => {
      const pvName = info.category;
      const unit = info.seriesName.includes('Purificada') || info.seriesName.includes('Cruda') ? '%' : '';
      return {
        title: `${info.seriesName} — ${pvName}`,
        content: `Valor: ${info.value}${unit}. Última lectura del sensor para este punto de venta.`,
      };
    },
    []
  );

  const getProduccionRechazoDescription = useCallback(
    (info: BarClickInfo): { title: string; content: string } | null => ({
      title: `${info.seriesName} — ${info.category}`,
      content: `Valor: ${info.value} L/min. Última lectura del sensor de flujo para este punto de venta.`,
    }),
    []
  );

  const getEficienciaDescription = useCallback(
    (info: BarClickInfo): { title: string; content: string } | null => ({
      title: `Eficiencia — ${info.category}`,
      content: `Valor: ${info.value}%. Última lectura del sensor de eficiencia para este punto de venta.`,
    }),
    []
  );

  if (loading && Object.keys(pvMetrics).length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${CONFIG.appName} - Dashboard global`}</title>
      </Helmet>
      <DashboardContent maxWidth="xl">
        <Typography variant="h4" sx={{ mb: 1 }}>
          Dashboard global
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Métricas agregadas de nivel de agua, producción, eficiencia y rechazo por punto de venta. Sin máquinas frape/nieve.
        </Typography>

        {puntosError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPuntosError(null)}>
            {puntosError}
          </Alert>
        )}

        {!loading && !puntosError && filteredPuntos.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            No hay puntos de venta configurados. Configure puntos de venta en la sección Puntos de venta.
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Summary cards — grouped: niveles, producción/rechazo, puntos/eficiencia */}
          <Grid xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <WaterDrop color="info" />
                  <Typography variant="subtitle2" color="text.secondary">Niveles (prom. %)</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Purificada</Typography>
                  <Typography variant="h5">{summary.avgNivelPurificada != null ? summary.avgNivelPurificada.toFixed(1) : '—'}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Cruda</Typography>
                  <Typography variant="h5">{summary.avgNivelCruda != null ? summary.avgNivelCruda.toFixed(1) : '—'}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <TrendingUp color="success" />
                  <Typography variant="subtitle2" color="text.secondary">Producción y rechazo (L/min)</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Producción total</Typography>
                  <Typography variant="h5">{summary.totalProduccion > 0 ? summary.totalProduccion.toFixed(1) : '—'}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Rechazo total</Typography>
                  <Typography variant="h5">{summary.totalRechazo > 0 ? summary.totalRechazo.toFixed(1) : '—'}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Speed color="warning" />
                  <Typography variant="subtitle2" color="text.secondary">Puntos de venta y eficiencia</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Puntos de venta</Typography>
                  <Typography variant="h5">{summary.puntosCount}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Eficiencia (prom. %)</Typography>
                  <Typography variant="h5">{summary.avgEficiencia != null ? summary.avgEficiencia.toFixed(1) : '—'}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Nivel por estado (global) */}
          {globalMetrics?.byLevel && (
            <Grid xs={12} md={6}>
              <MultipleBarChart
                title="Nivel por estado"
                subheader="Cantidad de puntos por nivel: Normal, Preventivo, Crítico. Clic en una barra para ver qué puntos la componen."
                chart={nivelPorEstadoChart}
                getBarDescription={getNivelPorEstadoDescription}
              />
            </Grid>
          )}

          {/* Bar charts */}
          {chartCategories.length > 0 && (
            <>
              <Grid xs={12} md={6}>
                <MultipleBarChart
                  title="Nivel de agua por punto de venta"
                  subheader="Purificada y cruda (%). Clic en una barra para ver descripción."
                  chart={nivelChart}
                  getBarDescription={getNivelPorPvDescription}
                />
              </Grid>
              <Grid xs={12} md={6}>
                <MultipleBarChart
                  title="Producción y rechazo"
                  subheader="L/min por punto de venta. Clic en una barra para ver descripción."
                  chart={produccionRechazoChart}
                  getBarDescription={getProduccionRechazoDescription}
                />
              </Grid>
              <Grid xs={12} md={6}>
                <MultipleBarChart
                  title="Eficiencia"
                  subheader="% por punto de venta. Clic en una barra para ver descripción."
                  chart={eficienciaChart}
                  getBarDescription={getEficienciaDescription}
                />
              </Grid>
            </>
          )}

          {/* Punto de venta cards — horizontal scroll, sorted by last updated */}
          <Grid xs={12}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Puntos de venta — Ver detalle por sensor
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Ordenados por última actualización. Desplaza horizontalmente para ver más ({sortedPuntosForCarousel.length} en total).
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                overflowX: 'auto',
                pb: 2,
                px: 0.5,
                // visible scrollbar for discoverability
                '&::-webkit-scrollbar': { height: 10 },
                '&::-webkit-scrollbar-track': { bgcolor: 'action.hover' },
                '&::-webkit-scrollbar-thumb': { borderRadius: 5, bgcolor: 'divider' },
              }}
            >
              {sortedPuntosForCarousel.map((pv) => {
                const m = chartPvMetrics[String(pv.id ?? pv._id)];
                const clientName = m?.clientName ?? (typeof pv.cliente === 'object' && pv.cliente != null ? (pv.cliente as ClienteV2).name : '');
                return (
                  <Card
                    key={String(pv.id ?? pv._id)}
                    sx={{
                      flexShrink: 0,
                      width: 280,
                      minHeight: 180,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">{pv.name || `PV ${pv.id}`}</Typography>
                      {clientName && <Typography variant="body2" color="text.secondary">{clientName}</Typography>}
                      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {m?.nivelPurificada != null && <Typography variant="caption">Nivel: {m.nivelPurificada.toFixed(0)}%</Typography>}
                        {m?.eficiencia != null && <Typography variant="caption">Efic: {m.eficiencia.toFixed(0)}%</Typography>}
                        {m?.produccion != null && <Typography variant="caption">Prod: {m.produccion.toFixed(1)} L/min</Typography>}
                      </Box>
                    </CardContent>
                    <Box sx={{ p: 2, pt: 0 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => navigate(`/dashboard/v2/detalle/${pv.id ?? pv._id}`)}
                      >
                        Ver detalle
                      </Button>
                    </Box>
                  </Card>
                );
              })}
            </Box>
          </Grid>
        </Grid>
      </DashboardContent>
    </>
  );
}

export default DashboardGlobal;

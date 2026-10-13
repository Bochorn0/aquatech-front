import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Box,
  Card,
  Chip,
  Grid,
  Table,
  Alert,
  Stack,
  Button,
  TableRow,
  TableBody,
  TableHead,
  Typography,
  CardHeader,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  CircularProgress,
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
import { SensorFlujoHistoricoChart } from 'src/pages/charts/sensor-flujo-historico-chart';

import { toLatinDisplay } from './latin-display';
import {
  DEMO_METRIC_RULES,
  channelLabel,
  chartDayLabel,
  dailyDeltas,
  evaluateMetric,
  historyForDevice,
  ruleToAlert,
  buildReadingTrace,
  scaledTemperature,
  toLiters,
  volumeScaleLabel,
  type MeterReportPoint,
  type MetricAlert,
} from './meter-platform-demo';

type Metric = { name: string; type: string; value: number; unit: string };

type DetailData = {
  deviceCode: string;
  listRow: Record<string, any> | null;
  extend: Record<string, any> | null;
  profile: Record<string, unknown> | null;
  connRecords: {
    total: number;
    rows: Array<Record<string, any>>;
  };
  staticReports: Array<Record<string, unknown>>;
  normalized: {
    externalDeviceId: string;
    observedAt: string;
    metrics: Metric[];
    rawMeta?: Record<string, unknown>;
  } | null;
  normalizeError?: string | null;
  fetchErrors?: Record<string, string | null>;
  usageBreakdown?: {
    unit?: string;
    last5DaysDailyUsageRaw?: string | null;
    last5DaysParsed?: {
      startDate: string;
      days: number;
      entries: Array<{ date: string; raw: number; m3: number; liters: number }>;
    } | null;
    dailyUsageMap?: Record<string, number> | null;
    dailyUsageEnriched?: Array<{
      date: string;
      m3: number;
      liters: number;
      deltaM3: number | null;
      deltaLiters: number | null;
    }> | null;
  } | null;
};

type DetailResponse = {
  success: boolean;
  message?: string;
  data?: DetailData;
};

function formatWhen(raw?: string | Date | null) {
  if (!raw) return '—';
  const d = raw instanceof Date ? raw : new Date(String(raw).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function valveLabel(raw?: string | number | null) {
  const s = String(raw ?? '');
  if (s.includes('开') || s.toLowerCase().includes('open') || raw === 0) return 'Válvula abierta';
  if (s.includes('关') || s.toLowerCase().includes('close')) return 'Válvula cerrada';
  return toLatinDisplay(s);
}

function MetricBox({
  title,
  value,
  unit,
  alert,
}: {
  title: string;
  value: ReactNode;
  unit: string;
  alert: MetricAlert;
}) {
  const accent =
    alert.severity === 'error' ? 'error.main' : alert.severity === 'warning' ? 'warning.main' : 'success.main';
  return (
    <Grid item xs={6} sm={4} md={2}>
      <Box
        sx={{
          p: 1.75,
          height: '100%',
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderTop: '3px solid',
          borderTopColor: accent,
        }}
      >
        <Typography variant="caption" color="text.secondary" display="block">
          {title}
        </Typography>
        <Typography variant="h5" fontWeight={700} sx={{ my: 0.25, lineHeight: 1.2 }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {unit}
        </Typography>
      </Box>
    </Grid>
  );
}

function chartStatus(alert: MetricAlert): 'success' | 'warning' | 'error' {
  if (alert.severity === 'error') return 'error';
  if (alert.severity === 'warning') return 'warning';
  return 'success';
}

export default function MeterPlatformDetailPage() {
  const { deviceCode: rawCode } = useParams();
  const deviceCode = decodeURIComponent(rawCode || '');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DetailData | null>(null);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [section, setSection] = useState<'lectura' | 'historico' | 'traza'>('lectura');

  const load = useCallback(async () => {
    if (!deviceCode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await get<DetailResponse>(
        `/external-providers/meter-platform/devices/${encodeURIComponent(deviceCode)}`,
        { connLimit: 80 }
      );
      if (!res?.success || !res.data) {
        setError(res?.message || 'No se pudo cargar el detalle');
        setData(null);
        return;
      }
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error de red');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [deviceCode]);

  useEffect(() => {
    load();
  }, [load]);

  const history: MeterReportPoint[] = useMemo(
    () => historyForDevice(deviceCode, data),
    [data, deviceCode]
  );

  const latest = history[history.length - 1];
  const deltas = useMemo(() => dailyDeltas(history), [history]);
  const lastDelta = deltas[deltas.length - 1];
  const peakDaily = deltas.reduce(
    (best, row) => (row.deltaForwardL > best.deltaForwardL ? row : best),
    deltas[0] || { deltaForwardL: 0, date: '', at: '' }
  );

  const forwardL = toLiters(latest?.forwardM3);
  const reverseL = toLiters(latest?.reverseM3) ?? 0;
  const voltage = latest?.voltage && latest.voltage > 1 ? latest.voltage : null;
  const remaining = latest?.remainingPower && latest.remainingPower > 0 ? latest.remainingPower : null;
  const dailyL = lastDelta?.deltaForwardL ?? 0;
  const temperature = scaledTemperature(latest?.temperatureRaw);
  const trace = useMemo(() => buildReadingTrace(latest), [latest]);
  const reverseExceedsForward = reverseL > 0 && forwardL != null && reverseL > forwardL;

  const volumenAlert = evaluateMetric(forwardL, DEMO_METRIC_RULES.volumenL);
  const inversoAlert = reverseExceedsForward
    ? ruleToAlert(
        {
          min: reverseL,
          max: reverseL,
          label: 'Crítico',
          message: 'El acumulado inverso supera al volumen de avance. Se detonaría correo al responsable.',
          severity: 'critico',
          channel: 'correo',
        },
        'Crítico'
      )
    : evaluateMetric(reverseL, DEMO_METRIC_RULES.inversoL);
  const voltageAlert = evaluateMetric(voltage, DEMO_METRIC_RULES.voltage);
  const batteryAlert = evaluateMetric(remaining, DEMO_METRIC_RULES.remainingPower);
  const dailyAlert = evaluateMetric(dailyL, DEMO_METRIC_RULES.consumoDiarioL);
  const reportInfo: MetricAlert = {
    label: 'Contador de vida',
    message:
      'successReportTimes no sube en cada reporte; totalReportTimes sí. No se usa como porcentaje de éxito.',
    severity: 'info',
    bgColor: 'info.lighter',
    borderColor: 'info.main',
    channel: 'none',
    level: 'normal',
  };
  const leakAlert: MetricAlert = latest?.isLeak
    ? ruleToAlert(
        {
          min: 1,
          max: 1,
          label: 'Crítico',
          message: 'Flag de fuga del medidor. Se detonaría correo inmediato.',
          severity: 'critico',
          channel: 'correo',
        },
        'Crítico'
      )
    : {
        label: 'En rango',
        message: 'Sin fuga, overflow ni error de reloj en el último report.',
        severity: 'success',
        bgColor: 'success.lighter',
        borderColor: 'success.main',
        channel: 'none',
        level: 'normal',
      };

  const inbox = [
    { metric: 'Flujo inverso', alert: inversoAlert, value: `${fNumber(reverseL)} L` },
    { metric: 'Consumo del último intervalo', alert: dailyAlert, value: `${dailyL.toFixed(0)} L` },
    {
      metric: `Pico histórico (${peakDaily.date || '—'})`,
      alert: evaluateMetric(peakDaily.deltaForwardL, DEMO_METRIC_RULES.consumoDiarioL),
      value: `${(peakDaily.deltaForwardL || 0).toFixed(0)} L`,
    },
    { metric: 'Batería (V)', alert: voltageAlert, value: voltage != null ? `${voltage.toFixed(3)} V` : '—' },
    { metric: 'Reserva', alert: batteryAlert, value: remaining != null ? `${remaining} %` : '—' },
    {
      metric: 'Contadores de reporte',
      alert: reportInfo,
      value: latest && latest.total > 0 ? `${latest.success} / ${latest.total}` : '—',
    },
    { metric: 'Fugas / flags', alert: leakAlert, value: latest?.isLeak ? 'Fuga' : 'OK' },
  ];

  const observedAt = data?.normalized?.observedAt || latest?.at;
  const deviceType = toLatinDisplay(
    data?.listRow?.deviceType || data?.extend?.deviceInfo?.deviceType,
    'Medidor'
  );
  const address = toLatinDisplay(
    data?.extend?.address || data?.listRow?.installAddress,
    '—'
  );
  const online = (() => {
    const v = data?.listRow?.isOnline;
    if (v === true || v === 1) return true;
    const s = String(v ?? '').toLowerCase();
    return s === 'on_line' || s === 'online' || s === '1';
  })();
  const company = data?.listRow?.companyId != null ? String(data.listRow.companyId) : '';

  const sensorJson = useMemo(() => {
    const rows = data?.connRecords?.rows || [];
    const report =
      rows.find(
        (row) =>
          String(row.direction || '').toLowerCase() === 'client'
          && String(row.type || '').toLowerCase() === 'report'
          && (row.analyticalParsed || row.analyticalBody)
      ) || rows.find((row) => row.analyticalParsed || row.analyticalBody);
    if (report?.analyticalParsed) return report.analyticalParsed;
    if (typeof report?.analyticalBody === 'string') {
      try {
        return JSON.parse(report.analyticalBody);
      } catch {
        return { analyticalBody: report.analyticalBody };
      }
    }
    return {
      listRow: data?.listRow ?? null,
      extend: data?.extend ?? null,
      normalized: data?.normalized ?? null,
    };
  }, [data]);

  const sensorJsonText = useMemo(() => JSON.stringify(sensorJson, null, 2), [sensorJson]);

  const categories = history.map((p) => chartDayLabel(p.at));
  const forwardSeries = history.map((p) => toLiters(p.forwardM3) ?? 0);
  const reverseSeries = history.map((p) => toLiters(p.reverseM3) ?? 0);
  const voltageSeries = history.map((p) => p.voltage);
  const dailySeries = deltas.map((p) => Math.max(0, p.deltaForwardL));
  const dailyTrendAlert = evaluateMetric(
    Math.max(...dailySeries, 0),
    DEMO_METRIC_RULES.consumoDiarioL
  );

  return (
    <>
      <Helmet>
        <title>{deviceCode ? `Sitio ${deviceCode}` : 'Sitio medidor'} - {CONFIG.appName}</title>
      </Helmet>

      <Box sx={{ px: { xs: 2, md: 3 }, py: 2.5, width: '100%', maxWidth: 'none' }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ md: 'center' }}
          justifyContent="space-between"
          sx={{ mb: 2.5 }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
            <Button size="small" onClick={() => navigate('/meter-platform')}>
              Medidores
            </Button>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, letterSpacing: -0.4, fontFamily: 'ui-monospace, monospace' }}
              >
                {deviceCode || 'Medidor'}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {deviceType} · {address}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              label={online ? 'En línea' : 'Fuera de línea'}
              color={online ? 'success' : 'default'}
              variant={online ? 'filled' : 'outlined'}
            />
            <Chip size="small" variant="outlined" label={valveLabel(latest?.valve || data?.listRow?.valveStatus)} />
            <Typography variant="caption" color="text.secondary">
              {formatWhen(data?.listRow?.lastConnTime || observedAt)}
            </Typography>
            <Button size="small" variant="outlined" onClick={() => setJsonOpen(true)} disabled={!data || loading}>
              JSON
            </Button>
            <Button size="small" variant="contained" onClick={load} disabled={loading}>
              Actualizar
            </Button>
          </Stack>
        </Stack>

        <Dialog open={jsonOpen} onClose={() => setJsonOpen(false)} fullWidth maxWidth="md">
          <DialogTitle>JSON del sensor {deviceCode}</DialogTitle>
          <DialogContent dividers>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 1.5,
                maxHeight: '70vh',
                overflow: 'auto',
                fontSize: 12,
                lineHeight: 1.5,
                fontFamily: 'ui-monospace, monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                bgcolor: 'grey.100',
                borderRadius: 1,
              }}
            >
              {sensorJsonText}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                navigator.clipboard?.writeText(sensorJsonText);
              }}
            >
              Copiar
            </Button>
            <Button variant="contained" color="inherit" onClick={() => setJsonOpen(false)}>
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>

        {error && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}

        {latest?.volumeScale === 'divided-1000' && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            El último <strong>currentForwardUsage</strong> llegó como {String(latest.rawForwardM3)}. En los
            reportes anteriores de este mismo medidor el acumulado está en {latest.forwardM3.toFixed(3)} m³,
            con el mismo voltaje. Lo mostramos como {latest.forwardM3.toFixed(3)} m³ (
            {Math.round(latest.forwardM3 * 1000)} L). {volumeScaleLabel(latest.volumeScale)}.
          </Alert>
        )}

        {latest?.volumeScale === 'integer-unverified' && (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            El acumulado llegó como entero ({String(latest.rawForwardM3)}) y este medidor no tiene lecturas
            fraccionarias para comparar. Se muestra tal cual: {latest.forwardM3.toFixed(3)} m³ (
            {Math.round(latest.forwardM3 * 1000)} L).
          </Alert>
        )}

        {loading && !data ? (
          <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Tabs
              value={section}
              onChange={(_, value: 'lectura' | 'historico' | 'traza') => setSection(value)}
              sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab value="lectura" label="Lectura" />
              <Tab value="historico" label="Histórico" />
              <Tab value="traza" label="Cómo se muestra" />
            </Tabs>

            {section === 'lectura' && (
            <>
            <Card variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                {deviceType}
              </Typography>
              <Grid container spacing={1.5}>
                <MetricBox
                  title="Volumen acumulado"
                  value={forwardL != null ? fNumber(forwardL) : '—'}
                  unit="L"
                  alert={volumenAlert}
                />
                <MetricBox
                  title="Flujo inverso"
                  value={fNumber(reverseL)}
                  unit="L"
                  alert={inversoAlert}
                />
                <MetricBox
                  title="Consumo último reporte"
                  value={dailyL.toFixed(0)}
                  unit="L / intervalo"
                  alert={dailyAlert}
                />
                <MetricBox
                  title="Batería"
                  value={voltage != null ? voltage.toFixed(3) : '—'}
                  unit="V"
                  alert={voltageAlert}
                />
                <MetricBox
                  title="Reserva"
                  value={remaining != null ? remaining : '—'}
                  unit="%"
                  alert={batteryAlert}
                />
                <MetricBox
                  title="Contadores de reporte"
                  value={latest && latest.total > 0 ? `${latest.success}/${latest.total}` : '—'}
                  unit="exitosos / intentos"
                  alert={reportInfo}
                />
              </Grid>
            </Card>

            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
              <Grid item xs={12} md={7}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardHeader
                    title="Detalle del sensor"
                    subheader="Ultimo reporte del medidor"
                    sx={{ pb: 0 }}
                  />
                  <CardContent sx={{ pt: 1.5 }}>
                    <Grid container spacing={1.5}>
                      {[
                        ['Sitio', deviceCode],
                        ['Tipo', deviceType],
                        ['Ubicación', address],
                        ['Válvula', valveLabel(latest?.valve || data?.listRow?.valveStatus)],
                        ['Diámetro', latest?.pipeDiameter ? `${latest.pipeDiameter} mm` : '—'],
                        ['Última lectura', formatWhen(data?.listRow?.lastConnTime || observedAt)],
                        ['Fuga', latest?.isLeak ? 'Sí' : 'No'],
                        [
                          'Temperatura',
                          temperature.celsius != null
                            ? `${temperature.celsius.toFixed(1)} °C${temperature.scaled ? ` (crudo ${Number(temperature.raw).toFixed(1)})` : ''}`
                            : '—',
                        ],
                        ['Escala de volumen', volumeScaleLabel(latest?.volumeScale)],
                        ...(company ? [['Cliente', company] as [string, string]] : []),
                      ].map(([label, value]) => (
                        <Grid item xs={6} sm={4} key={label}>
                          <Typography variant="caption" color="text.secondary">
                            {label}
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {value}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={5}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardHeader
                    title="Fuera de rango"
                    subheader="El resto de la lectura no dispara alerta"
                    sx={{ pb: 0 }}
                  />
                  <CardContent sx={{ pt: 1.5 }}>
                    <Stack spacing={1}>
                      {inbox.every((item) => item.alert.level === 'normal') && (
                        <Typography variant="body2" color="text.secondary">
                          Esta lectura está dentro de los rangos.
                        </Typography>
                      )}
                      {inbox.filter((item) => item.alert.level !== 'normal').map((item) => (
                        <Box
                          key={item.metric}
                          sx={{
                            p: 1.25,
                            borderRadius: 1,
                            borderLeft: '4px solid',
                            borderColor: item.alert.borderColor,
                            bgcolor: item.alert.bgColor,
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" gap={1} alignItems="center">
                            <Typography variant="body2" fontWeight={700}>
                              {item.metric}
                            </Typography>
                            <Chip
                              size="small"
                              color={
                                item.alert.level === 'critico'
                                  ? 'error'
                                  : item.alert.level === 'preventivo'
                                    ? 'warning'
                                    : 'success'
                              }
                              label={channelLabel(item.alert.channel)}
                            />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {item.value} · {item.alert.label}
                            {item.alert.message ? ` — ${item.alert.message}` : ''}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            </>
            )}

            {section === 'historico' && (
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
              <Grid item xs={12} md={6}>
                <SensorFlujoHistoricoChart
                  title="Volumen acumulado"
                  subheader="Litros acumulados"
                  categories={categories}
                  series={[{ name: 'Litros', data: forwardSeries }]}
                  yTitle="L"
                  decimalsInFloat={0}
                  fromZero={false}
                  status={chartStatus(volumenAlert)}
                  statusLabel={volumenAlert.label}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <SensorFlujoHistoricoChart
                  title="Flujo inverso"
                  subheader="Acumulado inverso"
                  categories={categories}
                  series={[{ name: 'Inverso L', data: reverseSeries }]}
                  yTitle="L"
                  decimalsInFloat={0}
                  fromZero
                  status={chartStatus(inversoAlert)}
                  statusLabel={inversoAlert.label}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <SensorFlujoHistoricoChart
                  title="Consumo por intervalo"
                  subheader="Delta litros entre reportes"
                  categories={categories}
                  series={[{ name: 'L / dia', data: dailySeries }]}
                  yTitle="L"
                  decimalsInFloat={0}
                  fromZero
                  status={chartStatus(dailyTrendAlert)}
                  statusLabel={dailyTrendAlert.label}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <SensorFlujoHistoricoChart
                  title="Batería"
                  subheader="Voltaje del medidor"
                  categories={categories}
                  series={[{ name: 'Volts', data: voltageSeries }]}
                  yTitle="V"
                  decimalsInFloat={3}
                  fromZero={false}
                  status={chartStatus(voltageAlert)}
                  statusLabel={voltageAlert.label}
                />
              </Grid>
            </Grid>
            )}

            {section === 'traza' && (
            <>
            {trace.length > 0 && (
              <Card variant="outlined" sx={{ mb: 1.5 }}>
                <CardHeader
                  title="Cómo se muestra este dato"
                  subheader="Campo de origen, valor crudo y transformación antes de llegar a la pantalla"
                  sx={{ pb: 0 }}
                />
                <CardContent sx={{ pt: 1.5 }}>
                  <StyledTableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <StyledTableCellHeader>En pantalla</StyledTableCellHeader>
                          <StyledTableCellHeader>Campo</StyledTableCellHeader>
                          <StyledTableCellHeader>Crudo</StyledTableCellHeader>
                          <StyledTableCellHeader>Transformación</StyledTableCellHeader>
                          <StyledTableCellHeader>Mostrado</StyledTableCellHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {trace.map((row) => (
                          <StyledTableRow key={row.label}>
                            <StyledTableCell>{row.label}</StyledTableCell>
                            <StyledTableCell sx={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                              {row.source}
                            </StyledTableCell>
                            <StyledTableCell>{row.raw}</StyledTableCell>
                            <StyledTableCell sx={{ maxWidth: 360 }}>{row.transform}</StyledTableCell>
                            <StyledTableCell>{row.display}</StyledTableCell>
                          </StyledTableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </StyledTableContainer>
                </CardContent>
              </Card>
            )}

            <Card variant="outlined" sx={{ mb: 1.5 }}>
              <CardHeader
                title="Rangos"
                subheader="En rango / preventivo / crítico"
                sx={{ pb: 0 }}
              />
              <CardContent sx={{ pt: 1.5 }}>
                <StyledTableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <StyledTableCellHeader>Métrica</StyledTableCellHeader>
                        <StyledTableCellHeader>En rango</StyledTableCellHeader>
                        <StyledTableCellHeader>Preventivo</StyledTableCellHeader>
                        <StyledTableCellHeader>Crítico / correo</StyledTableCellHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <StyledTableRow>
                        <StyledTableCell>Flujo inverso</StyledTableCell>
                        <StyledTableCell>&lt; 500 L</StyledTableCell>
                        <StyledTableCell>500 – 3 000 L</StyledTableCell>
                        <StyledTableCell>≥ 3 000 L o inverso &gt; avance</StyledTableCell>
                      </StyledTableRow>
                      <StyledTableRow>
                        <StyledTableCell>Consumo diario</StyledTableCell>
                        <StyledTableCell>&lt; 200 L</StyledTableCell>
                        <StyledTableCell>200 – 500 L</StyledTableCell>
                        <StyledTableCell>≥ 500 L (posible fuga)</StyledTableCell>
                      </StyledTableRow>
                      <StyledTableRow>
                        <StyledTableCell>Batería</StyledTableCell>
                        <StyledTableCell>≥ 3.60 V / ≥ 85%</StyledTableCell>
                        <StyledTableCell>3.40 – 3.59 V / 20 – 84%</StyledTableCell>
                        <StyledTableCell>&lt; 3.40 V / &lt; 20%</StyledTableCell>
                      </StyledTableRow>
                      <StyledTableRow>
                        <StyledTableCell>Contadores de reporte</StyledTableCell>
                        <StyledTableCell colSpan={3}>
                          Se muestran successReportTimes y totalReportTimes. No disparan alerta: en los NB
                          el primero se queda fijo mientras el segundo sube.
                        </StyledTableCell>
                      </StyledTableRow>
                    </TableBody>
                  </Table>
                </StyledTableContainer>
              </CardContent>
            </Card>
            </>
            )}

            {section === 'historico' && (
            <Card variant="outlined" sx={{ mb: 1.5, borderRadius: 2 }}>
              <CardHeader
                title="Histórico de reportes"
                subheader={`${history.length} lecturas`}
                sx={{ pb: 0 }}
              />
              <CardContent sx={{ pt: 1.5 }}>
                <StyledTableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <StyledTableCellHeader>Fecha</StyledTableCellHeader>
                        <StyledTableCellHeader align="right">Volumen L</StyledTableCellHeader>
                        <StyledTableCellHeader align="right">Δ L</StyledTableCellHeader>
                        <StyledTableCellHeader align="right">Inverso L</StyledTableCellHeader>
                        <StyledTableCellHeader align="right">V</StyledTableCellHeader>
                        <StyledTableCellHeader align="right">Reserva</StyledTableCellHeader>
                        <StyledTableCellHeader>Estado</StyledTableCellHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[...deltas].reverse().map((row) => {
                        const dayAlert = evaluateMetric(row.deltaForwardL, DEMO_METRIC_RULES.consumoDiarioL);
                        const revAlert = evaluateMetric(row.reverseL, DEMO_METRIC_RULES.inversoL);
                        const worst =
                          revAlert.level === 'critico' || dayAlert.level === 'critico'
                            ? 'Crítico'
                            : revAlert.level === 'preventivo' || dayAlert.level === 'preventivo'
                              ? 'Preventivo'
                              : 'En rango';
                        const color =
                          worst === 'Crítico' ? 'error' : worst === 'Preventivo' ? 'warning' : 'success';
                        return (
                          <StyledTableRow key={row.at}>
                            <StyledTableCell>{formatWhen(row.at)}</StyledTableCell>
                            <StyledTableCell align="right">{fNumber(row.forwardL)}</StyledTableCell>
                            <StyledTableCell align="right">{row.deltaForwardL.toFixed(0)}</StyledTableCell>
                            <StyledTableCell align="right">{fNumber(row.reverseL)}</StyledTableCell>
                            <StyledTableCell align="right">{row.voltage.toFixed(3)}</StyledTableCell>
                            <StyledTableCell align="right">
                              {history.find((p) => p.at === row.at)?.remainingPower ?? '—'}%
                            </StyledTableCell>
                            <StyledTableCell>
                              <Chip size="small" color={color} label={worst} />
                            </StyledTableCell>
                          </StyledTableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </StyledTableContainer>
              </CardContent>
            </Card>
            )}
          </>
        )}
      </Box>
    </>
  );
}

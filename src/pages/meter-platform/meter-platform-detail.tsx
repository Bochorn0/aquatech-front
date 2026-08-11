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
  Divider,
  TableRow,
  Accordion,
  TableBody,
  TableHead,
  Typography,
  CardHeader,
  CardContent,
  CircularProgress,
  AccordionSummary,
  AccordionDetails,
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
import { Iconify } from 'src/components/iconify';

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

function metricValue(metrics: Metric[] | undefined, name: string) {
  return metrics?.find((m) => m.name === name)?.value;
}

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

function Kpi({
  title,
  value,
  hint,
}: {
  title: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function MeterPlatformDetailPage() {
  const { deviceCode: rawCode } = useParams();
  const deviceCode = decodeURIComponent(rawCode || '');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DetailData | null>(null);

  const load = useCallback(async () => {
    if (!deviceCode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await get<DetailResponse>(
        `/external-providers/meter-platform/devices/${encodeURIComponent(deviceCode)}`,
        { connLimit: 40 }
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

  const latestReport = useMemo(() => {
    const rows = data?.connRecords?.rows || [];
    return (
      rows.find(
        (r) =>
          String(r.direction || '').toLowerCase() === 'client'
          && String(r.type || '').toLowerCase() === 'report'
      ) || null
    );
  }, [data]);

  const reportRequest = latestReport?.analyticalParsed?.meterReportRequest || null;
  const metrics = data?.normalized?.metrics;
  const litersFwd = metricValue(metrics, 'volume_positive');
  const litersRev = metricValue(metrics, 'volume_reverse');
  const valve = metricValue(metrics, 'valve_status');
  const online = metricValue(metrics, 'online');
  const voltage = metricValue(metrics, 'voltage_meter');
  const observedAt = data?.normalized?.observedAt || latestReport?.createTime;
  const deviceType = data?.listRow?.deviceType || data?.extend?.deviceInfo?.deviceType;
  const usage = data?.usageBreakdown;
  const dailyRows = usage?.dailyUsageEnriched || usage?.last5DaysParsed?.entries || [];

  const stale =
    online !== 1
    || (observedAt
      && Date.now() - new Date(String(observedAt).replace(' ', 'T')).getTime() > 24 * 60 * 60 * 1000);

  return (
    <>
      <Helmet>
        <title>{deviceCode ? `Sitio ${deviceCode}` : 'Sitio medidor'} - {CONFIG.appName}</title>
      </Helmet>

      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 2 }}>
          <Button size="small" onClick={() => navigate('/meter-platform')}>
            ← Sitios
          </Button>
          <Box sx={{ flex: 1 }}>
            <Typography variant="overline" color="text.secondary">
              Demo · origen externo · no Tuya
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>
              {deviceCode}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {deviceType || 'Medidor'} · equivalente operativo a un punto de venta
            </Typography>
          </Box>
          <Button variant="outlined" onClick={load} disabled={loading}>
            Actualizar
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : data ? (
          <>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              <Chip
                size="small"
                color={online === 1 ? 'success' : 'warning'}
                label={online === 1 ? 'En línea' : stale ? 'Sin actualizar' : 'Desconectado'}
              />
              <Chip size="small" variant="outlined" label="Externo" />
              <Chip
                size="small"
                variant="outlined"
                label={valve === 0 ? 'Válvula abierta' : valve === 1 ? 'Válvula cerrada' : 'Válvula —'}
              />
            </Stack>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Kpi
                  title="Litros acumulados"
                  value={litersFwd != null ? fNumber(litersFwd) : '—'}
                  hint={litersFwd != null ? 'Forward · m³ × 1000' : 'Sin report de volumen'}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Kpi
                  title="Reverse (L)"
                  value={litersRev != null ? fNumber(litersRev) : '—'}
                  hint="Flujo inverso acumulado"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Kpi title="Último reporte" value={formatWhen(observedAt)} hint="Conn record / extend" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Kpi
                  title="Batería"
                  value={voltage != null ? `${voltage.toFixed(3)} V` : '—'}
                  hint="Cuando el payload lo trae"
                />
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={7}>
                <Card variant="outlined">
                  <CardHeader
                    title="Consumo diario"
                    subheader="dailyUsageMap / last5Days (si el medidor lo reporta)"
                  />
                  <CardContent>
                    {dailyRows.length ? (
                      <StyledTableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <StyledTableCellHeader>Fecha</StyledTableCellHeader>
                              <StyledTableCellHeader align="right">Litros</StyledTableCellHeader>
                              <StyledTableCellHeader align="right">Δ L</StyledTableCellHeader>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {dailyRows.map((row: any) => (
                              <StyledTableRow key={row.date}>
                                <StyledTableCell>{row.date}</StyledTableCell>
                                <StyledTableCell align="right">
                                  {fNumber(row.liters)}
                                </StyledTableCell>
                                <StyledTableCell align="right">
                                  {row.deltaLiters == null ? '—' : fNumber(row.deltaLiters)}
                                </StyledTableCell>
                              </StyledTableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </StyledTableContainer>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Este dispositivo no envía mapa diario (p. ej. el NB {deviceCode} solo trae
                        acumulado en el report). La UI queda lista para cuando exista.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={5}>
                <Card variant="outlined" sx={{ mb: 2, opacity: 0.85 }}>
                  <CardHeader title="Alertas" subheader="Próximamente" />
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Aquí irán umbrales (sin actualizar, reverse, batería baja), igual que el estado
                      preventivo/crítico de un punto de venta. No implementado en esta demo.
                    </Typography>
                  </CardContent>
                </Card>
                <Card variant="outlined" sx={{ opacity: 0.85 }}>
                  <CardHeader title="Personalización" subheader="Próximamente" />
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Binding a tienda, nombre de sitio y reglas por cliente. Por ahora el id del
                      sitio es el <code>deviceCode</code> del proveedor.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardHeader
                title="Historial de comunicación"
                subheader={`${data.connRecords?.total ?? 0} registros del proveedor`}
              />
              <CardContent>
                <StyledTableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <StyledTableCellHeader>Hora</StyledTableCellHeader>
                        <StyledTableCellHeader>Dir</StyledTableCellHeader>
                        <StyledTableCellHeader>Tipo</StyledTableCellHeader>
                        <StyledTableCellHeader>Resumen</StyledTableCellHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(data.connRecords?.rows || []).slice(0, 12).map((row) => {
                        const mr = row.analyticalParsed?.meterReportRequest;
                        const summary = mr
                          ? `${mr.currentForwardUsage ?? '—'} m³ · rev ${mr.reverseUsage ?? '—'}`
                          : '—';
                        return (
                          <StyledTableRow key={String(row.id || `${row.createTime}-${row.type}`)}>
                            <StyledTableCell>{String(row.createTime || '—')}</StyledTableCell>
                            <StyledTableCell>{String(row.direction || '—')}</StyledTableCell>
                            <StyledTableCell>{String(row.type || '—')}</StyledTableCell>
                            <StyledTableCell>
                              <Typography variant="caption" sx={{ fontFamily: 'ui-monospace, monospace' }}>
                                {summary}
                              </Typography>
                            </StyledTableCell>
                          </StyledTableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </StyledTableContainer>
              </CardContent>
            </Card>

            <Accordion>
              <AccordionSummary expandIcon={<Iconify icon="solar:alt-arrow-down-bold-duotone" width={24} />}>
                <Typography variant="subtitle2">Datos técnicos (API proveedor)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {reportRequest && (
                  <>
                    <Typography variant="caption" color="text.secondary">
                      Último meterReportRequest
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        p: 1.5,
                        maxHeight: 240,
                        overflow: 'auto',
                        bgcolor: 'grey.50',
                        fontSize: 12,
                        borderRadius: 1,
                      }}
                    >
                      {JSON.stringify(reportRequest, null, 2)}
                    </Box>
                    <Divider sx={{ my: 2 }} />
                  </>
                )}
                <Typography variant="caption" color="text.secondary">
                  deviceExtend
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    p: 1.5,
                    maxHeight: 280,
                    overflow: 'auto',
                    bgcolor: 'grey.50',
                    fontSize: 12,
                    borderRadius: 1,
                  }}
                >
                  {JSON.stringify(data.extend, null, 2)}
                </Box>
              </AccordionDetails>
            </Accordion>
          </>
        ) : null}
      </Box>
    </>
  );
}

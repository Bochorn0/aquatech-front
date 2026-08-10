import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Box,
  Chip,
  Grid,
  Paper,
  Table,
  Alert,
  Stack,
  Button,
  Divider,
  TableRow,
  TableBody,
  TableHead,
  Typography,
  CircularProgress,
} from '@mui/material';

import {
  StyledTableRow,
  StyledTableCell,
  StyledTableContainer,
  StyledTableCellHeader,
} from 'src/utils/styles';
import { get } from 'src/api/axiosHelperV2';

type Metric = { name: string; type: string; value: number; unit: string };

type DetailData = {
  deviceCode: string;
  listRow: Record<string, unknown> | null;
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
};

type DetailResponse = {
  success: boolean;
  message?: string;
  data?: DetailData;
};

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Paper
      elevation={0}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2, overflow: 'hidden' }}
    >
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      <Box sx={{ p: 2 }}>{children}</Box>
    </Paper>
  );
}

function KvGrid({ data, preferKeys }: { data: Record<string, unknown> | null | undefined; preferKeys?: string[] }) {
  if (!data || typeof data !== 'object') {
    return (
      <Typography variant="body2" color="text.secondary">
        Sin datos
      </Typography>
    );
  }

  const entries = Object.entries(data).filter(([, v]) => {
    if (v == null) return false;
    if (typeof v === 'object') return false; // nested shown elsewhere / raw JSON
    return true;
  });

  const ordered = preferKeys?.length
    ? [
        ...preferKeys
          .map((k) => entries.find(([ek]) => ek === k))
          .filter(Boolean) as [string, unknown][],
        ...entries.filter(([k]) => !preferKeys.includes(k)),
      ]
    : entries;

  if (!ordered.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        Sin campos planos (ver JSON crudo abajo)
      </Typography>
    );
  }

  return (
    <Grid container spacing={1.5}>
      {ordered.map(([key, value]) => (
        <Grid item xs={12} sm={6} md={4} key={key}>
          <Typography variant="caption" color="text.secondary" display="block">
            {key}
          </Typography>
          <Typography variant="body2" sx={{ wordBreak: 'break-word', fontFamily: 'ui-monospace, monospace' }}>
            {String(value)}
          </Typography>
        </Grid>
      ))}
    </Grid>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 1.5,
        maxHeight: 360,
        overflow: 'auto',
        bgcolor: 'grey.50',
        borderRadius: 1,
        fontSize: 12,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {JSON.stringify(value, null, 2)}
    </Box>
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

  const deviceInfo = data?.extend?.deviceInfo || null;
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
  const dailyMap = reportRequest?.dailyUsageMap || data?.normalized?.rawMeta?.dailyUsageMap || null;
  const usage = data?.usageBreakdown;

  return (
    <>
      <Helmet>
        <title>{deviceCode ? `Medidor ${deviceCode}` : 'Detalle medidor'}</title>
      </Helmet>

      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
          <Button size="small" onClick={() => navigate('/meter-platform')}>
            ← Lista
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>
            {deviceCode}
          </Typography>
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
            <Section title="Resumen normalizado" subtitle="Vista Aquatech a partir de extend + último report">
              {data.normalized ? (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Observado: {new Date(data.normalized.observedAt).toLocaleString()}
                  </Typography>
                  <Grid container spacing={1.5}>
                    {data.normalized.metrics.map((m) => (
                      <Grid item xs={6} sm={4} md={3} key={m.name}>
                        <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
                          <Typography variant="caption" color="text.secondary">
                            {m.name}
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                            {typeof m.value === 'number' ? m.value.toLocaleString() : m.value}
                            {m.unit ? (
                              <Typography component="span" variant="caption" sx={{ ml: 0.5 }}>
                                {m.unit}
                              </Typography>
                            ) : null}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </>
              ) : (
                <Alert severity="warning">{data.normalizeError || 'Sin métricas normalizadas'}</Alert>
              )}
            </Section>

            <Section title="Perfil en lista / deviceInfo" subtitle="getDeviceInfoList + GET /device/deviceInfo/{id}">
              <KvGrid
                data={(data.profile || data.listRow || deviceInfo) as Record<string, unknown>}
                preferKeys={[
                  'deviceCode',
                  'deviceType',
                  'isOnline',
                  'valveStatus',
                  'totalMetering',
                  'lastConnTime',
                  'companyId',
                  'accessProtocol',
                  'installAddress',
                ]}
              />
              {deviceInfo && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    deviceInfo (desde deviceExtend)
                  </Typography>
                  <KvGrid data={deviceInfo} />
                </>
              )}
            </Section>

            <Section title="deviceExtend" subtitle="GET /device/deviceInfo/deviceExtend/{deviceCode}">
              <KvGrid
                data={data.extend as Record<string, unknown>}
                preferKeys={[
                  'meterNo',
                  'meterStatus',
                  'valveDesc',
                  'updateTime',
                  'terminalClock',
                  'address',
                  'last5DaysDailyUsage',
                  'yesterdayHourlyUsage',
                ]}
              />
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                JSON completo
              </Typography>
              <JsonBlock value={data.extend} />
            </Section>

            <Section
              title="Uso diario (last5Days / dailyUsageMap)"
              subtitle="Unidad: m³ (protocolo ×1000). No son pulsos ni flujo instantáneo."
            >
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" component="div">
                  <strong>last5DaysDailyUsage</strong> es hex empaquetado del objeto protocolo{' '}
                  <code>1101H</code>: fecha inicio (BCD) + N días × 4 bytes. Cada entero va{' '}
                  <strong>×1000 → m³</strong> (igual que el volumen acumulado). Conversión:{' '}
                  <code>m³ = raw / 1000</code>, <code>litros = raw</code>.
                  <br />
                  <strong>dailyUsageMap</strong> ya viene en m³. En el ejemplo del PDF los valores suben
                  hasta el total del medidor → parecen <em>totales al cierre del día</em>; el consumo del
                  día ≈ diferencia entre días consecutivos (columna Δ).
                </Typography>
              </Alert>

              {usage?.last5DaysParsed?.entries?.length ? (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Decodificado last5Days — inicio {usage.last5DaysParsed.startDate} (
                    {usage.last5DaysParsed.days} días)
                  </Typography>
                  <StyledTableContainer sx={{ mb: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <StyledTableCellHeader>Fecha</StyledTableCellHeader>
                          <StyledTableCellHeader align="right">raw (×1000)</StyledTableCellHeader>
                          <StyledTableCellHeader align="right">m³</StyledTableCellHeader>
                          <StyledTableCellHeader align="right">Litros</StyledTableCellHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {usage.last5DaysParsed.entries.map((row: any) => (
                          <StyledTableRow key={row.date}>
                            <StyledTableCell>{row.date}</StyledTableCell>
                            <StyledTableCell align="right">{row.raw}</StyledTableCell>
                            <StyledTableCell align="right">{row.m3}</StyledTableCell>
                            <StyledTableCell align="right">{row.liters?.toLocaleString?.() ?? row.liters}</StyledTableCell>
                          </StyledTableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </StyledTableContainer>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    Raw hex: {String(usage.last5DaysDailyUsageRaw || '')}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Sin last5Days parseable ({String(data.extend?.last5DaysDailyUsage || '—')})
                </Typography>
              )}

              {(usage?.dailyUsageEnriched?.length || (dailyMap && Object.keys(dailyMap).length)) ? (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    dailyUsageMap (m³) + Δ día
                  </Typography>
                  <StyledTableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <StyledTableCellHeader>Fecha</StyledTableCellHeader>
                          <StyledTableCellHeader align="right">m³</StyledTableCellHeader>
                          <StyledTableCellHeader align="right">Litros</StyledTableCellHeader>
                          <StyledTableCellHeader align="right">Δ m³</StyledTableCellHeader>
                          <StyledTableCellHeader align="right">Δ L</StyledTableCellHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(usage?.dailyUsageEnriched
                          || Object.entries(dailyMap || {}).map(([date, m3]) => ({
                            date,
                            m3,
                            liters: Number(m3) * 1000,
                            deltaM3: null,
                            deltaLiters: null,
                          }))
                        ).map((row: any) => (
                          <StyledTableRow key={row.date}>
                            <StyledTableCell>{row.date}</StyledTableCell>
                            <StyledTableCell align="right">{row.m3}</StyledTableCell>
                            <StyledTableCell align="right">
                              {Number(row.liters).toLocaleString()}
                            </StyledTableCell>
                            <StyledTableCell align="right">
                              {row.deltaM3 == null ? '—' : row.deltaM3}
                            </StyledTableCell>
                            <StyledTableCell align="right">
                              {row.deltaLiters == null ? '—' : Number(row.deltaLiters).toLocaleString()}
                            </StyledTableCell>
                          </StyledTableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </StyledTableContainer>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Sin dailyUsageMap en el último report.
                </Typography>
              )}
            </Section>

            <Section
              title="Último report (conn record)"
              subtitle="GET /device/deviceConnRecord/list — client/report + analyticalBody"
            >
              {reportRequest ? (
                <>
                  <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap">
                    <Chip size="small" label={`type: ${latestReport?.type}`} />
                    <Chip size="small" label={String(latestReport?.createTime || '')} />
                  </Stack>
                  <KvGrid
                    data={reportRequest}
                    preferKeys={[
                      'meterNo',
                      'terminalClock',
                      'currentForwardUsage',
                      'reverseUsage',
                      'batteryVoltage',
                      'signalStrength',
                      'valveDesc',
                      'meterStatus',
                      'reportType',
                      'powerType',
                    ]}
                  />
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No hay report client parseable en los últimos registros.
                </Typography>
              )}
            </Section>

            <Section title="Historial de comunicación" subtitle={`${data.connRecords?.total ?? 0} registros`}>
              <StyledTableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <StyledTableCellHeader>Hora</StyledTableCellHeader>
                      <StyledTableCellHeader>Dir</StyledTableCellHeader>
                      <StyledTableCellHeader>Tipo</StyledTableCellHeader>
                      <StyledTableCellHeader>Resumen parseado</StyledTableCellHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data.connRecords?.rows || []).map((row) => {
                      const parsed = row.analyticalParsed;
                      const mr = parsed?.meterReportRequest;
                      const summary = mr
                        ? `fwd=${mr.currentForwardUsage} rev=${mr.reverseUsage} bat=${mr.batteryVoltage} valve=${mr.valveDesc || ''}`
                        : parsed
                          ? Object.keys(parsed).slice(0, 4).join(', ')
                          : (row.analyticalBody || '').toString().slice(0, 80);
                      return (
                        <StyledTableRow key={String(row.id || `${row.createTime}-${row.type}`)}>
                          <StyledTableCell>{String(row.createTime || '—')}</StyledTableCell>
                          <StyledTableCell>{String(row.direction || '—')}</StyledTableCell>
                          <StyledTableCell>{String(row.type || '—')}</StyledTableCell>
                          <StyledTableCell>
                            <Typography variant="caption" sx={{ fontFamily: 'ui-monospace, monospace' }}>
                              {summary || '—'}
                            </Typography>
                          </StyledTableCell>
                        </StyledTableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </StyledTableContainer>
            </Section>

            <Section title="Reportes diarios (static/list)" subtitle="GET /device/static/list">
              {(data.staticReports || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Sin filas static para este device (o el filtro del vendor no devolvió match).
                </Typography>
              ) : (
                <StyledTableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <StyledTableCellHeader>Fecha</StyledTableCellHeader>
                        <StyledTableCellHeader>Campos</StyledTableCellHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.staticReports.map((row, idx) => (
                        <StyledTableRow key={idx}>
                          <StyledTableCell>
                            {String(
                              (row as any).createTime
                                || (row as any).reportDate
                                || (row as any).day
                                || '—'
                            )}
                          </StyledTableCell>
                          <StyledTableCell>
                            <Typography variant="caption" component="div" sx={{ fontFamily: 'ui-monospace, monospace' }}>
                              {Object.entries(row)
                                .filter(([, v]) => v != null && typeof v !== 'object')
                                .slice(0, 12)
                                .map(([k, v]) => `${k}=${v}`)
                                .join(' · ')}
                            </Typography>
                          </StyledTableCell>
                        </StyledTableRow>
                      ))}
                    </TableBody>
                  </Table>
                </StyledTableContainer>
              )}
            </Section>

            {(data.fetchErrors && Object.values(data.fetchErrors).some(Boolean)) && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Algunos fetches parciales fallaron:{' '}
                {Object.entries(data.fetchErrors)
                  .filter(([, v]) => v)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' | ')}
              </Alert>
            )}
          </>
        ) : null}
      </Box>
    </>
  );
}

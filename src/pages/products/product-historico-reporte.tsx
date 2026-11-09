import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import { useParams } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';

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
  Switch,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  Typography,
  ToggleButton,
  TableContainer,
  CircularProgress,
  FormControlLabel,
  ToggleButtonGroup,
} from '@mui/material';

import axiosInstance from 'src/api/axiosInstance';

type ReportMode = 'detail' | 'daily';

type ReportPreviewRow = Record<string, string>;

type ReportCountResponse = {
  success: boolean;
  total?: number;
  raw_total?: number;
  preview?: ReportPreviewRow[];
  message?: string;
  meta?: {
    max_rows?: number;
    exceeds_detail_limit?: boolean;
    raw_total?: number;
  };
};

const DETAIL_PREVIEW_COLUMNS: { key: string; label: string }[] = [
  { key: 'fecha_hermosillo', label: 'Fecha' },
  { key: 'tds_ppm', label: 'TDS (ppm)' },
  { key: 'volumen_produccion_l', label: 'Vol. prod. (L)' },
  { key: 'volumen_rechazo_l', label: 'Vol. rech. (L)' },
  { key: 'flujo_produccion_l_min', label: 'Flujo prod. (L/min)' },
  { key: 'flujo_rechazo_l_min', label: 'Flujo rech. (L/min)' },
  { key: 'origen', label: 'Origen' },
];

const DAILY_PREVIEW_COLUMNS: { key: string; label: string }[] = [
  { key: 'dia', label: 'Día' },
  { key: 'muestras', label: 'Muestras' },
  { key: 'tds_inicio_ppm', label: 'TDS inicio' },
  { key: 'tds_fin_ppm', label: 'TDS fin' },
  { key: 'volumen_produccion_delta_l', label: 'Δ vol. prod. (L)' },
  { key: 'volumen_rechazo_delta_l', label: 'Δ vol. rech. (L)' },
  { key: 'flujo_produccion_prom_l_min', label: 'Flujo prod. prom.' },
  { key: 'flujo_rechazo_prom_l_min', label: 'Flujo rech. prom.' },
];

const RANGE_PRESETS: { label: string; days: number }[] = [
  { label: 'Últimos 7 días', days: 7 },
  { label: 'Últimos 30 días', days: 30 },
  { label: 'Últimos 90 días', days: 90 },
  { label: 'Último año', days: 365 },
];

function reportParams(options: {
  mode: ReportMode;
  excludeZeros: boolean;
  useRange: boolean;
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  countOnly?: boolean;
}): Record<string, string> {
  const params: Record<string, string> = { mode: options.mode };
  if (options.excludeZeros) params.exclude_zeros = '1';
  if (options.countOnly) params.count_only = '1';
  if (options.useRange && options.startDate && options.endDate) {
    params.start_date = String(options.startDate.valueOf());
    params.end_date = String(options.endDate.valueOf());
  }
  return params;
}

async function readAxiosMessage(error: unknown): Promise<string> {
  const err = error as { response?: { data?: unknown }; message?: string };
  const data = err.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const body = JSON.parse(text) as { message?: string };
      if (body?.message) return body.message;
    } catch {
      /* el cuerpo no era JSON */
    }
  }
  if (data && typeof data === 'object' && 'message' in data) {
    const { message } = data as { message?: string };
    if (message) return message;
  }
  return err.message || 'No se pudo generar el reporte';
}

export default function ProductHistoricoReporte() {
  const { id } = useParams<{ id: string }>();
  const [mode, setMode] = useState<ReportMode>('detail');
  const [useRange, setUseRange] = useState(false);
  const [excludeZeros, setExcludeZeros] = useState(false);
  const [startDate, setStartDate] = useState<Dayjs | null>(() => dayjs().subtract(30, 'day').startOf('day'));
  const [endDate, setEndDate] = useState<Dayjs | null>(() => dayjs());
  const [total, setTotal] = useState<number | null>(null);
  const [rawTotal, setRawTotal] = useState<number | null>(null);
  const [maxRows, setMaxRows] = useState(200000);
  const [exceedsDetailLimit, setExceedsDetailLimit] = useState(false);
  const [preview, setPreview] = useState<ReportPreviewRow[]>([]);
  const [countLoading, setCountLoading] = useState(false);
  const [countError, setCountError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const requestId = useRef(0);

  const rangeInvalid =
    useRange &&
    (!startDate ||
      !endDate ||
      !startDate.isValid() ||
      !endDate.isValid() ||
      !startDate.isBefore(endDate));

  const detailBlocked = mode === 'detail' && exceedsDetailLimit;
  const canDownload = Boolean(id) && !rangeInvalid && !countLoading && !downloading && total != null && total > 0 && !detailBlocked;

  useEffect(() => {
    if (!id) return undefined;
    if (rangeInvalid) {
      setTotal(null);
      setRawTotal(null);
      setPreview([]);
      setCountError(null);
      setExceedsDetailLimit(false);
      return undefined;
    }

    requestId.current += 1;
    const myId = requestId.current;
    const timer = window.setTimeout(async () => {
      setCountLoading(true);
      setCountError(null);
      try {
        const response = await axiosInstance.get<ReportCountResponse>(
          `/products/${encodeURIComponent(id)}/logs/reporte`,
          {
            params: reportParams({
              mode,
              excludeZeros,
              useRange,
              startDate,
              endDate,
              countOnly: true,
            }),
          }
        );
        if (myId !== requestId.current) return;
        const body = response.data;
        setTotal(Number(body.total) || 0);
        setRawTotal(Number(body.raw_total ?? body.meta?.raw_total) || 0);
        setPreview(Array.isArray(body.preview) ? body.preview : []);
        setMaxRows(Number(body.meta?.max_rows) || 200000);
        setExceedsDetailLimit(Boolean(body.meta?.exceeds_detail_limit));
      } catch (error) {
        if (myId !== requestId.current) return;
        setTotal(null);
        setRawTotal(null);
        setPreview([]);
        setExceedsDetailLimit(false);
        setCountError(await readAxiosMessage(error));
      } finally {
        if (myId === requestId.current) setCountLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [id, mode, excludeZeros, useRange, rangeInvalid, startDate, endDate]);

  const applyPreset = (days: number) => {
    setUseRange(true);
    setStartDate(dayjs().subtract(days, 'day').startOf('day'));
    setEndDate(dayjs());
  };

  const downloadReport = async () => {
    if (!id || !canDownload) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const response = await axiosInstance.get(`/products/${encodeURIComponent(id)}/logs/reporte`, {
        params: reportParams({ mode, excludeZeros, useRange, startDate, endDate }),
        responseType: 'blob',
      });
      const blob = response.data as Blob;
      const contentType = String(response.headers['content-type'] || blob.type || '');
      if (contentType.includes('application/json')) {
        setDownloadError(await readAxiosMessage({ response: { data: blob } }));
        return;
      }
      const stamp = dayjs().format('YYYY-MM-DD');
      const kind = mode === 'daily' ? 'por_dia' : 'registros';
      const filename = `reporte_${kind}_${id}_${stamp}.csv`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDownloadError(await readAxiosMessage(error));
    } finally {
      setDownloading(false);
    }
  };

  const columns = mode === 'daily' ? DAILY_PREVIEW_COLUMNS : DETAIL_PREVIEW_COLUMNS;

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Reportería
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Descarga el historial guardado en <code>product_logs</code> de este equipo. No consulta Tuya y no usa el
        límite de la tabla de abajo. Sin rango se incluye todo el historial. El archivo va del registro más antiguo
        al más reciente. Los flujos en L/min son el valor crudo ÷ 10, igual que en la tabla.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 1 }}>
        <FormControlLabel
          control={<Switch checked={useRange} onChange={(_e, checked) => setUseRange(checked)} />}
          label="Usar rango de fechas"
        />
        <FormControlLabel
          control={<Switch checked={excludeZeros} onChange={(_e, checked) => setExcludeZeros(checked)} />}
          label="Omitir registros en cero"
        />
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
        Omitir en cero quita las filas donde TDS, volúmenes, flujos y temperatura están vacíos o en 0. Si la fila
        tiene al menos una medición distinta de 0, se incluye.
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Formato del archivo
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={mode}
          onChange={(_e, value: ReportMode | null) => value && setMode(value)}
        >
          <ToggleButton value="detail">Cada registro</ToggleButton>
          <ToggleButton value="daily">Resumen por día</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          {mode === 'daily'
            ? 'Un renglón por día (America/Hermosillo). El volumen es la diferencia del contador acumulado y el flujo es el promedio en L/min.'
            : 'Una fila por cada log guardado, con la fecha en America/Hermosillo y en UTC.'}
        </Typography>
      </Box>

      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
        <Chip
          label="Todo el historial"
          size="small"
          color={!useRange ? 'primary' : 'default'}
          variant={!useRange ? 'filled' : 'outlined'}
          onClick={() => setUseRange(false)}
        />
        {RANGE_PRESETS.map((preset) => (
          <Chip
            key={preset.label}
            label={preset.label}
            size="small"
            variant="outlined"
            onClick={() => applyPreset(preset.days)}
          />
        ))}
      </Stack>

      {useRange && (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={4}>
              <DateTimePicker
                label="Fecha inicio"
                value={startDate}
                onChange={setStartDate}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DateTimePicker
                label="Fecha fin"
                value={endDate}
                onChange={setEndDate}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
          </Grid>
        </LocalizationProvider>
      )}
      {useRange && !rangeInvalid && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          El rango usa la hora de este navegador. En el archivo, el día y la hora se muestran en America/Hermosillo.
        </Typography>
      )}

      {rangeInvalid && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Indica una fecha inicial anterior a la final.
        </Alert>
      )}
      {countError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {countError}
        </Alert>
      )}
      {downloadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {downloadError}
        </Alert>
      )}
      {detailBlocked && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Hay {(rawTotal ?? 0).toLocaleString('es-MX')} registros y el máximo de «Cada registro» es{' '}
          {maxRows.toLocaleString('es-MX')}. Usa un rango de fechas o descarga el resumen por día.
        </Alert>
      )}
      {!countLoading && !rangeInvalid && !countError && total === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No hay registros con esos filtros.
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
        <Button variant="contained" onClick={downloadReport} disabled={!canDownload}>
          {downloading ? 'Descargando…' : 'Descargar CSV'}
        </Button>
        {countLoading ? (
          <CircularProgress size={22} />
        ) : (
          total != null &&
          !rangeInvalid && (
            <Chip
              variant="outlined"
              label={
                mode === 'daily'
                  ? `${total.toLocaleString('es-MX')} días · ${(rawTotal ?? 0).toLocaleString('es-MX')} registros`
                  : `${total.toLocaleString('es-MX')} registros`
              }
            />
          )
        )}
      </Stack>

      {!countLoading && preview.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Vista previa (los más recientes)
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell key={column.key}>{column.label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.map((row, index) => (
                  <TableRow key={`${row.fecha_utc || row.dia || index}-${index}`}>
                    {columns.map((column) => (
                      <TableCell key={column.key}>{row[column.key] || '—'}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Paper>
  );
}

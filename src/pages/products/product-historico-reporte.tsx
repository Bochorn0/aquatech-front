import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
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
  Switch,
  Popover,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TextField,
  Typography,
  ToggleButton,
  TableContainer,
  TablePagination,
  CircularProgress,
  FormControlLabel,
  ToggleButtonGroup,
} from '@mui/material';

import axiosInstance from 'src/api/axiosInstance';

type ReportMode = 'detail' | 'daily';
type SortDir = 'asc' | 'desc';
type ColumnKind = 'number' | 'text' | 'time';

type ColumnDef = { key: string; label: string; kind: ColumnKind };
type ColumnFilter = { min?: string; max?: string; text?: string };
type ColumnFilterMap = Record<string, ColumnFilter>;

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
    page?: number;
    page_size?: number;
    first_record?: string | null;
    last_record?: string | null;
  };
};

const DETAIL_COLUMNS: ColumnDef[] = [
  { key: 'fecha_hermosillo', label: 'Fecha', kind: 'time' },
  { key: 'tds_ppm', label: 'TDS (ppm)', kind: 'number' },
  { key: 'volumen_produccion_l', label: 'Vol. prod. (L)', kind: 'number' },
  { key: 'volumen_rechazo_l', label: 'Vol. rech. (L)', kind: 'number' },
  { key: 'flujo_produccion_l_min', label: 'Flujo prod. (L/min)', kind: 'number' },
  { key: 'flujo_rechazo_l_min', label: 'Flujo rech. (L/min)', kind: 'number' },
  { key: 'temperatura', label: 'Temp.', kind: 'number' },
  { key: 'origen', label: 'Origen', kind: 'text' },
];

const DAILY_COLUMNS: ColumnDef[] = [
  { key: 'dia', label: 'Día', kind: 'time' },
  { key: 'muestras', label: 'Muestras', kind: 'number' },
  { key: 'tds_inicio_ppm', label: 'TDS inicio', kind: 'number' },
  { key: 'tds_fin_ppm', label: 'TDS fin', kind: 'number' },
  { key: 'volumen_produccion_delta_l', label: 'Δ vol. prod. (L)', kind: 'number' },
  { key: 'volumen_rechazo_delta_l', label: 'Δ vol. rech. (L)', kind: 'number' },
  { key: 'flujo_produccion_prom_l_min', label: 'Flujo prod. prom.', kind: 'number' },
  { key: 'flujo_rechazo_prom_l_min', label: 'Flujo rech. prom.', kind: 'number' },
];

const QUICK_FILTERS: Record<ReportMode, { key: string; label: string }[]> = {
  detail: [
    { key: 'tds_ppm', label: 'Con TDS' },
    { key: 'flujo_produccion_l_min', label: 'Con flujo prod.' },
    { key: 'flujo_rechazo_l_min', label: 'Con flujo rech.' },
    { key: 'volumen_produccion_l', label: 'Con volumen' },
  ],
  daily: [
    { key: 'tds_inicio_ppm', label: 'Con TDS' },
    { key: 'flujo_produccion_prom_l_min', label: 'Con flujo prod.' },
    { key: 'volumen_produccion_delta_l', label: 'Con Δ prod.' },
  ],
};

const QUICK_MIN = '0.01';

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
  sort: string;
  order: SortDir;
  columnFilters: ColumnFilterMap;
  page?: number;
  rowsPerPage?: number;
  countOnly?: boolean;
}): Record<string, string> {
  const params: Record<string, string> = {
    mode: options.mode,
    sort: options.sort,
    order: options.order,
  };
  if (options.excludeZeros) params.exclude_zeros = '1';
  if (options.countOnly) params.count_only = '1';
  if (options.page != null) params.page = String(options.page);
  if (options.rowsPerPage != null) params.page_size = String(options.rowsPerPage);
  if (options.useRange && options.startDate && options.endDate) {
    params.start_date = String(options.startDate.valueOf());
    params.end_date = String(options.endDate.valueOf());
  }
  Object.entries(options.columnFilters).forEach(([key, filter]) => {
    const text = filter.text?.trim();
    if (text) params[`col_${key}`] = text;
    if (filter.min?.trim()) params[`col_${key}_min`] = filter.min.trim().replace(',', '.');
    if (filter.max?.trim()) params[`col_${key}_max`] = filter.max.trim().replace(',', '.');
  });
  return params;
}

function filterIsActive(filter?: ColumnFilter): boolean {
  if (!filter) return false;
  return Boolean(filter.text?.trim() || filter.min?.trim() || filter.max?.trim());
}

function filterSummary(column: ColumnDef, filter: ColumnFilter): string {
  if (column.kind === 'text') return `${column.label}: ${filter.text}`;
  const min = filter.min?.trim();
  const max = filter.max?.trim();
  if (min && max) return `${column.label}: ${min}–${max}`;
  if (min) return `${column.label} ≥ ${min}`;
  return `${column.label} ≤ ${max}`;
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
  const [firstRecord, setFirstRecord] = useState<string | null>(null);
  const [lastRecord, setLastRecord] = useState<string | null>(null);
  const [preview, setPreview] = useState<ReportPreviewRow[]>([]);
  const [countLoading, setCountLoading] = useState(false);
  const [countError, setCountError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortKey, setSortKey] = useState('fecha_hermosillo');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [columnFilters, setColumnFilters] = useState<ColumnFilterMap>({});
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [filterColumnKey, setFilterColumnKey] = useState<string | null>(null);
  const [draftMin, setDraftMin] = useState('');
  const [draftMax, setDraftMax] = useState('');
  const [draftText, setDraftText] = useState('');
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
      setFirstRecord(null);
      setLastRecord(null);
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
              sort: sortKey,
              order: sortDir,
              columnFilters,
              page: page + 1,
              rowsPerPage,
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
        setFirstRecord(body.meta?.first_record || null);
        setLastRecord(body.meta?.last_record || null);
        const serverPage = Number(body.meta?.page);
        if (Number.isFinite(serverPage) && serverPage >= 1 && serverPage - 1 < page) {
          setPage(serverPage - 1);
        }
      } catch (error) {
        if (myId !== requestId.current) return;
        setTotal(null);
        setRawTotal(null);
        setPreview([]);
        setExceedsDetailLimit(false);
        setFirstRecord(null);
        setLastRecord(null);
        setCountError(await readAxiosMessage(error));
      } finally {
        if (myId === requestId.current) setCountLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [id, mode, excludeZeros, useRange, rangeInvalid, startDate, endDate, sortKey, sortDir, columnFilters, page, rowsPerPage]);

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
        params: reportParams({
          mode,
          excludeZeros,
          useRange,
          startDate,
          endDate,
          sort: sortKey,
          order: sortDir,
          columnFilters,
        }),
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

  const columns = mode === 'daily' ? DAILY_COLUMNS : DETAIL_COLUMNS;
  const openColumn = columns.find((column) => column.key === filterColumnKey) ?? null;
  const activeFilters = useMemo(
    () => columns.filter((column) => filterIsActive(columnFilters[column.key])),
    [columns, columnFilters]
  );

  const resetTable = (nextMode?: ReportMode) => {
    setPage(0);
    setColumnFilters({});
    setSortKey(nextMode === 'daily' ? 'dia' : 'fecha_hermosillo');
    setSortDir('desc');
    setFilterAnchor(null);
    setFilterColumnKey(null);
  };

  const openFilter = (target: HTMLElement, column: ColumnDef) => {
    const current = columnFilters[column.key] ?? {};
    setFilterAnchor(target);
    setFilterColumnKey(column.key);
    setDraftMin(current.min ?? '');
    setDraftMax(current.max ?? '');
    setDraftText(current.text ?? '');
  };

  const applyColumnFilter = () => {
    if (!filterColumnKey || !openColumn) return;
    const next: ColumnFilter =
      openColumn.kind === 'text'
        ? { text: draftText.trim() }
        : { min: draftMin.trim(), max: draftMax.trim() };
    setColumnFilters((prev) => {
      const copy = { ...prev };
      if (filterIsActive(next)) copy[filterColumnKey] = next;
      else delete copy[filterColumnKey];
      return copy;
    });
    setPage(0);
    setFilterAnchor(null);
  };

  const clearColumnFilter = (key: string) => {
    setColumnFilters((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    setPage(0);
    setFilterAnchor(null);
  };

  const toggleQuickFilter = (key: string) => {
    setColumnFilters((prev) => {
      const current = prev[key];
      const copy = { ...prev };
      if (current?.min === QUICK_MIN && !current.max?.trim()) delete copy[key];
      else copy[key] = { ...current, min: QUICK_MIN };
      return copy;
    });
    setPage(0);
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Reportería
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Descarga el historial guardado en <code>product_logs</code> de este equipo. No consulta Tuya. La tabla de
        abajo se pagina y el CSV sale con el mismo orden y los mismos filtros. Los flujos en L/min son el valor crudo
        ÷ 10.
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
          onChange={(_e, value: ReportMode | null) => {
            if (!value || value === mode) return;
            setMode(value);
            resetTable(value);
          }}
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
          Hay {(total ?? 0).toLocaleString('es-MX')} registros con estos filtros y el máximo de «Cada registro» es{' '}
          {maxRows.toLocaleString('es-MX')}. Acota la tabla o descarga el resumen por día.
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
                  : activeFilters.length > 0
                    ? `${total.toLocaleString('es-MX')} coinciden de ${(rawTotal ?? 0).toLocaleString('es-MX')}`
                    : `${total.toLocaleString('es-MX')} registros`
              }
            />
          )
        )}
        {firstRecord && <Chip variant="outlined" label={`Primer registro: ${firstRecord}`} />}
        {lastRecord && <Chip variant="outlined" label={`Último registro: ${lastRecord}`} />}
      </Stack>

      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
        {QUICK_FILTERS[mode].map((quick) => {
          const active = columnFilters[quick.key]?.min === QUICK_MIN;
          return (
            <Chip
              key={quick.key}
              size="small"
              label={quick.label}
              color={active ? 'primary' : 'default'}
              variant={active ? 'filled' : 'outlined'}
              onClick={() => toggleQuickFilter(quick.key)}
            />
          );
        })}
      </Stack>
      {activeFilters.length > 0 && (
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
          {activeFilters.map((column) => (
            <Chip
              key={column.key}
              size="small"
              label={filterSummary(column, columnFilters[column.key])}
              onDelete={() => clearColumnFilter(column.key)}
            />
          ))}
          <Chip
            size="small"
            variant="outlined"
            label="Limpiar filtros"
            onClick={() => {
              setColumnFilters({});
              setPage(0);
            }}
          />
        </Stack>
      )}
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        Haz clic en un título para ordenar o filtrar esa columna.
      </Typography>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((column) => {
                const sorted = sortKey === column.key;
                const filtered = filterIsActive(columnFilters[column.key]);
                const arrow = sorted ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';
                return (
                  <TableCell key={column.key} sx={{ whiteSpace: 'nowrap' }}>
                    <Button
                      size="small"
                      color={filtered || sorted ? 'primary' : 'inherit'}
                      onClick={(event) => openFilter(event.currentTarget, column)}
                      sx={{ textTransform: 'none', fontWeight: filtered || sorted ? 700 : 500, px: 0.5 }}
                    >
                      {column.label}
                      {arrow}
                      {filtered ? ' •' : ''}
                    </Button>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {countLoading && preview.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  <CircularProgress size={22} />
                </TableCell>
              </TableRow>
            ) : preview.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  No hay registros con esos filtros
                </TableCell>
              </TableRow>
            ) : (
              preview.map((row, index) => (
                <TableRow key={`${row.fecha_utc || row.dia || index}-${index}`}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>{row[column.key] || '—'}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total ?? 0}
        page={page}
        onPageChange={(_event, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[25, 50, 100]}
        labelRowsPerPage="Filas"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
      />
      <Popover
        open={Boolean(filterAnchor && openColumn)}
        anchorEl={filterAnchor}
        onClose={() => setFilterAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        {openColumn && (
          <Box sx={{ p: 2, width: 260 }}>
            <Typography variant="subtitle2" gutterBottom>
              {openColumn.label}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
              <Button
                size="small"
                variant={sortKey === openColumn.key && sortDir === 'asc' ? 'contained' : 'outlined'}
                onClick={() => {
                  setSortKey(openColumn.key);
                  setSortDir('asc');
                  setPage(0);
                }}
              >
                {openColumn.kind === 'time' ? 'Más antiguo' : 'Menor'}
              </Button>
              <Button
                size="small"
                variant={sortKey === openColumn.key && sortDir === 'desc' ? 'contained' : 'outlined'}
                onClick={() => {
                  setSortKey(openColumn.key);
                  setSortDir('desc');
                  setPage(0);
                }}
              >
                {openColumn.kind === 'time' ? 'Más reciente' : 'Mayor'}
              </Button>
            </Stack>
            {openColumn.kind === 'text' && (
              <TextField
                size="small"
                fullWidth
                label="Contiene"
                value={draftText}
                onChange={(event) => setDraftText(event.target.value)}
                sx={{ mb: 1.5 }}
              />
            )}
            {openColumn.kind === 'number' && (
              <Stack spacing={1} sx={{ mb: 1.5 }}>
                <TextField
                  size="small"
                  label="Mínimo"
                  value={draftMin}
                  onChange={(event) => setDraftMin(event.target.value)}
                />
                <TextField
                  size="small"
                  label="Máximo"
                  value={draftMax}
                  onChange={(event) => setDraftMax(event.target.value)}
                />
              </Stack>
            )}
            {openColumn.kind !== 'time' && (
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="contained" onClick={applyColumnFilter}>
                  Aplicar
                </Button>
                <Button size="small" onClick={() => clearColumnFilter(openColumn.key)}>
                  Quitar
                </Button>
              </Stack>
            )}
          </Box>
        )}
      </Popover>
    </Paper>
  );
}

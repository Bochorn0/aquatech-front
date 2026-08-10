import { Helmet } from 'react-helmet-async';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Box,
  Chip,
  Paper,
  Table,
  Alert,
  Button,
  TableRow,
  TableBody,
  TableHead,
  Typography,
  IconButton,
  CircularProgress,
} from '@mui/material';

import {
  StyledTableRow,
  StyledTableCell,
  StyledTableContainer,
  StyledTableCellHeader,
} from 'src/utils/styles';
import { get } from 'src/api/axiosHelperV2';
import { SvgColor } from 'src/components/svg-color';

type MeterDeviceRow = {
  id?: number;
  deviceCode?: string;
  deviceType?: string;
  isOnline?: string | boolean | number;
  valveStatus?: string | number;
  totalMetering?: number;
  lastConnTime?: string;
  installAddress?: string | null;
  companyId?: string;
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

function onlineLabel(v: MeterDeviceRow['isOnline']) {
  if (v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'on_line' || String(v).toLowerCase() === 'online') {
    return { label: 'Online', color: 'success' as const };
  }
  return { label: String(v ?? 'Offline'), color: 'default' as const };
}

export default function MeterPlatformListPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MeterDeviceRow[]>([]);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await get<ListResponse>('/external-providers/meter-platform/devices', {
        pageNum: 1,
        pageSize: 100,
      });
      if (!res?.success) {
        setError(res?.message || 'No se pudo cargar la lista');
        setRows([]);
        return;
      }
      setRows(res.data?.rows || []);
      setTotal(res.data?.total ?? res.data?.rows?.length ?? 0);
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

  return (
    <>
      <Helmet>
        <title>Medidores plataforma (prueba)</title>
      </Helmet>

      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Medidores — plataforma (prueba)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Lista en vivo del proveedor Water/Gas (pull API). Página temporal para explorar devices.
            </Typography>
          </Box>
          <Button variant="outlined" onClick={load} disabled={loading}>
            Actualizar
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          {loading ? (
            <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {total} dispositivo{total === 1 ? '' : 's'}
                </Typography>
              </Box>
              <StyledTableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <StyledTableCellHeader>Device code</StyledTableCellHeader>
                      <StyledTableCellHeader>Tipo</StyledTableCellHeader>
                      <StyledTableCellHeader>Estado</StyledTableCellHeader>
                      <StyledTableCellHeader>Válvula</StyledTableCellHeader>
                      <StyledTableCellHeader align="right">Total (m³)</StyledTableCellHeader>
                      <StyledTableCellHeader>Última conexión</StyledTableCellHeader>
                      <StyledTableCellHeader align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <StyledTableCell colSpan={7}>
                          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                            Sin dispositivos en la cuenta del proveedor.
                          </Typography>
                        </StyledTableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => {
                        const code = String(row.deviceCode || '');
                        const online = onlineLabel(row.isOnline);
                        return (
                          <StyledTableRow
                            key={code || row.id}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/meter-platform/${encodeURIComponent(code)}`)}
                          >
                            <StyledTableCell>
                              <Typography variant="subtitle2" sx={{ fontFamily: 'ui-monospace, monospace' }}>
                                {code}
                              </Typography>
                              {row.id != null && (
                                <Typography variant="caption" color="text.secondary">
                                  id {String(row.id)}
                                </Typography>
                              )}
                            </StyledTableCell>
                            <StyledTableCell>{row.deviceType || '—'}</StyledTableCell>
                            <StyledTableCell>
                              <Chip size="small" label={online.label} color={online.color} variant="outlined" />
                            </StyledTableCell>
                            <StyledTableCell>{String(row.valveStatus ?? '—')}</StyledTableCell>
                            <StyledTableCell align="right">
                              {row.totalMetering != null ? Number(row.totalMetering) : '—'}
                            </StyledTableCell>
                            <StyledTableCell>
                              {row.lastConnTime ? String(row.lastConnTime).replace('T', ' ').slice(0, 19) : '—'}
                            </StyledTableCell>
                            <StyledTableCell align="right" onClick={(e) => e.stopPropagation()}>
                              <IconButton
                                size="small"
                                aria-label="Ver detalle"
                                onClick={() => navigate(`/meter-platform/${encodeURIComponent(code)}`)}
                              >
                                <SvgColor src="/assets/icons/navbar/ic-analytics.svg" sx={{ width: 18, height: 18 }} />
                              </IconButton>
                            </StyledTableCell>
                          </StyledTableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </StyledTableContainer>
            </>
          )}
        </Paper>
      </Box>
    </>
  );
}

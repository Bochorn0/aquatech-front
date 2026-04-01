import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import {
  Box,
  Chip,
  Card,
  Grid,
  Paper,
  Button,
  Divider,
  Typography,
  CardContent,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Stack,
} from '@mui/material';

import { get } from 'src/api/axiosHelper';
import { CONFIG } from 'src/config-global';

import ProductLogs from './product-logs';
import { MultipleBarChart } from '../charts/multiple-bar-chart';

import type { Product, MetricCardProps, MergedVolumeBreakdown } from '../types';


// Separate MetricCard Component
const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit }) => {
  let displayValue = 'N/A';

  if (value !== null && value !== undefined) {
    if (typeof value === 'object') {
      displayValue = JSON.stringify(value);
    } else {
      displayValue = String(value);
    }
  }

  return (
    <Card sx={{ height: '100%', '&:hover': { boxShadow: 3 } }}>
      <CardContent>
        <Typography color="textSecondary" gutterBottom>
          {title || 'N/A'}
        </Typography>
        <Typography variant="h4" component="div" color="primary">
          {displayValue}
          {unit && (
            <Typography variant="subtitle1" component="span" ml={1}>
              {unit}
            </Typography>
          )}
        </Typography>
      </CardContent>
    </Card>
  );
};

// PropTypes validation
MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.object]).isRequired,
  unit: PropTypes.string,
};

/** Mexico timezone for consistent "last time online" display (GMT-07:00). */
const MEXICO_TZ = 'America/Hermosillo';

/** Format "Última vez actualizado" from last_updated_display (API), or update_time / last_time_active (Unix seconds). */
function formatLastTimeOnline(product: Product): string {
  const ts = product.last_updated_display ?? product.last_time_active ?? product.update_time;
  if (ts == null || ts <= 0) return 'N/A';
  try {
    const date = new Date(ts * 1000);
    return date.toLocaleString('es-MX', {
      timeZone: MEXICO_TZ,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return 'N/A';
  }
}

function formatLitersDisplay(value: number): string {
  if (!Number.isFinite(value)) return 'N/A';
  return value.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Fecha límite del bloqueo/fusión (misma zona que el resto del detalle). */
function formatMergeBoundaryDate(seconds: number | null): string {
  if (seconds == null || !(Number(seconds) > 0)) return 'N/A';
  try {
    const ms = Number(seconds) > 1e12 ? Number(seconds) : Number(seconds) * 1000;
    const date = new Date(ms);
    return date.toLocaleString('es-MX', {
      timeZone: MEXICO_TZ,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return 'N/A';
  }
}

function MergedVolumesSection({
  breakdown,
  officialProductionDisplay,
  officialRejectionDisplay,
}: {
  breakdown: MergedVolumeBreakdown;
  officialProductionDisplay: string | number;
  officialRejectionDisplay: string | number;
}) {
  const { before_merge, since_merge_live, switched_at, old_device_id } = breakdown;
  const hasLive = since_merge_live != null;
  const sumProd =
    hasLive && since_merge_live
      ? before_merge.production_liters + since_merge_live.production_liters
      : null;
  const sumRej =
    hasLive && since_merge_live
      ? before_merge.rejection_liters + since_merge_live.rejection_liters
      : null;

  return (
    <Paper sx={{ p: 3, mb: 4, borderLeft: 4, borderColor: 'info.main' }}>
      <Typography variant="h6" gutterBottom>
        Comparar volúmenes (histórico archivado vs. contador en vivo)
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }} variant="outlined">
        El sistema <strong>sigue sumando el histórico al contador actual</strong>: las tarjetas de volumen de
        arriba muestran ese <strong>total fusionado</strong> (no se resta ni se revierte nada). Esta tabla solo
        expone el desglose para que puedas comparar la parte archivada con lo acumulado en Tuya después del
        bloqueo.
      </Alert>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Total oficial en esta pantalla: producción{' '}
        <strong>{officialProductionDisplay}</strong> L · rechazo <strong>{officialRejectionDisplay}</strong> L
        (mismo criterio que en el listado de equipos).
      </Typography>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Fecha de referencia (bloqueo / fusión):{' '}
        <Typography component="span" variant="subtitle2" color="text.primary">
          {formatMergeBoundaryDate(switched_at)}
        </Typography>
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
        Registro archivado: <code>{old_device_id}</code>
      </Typography>
      <Table size="small" sx={{ maxWidth: 720 }}>
        <TableHead>
          <TableRow>
            <TableCell>Periodo</TableCell>
            <TableCell align="right">Producción (L)</TableCell>
            <TableCell align="right">Rechazo (L)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>
              Hasta la fecha de referencia
              <Typography variant="caption" display="block" color="text.secondary">
                Valores congelados en el archivo
              </Typography>
            </TableCell>
            <TableCell align="right">{formatLitersDisplay(before_merge.production_liters)}</TableCell>
            <TableCell align="right">{formatLitersDisplay(before_merge.rejection_liters)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              Desde la fecha de referencia
              <Typography variant="caption" display="block" color="text.secondary">
                Solo contador en vivo (Tuya), sin el archivo
              </Typography>
            </TableCell>
            <TableCell align="right">
              {hasLive ? formatLitersDisplay(since_merge_live!.production_liters) : '—'}
            </TableCell>
            <TableCell align="right">
              {hasLive ? formatLitersDisplay(since_merge_live!.rejection_liters) : '—'}
            </TableCell>
          </TableRow>
          {hasLive && sumProd != null && sumRej != null ? (
            <TableRow sx={{ '& td': { fontWeight: 600, borderTop: 1, borderColor: 'divider' } }}>
              <TableCell>
                Archivo + en vivo (referencia)
                <Typography variant="caption" display="block" color="text.secondary">
                  Debe alinearse con el total fusionado de las tarjetas (posible diferencia mínima por redondeo)
                </Typography>
              </TableCell>
              <TableCell align="right">{formatLitersDisplay(sumProd)}</TableCell>
              <TableCell align="right">{formatLitersDisplay(sumRej)}</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      {!hasLive ? (
        <Alert severity="warning" sx={{ mt: 2 }}>
          No se recibió el estado en vivo de Tuya en esta carga; solo se muestran los volúmenes del archivo.
          Actualice la página cuando el servicio esté disponible para ver la columna &quot;desde la fecha&quot;.
        </Alert>
      ) : null}
    </Paper>
  );
}

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  const [product, setProduct] = useState<Product>();
  const [loading, setLoading] = useState<boolean>(true); 
  const [charData, setChartData] = useState<any>();

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const response = await get<Product>(`/products/${id}`);
        setProduct(response);
        prepareChartData(response)
        setLoading(false);
      } catch (error) {
        console.error('Error fetching product details:', error);
        setLoading(false);
      }
    };
    const prepareChartData = (prod: Product) => {
        if (prod.product_type === 'Nivel') {
          // Dynamically extract values for the chart
        const liquidLevelPercent = prod.status.find((s) => s.code === 'liquid_level_percent')?.value || 0;
        const liquidDepth = prod.status.find((s) => s.code === 'liquid_depth')?.value || 0;
        const char = {
          categories: ['Tank A'],
          series: [
            {
              name: 'Liquid Level (%)',
              data: [liquidLevelPercent],
            },
            {
              name: 'Liquid Depth (m)',
              data: [liquidDepth],
            },
          ],
          colors: ['#3b82f6', '#34d399'], // Different colors for each series
          options: {
            yaxis: {
              min: 0,
              max: 100,
              title: {
                text: 'Percentage (%)',
              },
            },
            dataLabels: {
              enabled: true,
              formatter: (val: number) => `${val}%`,
            },
          },
        };
        setChartData({char, liquidDepth, liquidLevelPercent});
      }
    }
    fetchProductDetails();
    
    const interval = setInterval(() => {
      fetchProductDetails();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);

  }, [id]);

  if (loading || !product) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`Detalles de producto - ${CONFIG.appName}`}</title>
      </Helmet>
      <Box sx={{ p: 3 }}>
        <Button
          variant="outlined"
          color="primary"
          component="a"
          href="/Equipos"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            padding: '8px 16px',
            borderRadius: '4px',
            textDecoration: 'none', // Remove underline
            '&:hover': {
              backgroundColor: 'primary.light',
              color: 'white',
            },
        }} >
          Volver a Equipos
        </Button>
        <Divider sx={{ borderStyle: 'dashed' }} />
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: 1 }}>
          <Typography variant="h4" component="span" gutterBottom sx={{ mb: 0 }}>
            {product.name} ({product.product_name})
          </Typography>
          {(product.merged_volume_breakdown ||
            (Array.isArray(product.merged_from_device_ids) && product.merged_from_device_ids.length > 0)) ? (
            <Chip
              size="small"
              color="info"
              label="Histórico fusionado (volúmenes combinados)"
              sx={{ mt: 0.5 }}
            />
          ) : null}
        </Stack>

        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom textAlign='center'>
            Product Details
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4} textAlign='center'>
              <img
                src={`${CONFIG.ICON_URL}/${product.icon}`}
                alt={product.name}
                style={{ width: '150px', height: '150px', marginRight: '10px' }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body1">
                <strong>ID:</strong> {product.product_id}
              </Typography>
              <Typography variant="body1">
                <strong>IP:</strong> {product.ip}
              </Typography>
              <Typography variant="body1">
                <strong>Latitud:</strong> {product.lat}
              </Typography>
              <Typography variant="body1">
                <strong>Longitud:</strong> {product.lon}
              </Typography>
              <Typography variant="body1">
                <strong>Ciudad:</strong> {product.city}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
            <Typography variant="body1">
              <strong>Tipo:</strong> {product.product_type}
            </Typography>
              <Typography variant="body1">
                <strong>ID Usuario:</strong> {product.uid}
              </Typography>
              <Typography variant="body1">
                <strong>Status:</strong>{' '}
                <Chip
                  label={product.online ? 'Online' : 'Offline'}
                  color={product.online ? 'success' : 'error'}
                  size="small"
                />
              </Typography>
              <Typography variant="body1">
                <strong>Última vez actualizado:</strong>{' '}
                {formatLastTimeOnline(product)}
              </Typography>
              <Typography variant="body1">
                <strong>Modelo:</strong> {product.model || 'N/A'}
              </Typography>
              <Typography variant="body1">
                <strong>Time Zone:</strong> {product.time_zone}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
        {product.product_type === 'Nivel' && charData && (
          <Paper sx={{ p: 3, mb: 4 }}>
          <MultipleBarChart
            title="Nivel del Tanque A"
            subheader={`Profundidad del líquido: ${charData.liquidDepth}m`}
            chart={charData.char}
          />
        </Paper>
        )}
        {product.product_type === 'Osmosis' &&
          Array.isArray(product.merged_from_device_ids) &&
          product.merged_from_device_ids.length > 0 &&
          !product.merged_volume_breakdown && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Este equipo tiene histórico fusionado desde otro registro; los totales de producción y rechazo ya
              incluyen ese archivo. No hay fila archivada <code>_…</code> enlazada para mostrar el desglose por
              fecha en esta vista.
            </Alert>
          )}
        {product.product_type === 'Osmosis' && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="TDS Level"
              value={product.status.find((s) => s.code === 'tds_out')?.value || 'N/A'}
              unit="ppm"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Volumen producción (acum.)"
              value={product.status.find((s) => s.code === 'flowrate_total_1')?.value || 'N/A'}
              unit="L"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Volumen rechazo (acum.)"
              value={product.status.find((s) => s.code === 'flowrate_total_2')?.value || 'N/A'}
              unit="L"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Temperature"
              value={product.status.find((s) => s.code === 'temperature')?.value || 'N/A'}
              unit="°C"
            />
          </Grid>
        </Grid>
        )}
        {product.product_type === 'Osmosis' && product.merged_volume_breakdown ? (
          <MergedVolumesSection
            breakdown={product.merged_volume_breakdown}
            officialProductionDisplay={
              product.status.find((s) => s.code === 'flowrate_total_1')?.value ?? 'N/A'
            }
            officialRejectionDisplay={
              product.status.find((s) => s.code === 'flowrate_total_2')?.value ?? 'N/A'
            }
          />
        ) : null}
        {product.product_type === 'Osmosis' && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Detalle de Filtros
          </Typography>
          <Grid container spacing={3}>
            {['filter_element_1', 'filter_element_2', 'filter_element_3', 'filter_element_4', 'filter_element_5'].map(
              (filter, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <MetricCard
                    title={`Filter Element ${index + 1} Life`}
                    value={product.status.find((s) => s.code === filter)?.value || 'N/A'}
                    unit="Days"
                  />
                </Grid>
              )
            )}
          </Grid>
        </Paper>
        )}
        {product.product_type === 'Osmosis' && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Estatus de sistema
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Water Overflow"
                value={product.status.find((s) => s.code === 'water_overflow')?.value ? 'Yes' : 'No'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Work Error"
                value={product.status.find((s) => s.code === 'work_error')?.value === 1 ? 'Error' : 'No Error'}
              />
            </Grid>
          </Grid>
        </Paper>
        )}
        {(product.product_type === 'Osmosis' || product.product_type === 'Nivel') && (
          <ProductLogs productType={product.product_type} />
        )}
      </Box>
    </>
  );
};

export default ProductDetail;

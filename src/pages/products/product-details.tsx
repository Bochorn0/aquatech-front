import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { Box, Chip, Card, Grid, Paper, Button, Divider, Typography, CardContent, CircularProgress } from '@mui/material';

import { get } from 'src/api/axiosHelper';
import { CONFIG } from 'src/config-global';

import ProductLogs from './product-logs';
import { MultipleBarChart } from '../charts/multiple-bar-chart';

import type { Product, MetricCardProps } from '../types';


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
        <Typography variant="h4" gutterBottom>
          {product.name} ({product.product_name})
        </Typography>

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
              title="Total Flow Rate (1)"
              value={product.status.find((s) => s.code === 'flowrate_total_1')?.value || 'N/A'}
              unit="L/min"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Total Flow Rate (2)"
              value={product.status.find((s) => s.code === 'flowrate_total_2')?.value || 'N/A'}
              unit="L/min"
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

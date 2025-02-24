import axios from 'axios';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { Box, Chip, Card, Grid, Table, Paper, Checkbox, TableRow, TableCell, TableBody, TableHead, Typography, CardContent, TableContainer, CircularProgress, FormControlLabel } from '@mui/material';

import ProductLogs from './product-logs';

import { CONFIG } from 'src/config-global';

import dayjs, { Dayjs } from 'dayjs';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// Interfaces for TypeScript

interface ProductStatus {
  code: string;
  value: string | number;
}

interface Product {
  product_id: string;
  name: string;
  product_name: string;
  online: boolean;
  icon: string;
  status: ProductStatus[];
  category: string;
  owner_id: string;
  ip: string;
  lat: string;
  lon: string;
  model: string;
  time_zone: string;
}


interface MetricCardProps {
  title: string;
  value: string | number | object;
  unit?: string;
}

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


const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  const [product, setProduct] = useState<Product>({
    product_id: '',
    name: '',
    product_name: '',
    online: true,
    icon: '',
    status: [
      { code: '001', value: 'offline' },
      { code: '002', value: 1 },
    ],
    category: '',
    owner_id: '',
    ip: '',
    lat: '',
    lon: '',
    model: '',
    time_zone: '',
  });
  const [loading, setLoading] = useState<boolean>(true); 

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const response = await axios.get(`${CONFIG.API_BASE_URL}/products/${id}`);
        setProduct(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching product details:', error);
        setLoading(false);
      }
    };

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
        <Typography variant="h4" gutterBottom>
          {product.name} ({product.product_name})
          <img
            src={`${CONFIG.ICON_URL}/${product.icon}`}
            alt={product.name}
            style={{ width: '40px', height: '40px', marginRight: '10px' }}
          />
        </Typography>

        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Product Details
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="body1">
                <strong>Product ID:</strong> {product.product_id}
              </Typography>
              <Typography variant="body1">
                <strong>IP Address:</strong> {product.ip}
              </Typography>
              <Typography variant="body1">
                <strong>Location:</strong> {product.lat}, {product.lon}
              </Typography>
              <Typography variant="body1">
                <strong>Category:</strong> {product.category}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="body1">
                <strong>Owner ID:</strong> {product.owner_id}
              </Typography>
              <Typography variant="body1">
                <strong>Online:</strong>{' '}
                <Chip
                  label={product.online ? 'Online' : 'Offline'}
                  color={product.online ? 'success' : 'error'}
                  size="small"
                />
              </Typography>
              <Typography variant="body1">
                <strong>Model:</strong> {product.model || 'N/A'}
              </Typography>
              <Typography variant="body1">
                <strong>Time Zone:</strong> {product.time_zone}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

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

        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Filter Elements Status
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

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            System Status
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

        <ProductLogs  />
      </Box>
    </>
  );
};

export default ProductDetail;

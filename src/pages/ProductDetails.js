import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Paper,
  Chip,
  Divider,
} from '@mui/material';
import axios from 'axios';
import {
  WaterDrop as WaterIcon,
  Speed as SpeedIcon,
  FilterList as FilterIcon,
  Cloud as CloudIcon,
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3009/api';

function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/products/${id}`);
        setProduct(response.data.result);
      } catch (error) {
        console.error('Error fetching product details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
    const interval = setInterval(fetchProductDetails, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [id]);

  if (loading || !product) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  const MetricCard = ({ title, value, unit, color }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" component="div" color={color || 'primary'}>
          {value}
          {unit && (
            <Typography variant="subtitle1" component="span" ml={1}>
              {unit}
            </Typography>
          )}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {product.name} ({product.product_name})
      </Typography>

      {/* General Product Info */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Product Details
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="body1"><strong>Product ID:</strong> {product.product_id}</Typography>
            <Typography variant="body1"><strong>IP Address:</strong> {product.ip}</Typography>
            <Typography variant="body1"><strong>Location:</strong> {product.lat}, {product.lon}</Typography>
            <Typography variant="body1"><strong>Category:</strong> {product.category}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="body1"><strong>Owner ID:</strong> {product.owner_id}</Typography>
            <Typography variant="body1"><strong>Online:</strong> <Chip label={product.online ? 'Online' : 'Offline'} color={product.online ? 'success' : 'error'} size="small" /></Typography>
            <Typography variant="body1"><strong>Model:</strong> {product.model || 'N/A'}</Typography>
            <Typography variant="body1"><strong>Time Zone:</strong> {product.time_zone}</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Product Status Cards */}
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

      {/* Filter Elements Status */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Filter Elements Status
        </Typography>
        <Grid container spacing={3}>
          {['filter_element_1', 'filter_element_2', 'filter_element_3', 'filter_element_4', 'filter_element_5'].map((filter, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <MetricCard
                title={`Filter Element ${index + 1} Life`}
                value={product.status.find((s) => s.code === filter)?.value || 'N/A'}
                unit="%"
                color={product.status.find((s) => s.code === filter)?.value < 20 ? 'error' : 'primary'}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Water Overflow & Work Error Status */}
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
              color={product.status.find((s) => s.code === 'work_error')?.value === 1 ? 'error' : 'primary'}
            />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

export default ProductDetails;

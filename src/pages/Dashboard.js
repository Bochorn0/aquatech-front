import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Chip,
  Box,
  CircularProgress,
} from '@mui/material';
import {
  WaterDrop as WaterIcon,
  Speed as SpeedIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3009/api';
const ICON_URL = 'https://images.tuyacn.com';

function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/products`);
        setProducts(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    const interval = setInterval(fetchProducts, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
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

  return (
    <Grid container spacing={3}>
      {products.map((product) => (
        <Grid item xs={12} sm={6} md={4} key={product.id}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                {/* Product name and status */}
                <Typography variant="h6" component="div">
                  {product.name}
                </Typography>
                <Chip
                  label={product.online ? 'Online' : 'Offline'}
                  color={product.online ? 'success' : 'error'}
                  size="small"
                />
              </Box>

              {/* Product Icon */}
              <Box display="flex" justifyContent="center" mb={2}>
                <img
                  src={`${ICON_URL}/${product.icon}`}  // Ensure this is a full URL
                  alt={product.name}
                  style={{ width: '60px', height: '60px' }}
                />
              </Box>

              {/* Metrics */}
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Box display="flex" flexDirection="column" alignItems="center">
                    <WaterIcon color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      TDS: {product.status?.[0]?.value || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box display="flex" flexDirection="column" alignItems="center">
                    <SpeedIcon color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Flow: {product.status?.[1]?.value || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box display="flex" flexDirection="column" alignItems="center">
                    <TimerIcon color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Filter Life: {product.status?.[2]?.value || 'N/A'}%
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                color="primary"
                onClick={() => navigate(`/products/${product.id}`)}
              >
                View Details
              </Button>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

export default Dashboard;

import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';

import {
  Box,
  Grid,
  Card,
  Chip,
  Button,
  Typography,
  CardContent,
  CardActions,
  CircularProgress,
} from '@mui/material';

import {ICON_URL, API_BASE_URL} from '../config/config';


function Products() {
  const [products, setProducts] = useState([{id: '1', name: '', online: true, icon: '', status: [{value:'offline'}]}]);
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
                    <Typography variant="body2" color="text.secondary">
                      TDS: {product.status?.[0]?.value || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box display="flex" flexDirection="column" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Flow: {product.status?.[1]?.value || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box display="flex" flexDirection="column" alignItems="center">
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
                onClick={() => navigate(`/Productos/${product.id}`)}
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

export default Products;

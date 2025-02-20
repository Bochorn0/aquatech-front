import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import Button from '@mui/material/Button';
import React, { useState, useEffect } from 'react';

import { Box, Chip, Table, Paper, TableRow, TableCell, TableBody, TableHead, Typography, TableContainer, CircularProgress } from '@mui/material';

import {ICON_URL, API_BASE_URL} from '../config/config';


function ProductTableList() {
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
        Product List
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Product</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>TDS Level</TableCell>
            <TableCell>Water Flow</TableCell>
            <TableCell>Filter Life</TableCell>
            <TableCell>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <Box display="flex" alignItems="center">
                  <img
                    src={`${ICON_URL}/${product.icon}`}
                    alt={product.name}
                    style={{ width: '40px', height: '40px', marginRight: '10px' }}
                  />
                  <Typography variant="body1">{product.name}</Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={product.online ? 'Online' : 'Offline'}
                  color={product.online ? 'success' : 'error'}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {/* Check if status array exists and has data */}
                {product.status && product.status[0] ? `${product.status[0]?.value || 'N/A'} ppm` : 'N/A'}
              </TableCell>
              <TableCell>
                {/* Check if status array exists and has data */}
                {product.status && product.status[1] ? `${product.status[1]?.value || 'N/A'} L/min` : 'N/A'}
              </TableCell>
              <TableCell>
                {/* Check if status array exists and has data */}
                {product.status && product.status[2] ? `${product.status[2]?.value || 'N/A'}%` : 'N/A'}
              </TableCell>
              <TableCell>
              <Button
              variant="contained"
              color="inherit"
              onClick={() => navigate(`/Productos/${product.id}`)}
            >
              Detalles
            </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default ProductTableList;
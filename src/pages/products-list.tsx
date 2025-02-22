import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Box, Chip, Table, Paper, Stack, Button, Switch, TableRow, TableCell, TableBody, TextField, TableHead, Typography, TableContainer, TablePagination, CircularProgress } from '@mui/material';

import { CONFIG } from 'src/config-global';

interface Status {
  code: string;
  value: string | number | boolean;
}

interface Product {
  id: string;
  name: string;
  online: boolean;
  icon: string;
  status: Status[];
}

function ProductTableList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [switchState, setSwitchState] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${CONFIG.API_BASE_URL}/products/mocked`);
        setProducts(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    const interval = setInterval(fetchProducts, 300000);
    return () => clearInterval(interval);
  }, []);
  
  const handleToggle = async (productId: string) => {
    if (processing[productId]) return; // Prevent multiple clicks
  
    // Show confirmation prompt
    const confirmFlush = window.confirm('Estas a punto de forzar un flush. estas seguro?');
  
    if (!confirmFlush) return; // If the user cancels, do nothing
  
    setProcessing((prev) => ({ ...prev, [productId]: true }));
    setSwitchState((prev) => ({ ...prev, [productId]: true })); // Turn switch ON
  
    try {
      const requestData = { 
        id: productId,
        commands: [{ "code": "water_wash", "value": true }]
      };
  
      const response = await axios.post(`${CONFIG.API_BASE_URL}/products/sendCommand`, requestData);
      const { deviceData } = response.data;
      setProducts((prevProducts) =>  // ✅ Rename callback param to avoid shadowing
      prevProducts.map((product) =>
        product.id === deviceData.id ? { ...product, ...deviceData } : product
      )
    );
      
      console.log('Command executed:', response.data);
      
      // console.log(`Command executed for ${productId}`);
    } catch (error) {
      console.error('Error executing commands:', error);
    } finally {
      setProcessing((prev) => ({ ...prev, [productId]: false }));
      setSwitchState((prev) => ({ ...prev, [productId]: false })); // Reset switch OFF
    }
  };
  

  const handleChangePage = (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };

  const filteredProducts = products.filter((product) => {
    const productValues = [
      product.name,
      product.online ? 'Online' : 'Offline',
      `${product.status.find(s => s.code === 'tds_out')?.value || 'N/A'} ppm`,
      `${product.status.find(s => s.code === 'flowrate_total_1')?.value || 'N/A'} L`,
      `${product.status.find(s => s.code === 'flowrate_total_2')?.value || 'N/A'} L`,
      `${product.status.find(s => s.code === 'flowrate_speed_1')?.value || 'N/A'} L`,
      `${product.status.find(s => s.code === 'flowrate_speed_2')?.value || 'N/A'} L`,
      `${product.status.find(s => s.code === 'filter_element_1')?.value || 'N/A'} H`,
      `${product.status.find(s => s.code === 'filter_element_2')?.value || 'N/A'} H`,
      `${product.status.find(s => s.code === 'filter_element_3')?.value || 'N/A'} H`,
      `${product.status.find(s => s.code === 'filter_element_4')?.value || 'N/A'} H`,
      product.status.find(s => s.code === 'water_overflow')?.value ? 'Yes' : 'No',
      product.status.find(s => s.code === 'water_wash')?.value ? 'Yes' : 'No',
      `${product.status.find(s => s.code === 'temperature')?.value || 'N/A'} °C`
    ].join(' ').toLowerCase();

    return productValues.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title> {`Productos - ${CONFIG.appName}`}</title>
      </Helmet>
      <Box sx={{ p: 2 }}>
        <TextField
          label="Buscar productos"
          variant="outlined"
          fullWidth
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </Box>
      <TableContainer component={Paper}>
        <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
          Product List
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>TDS</TableCell>
              <TableCell>Volument Total Producto</TableCell>
              <TableCell>Volumen Rechazo</TableCell>
              <TableCell>Flujo Caudal</TableCell>
              <TableCell>Flujo Rechazo</TableCell>
              <TableCell>F. Sedimentos</TableCell>
              <TableCell>F. Carbon Granular</TableCell>
              <TableCell>F. Carbon Bloque</TableCell>
              <TableCell>Membrana OI</TableCell>
              <TableCell>Temp</TableCell>
              <TableCell>Actiones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProducts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <img
                      src={`${CONFIG.ICON_URL}/${product.icon}`}
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
                  {product.status.find(s => s.code === 'tds_out')?.value || 'N/A'} ppm
                </TableCell>
                <TableCell>
                  {product.status.find(s => s.code === 'flowrate_total_1')?.value || 'N/A'} L
                </TableCell>
                <TableCell>
                  {product.status.find(s => s.code === 'flowrate_total_2')?.value || 'N/A'} L
                </TableCell>
                <TableCell>
                  {product.status.find(s => s.code === 'flowrate_speed_1')?.value || 'N/A'} L
                </TableCell>
                <TableCell>
                  {product.status.find(s => s.code === 'flowrate_speed_2')?.value || 'N/A'} L
                </TableCell>
                <TableCell>
                  {product.status.find(s => s.code === 'filter_element_1')?.value || 'N/A'} H
                </TableCell>
                <TableCell>
                  {product.status.find(s => s.code === 'filter_element_2')?.value || 'N/A'} H
                </TableCell>
                <TableCell>
                  {product.status.find(s => s.code === 'filter_element_3')?.value || 'N/A'} H
                </TableCell>
                <TableCell>
                  {product.status.find(s => s.code === 'filter_element_4')?.value || 'N/A'} H
                </TableCell>
                <TableCell>
                  {product.status.find(s => s.code === 'temperature')?.value || 'N/A'} °C
                </TableCell>

                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                        label="Flush"
                        color={(switchState[product.id] || false) ? 'primary' : 'default'}
                        sx={{ display: 'flex', alignItems: 'center', padding: '5px' }}
                        icon={
                          <Switch
                            title="Force flush"
                            checked={switchState[product.id] || false} 
                            onChange={() => handleToggle(product.id)}
                            disabled={processing[product.id] || false} 
                          />
                        }
                      />
                      <Button
                        variant="contained"
                        color="inherit"
                        onClick={() => navigate(`/Productos/${product.id}`)}
                      >
                      Detalles
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 20, 100]}
          component="div"
          count={filteredProducts.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </>
  );
}

export default ProductTableList;

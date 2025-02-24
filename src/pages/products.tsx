import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Box, Chip, Table, Paper, Stack, Button, Switch, Checkbox, TableRow, TableCell, TableBody, TextField, TableHead, Typography, TableContainer, TablePagination, CircularProgress, FormControlLabel } from '@mui/material';

import { CONFIG } from 'src/config-global';

interface Status {
  code: string;
  value: string | number | boolean;
}

interface Product {
  id: string;
  name: string;
  city: string;
  drive: string;
  online: boolean;
  icon: string;
  status: Status[];
}

interface DisplayFields {
  product: boolean;
  city: boolean;
  drive: boolean;
  status: boolean;
  tds: boolean;
  volumeTotal: boolean;
  volumeReject: boolean;
  flowRate: boolean;
  rejectFlow: boolean;
  sedimentFilter: boolean;
  granularCarbonFilter: boolean;
  blockCarbonFilter: boolean;
  oiMembrane: boolean;
  temperature: boolean;
}

function ProductTableList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [switchState, setSwitchState] = useState<Record<string, boolean>>({});
  const [showDisplayFields, setShowDiplayFields] = useState(false);
  const [displayFields, setDisplayFields] = useState<DisplayFields>({
    product: true,
    status: true,
    city: true,
    drive: true,
    tds: true,
    volumeTotal: true,
    volumeReject: true,
    flowRate: true,
    rejectFlow: true,
    sedimentFilter: true,
    granularCarbonFilter: true,
    blockCarbonFilter: true,
    oiMembrane: true,
    temperature: true,
  });
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
      setProducts((prevProducts) =>  
        prevProducts.map((product) =>
          product.id === deviceData.id ? { ...product, ...deviceData } : product
        )
      );
      console.log('Command executed:', response.data);
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

  const handleFieldToggle = (field: keyof DisplayFields) => {
    setDisplayFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const filteredProducts = products.filter((product) => {
    const productValues = [
      product.name,
      product.city,
      product.drive,
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
      <Box sx={{ p: 2 }}>
      <Chip
        label="Seleccionar Campos a mostrar"
        color='default'
        sx={{ display: 'flex', alignItems: 'center', padding: '5px' }}
        icon={
          <Switch
          title="Seleccionar Campos a mostrar"
          checked={showDisplayFields} 
          onChange={() => setShowDiplayFields(!showDisplayFields)}
        />
        }
      />

      </Box>

      {/* Field Toggle Section */}
      <Box sx={{ p: 2 }} style={{ display: showDisplayFields ? 'block' : 'none' }}>
        {Object.keys(displayFields).map((field) => (
          <FormControlLabel
            key={field}
            control={
              <Checkbox
                id={`checkbox-${field}`}
                checked={displayFields[field as keyof DisplayFields]}
                onChange={() => handleFieldToggle(field as keyof DisplayFields)}
                color="primary" // You can customize the color here
              />
            }
            label={field}
          />
        ))}
      </Box>


      <TableContainer component={Paper}>
        <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
          Product List
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              {displayFields.product && <TableCell>Product</TableCell>}
              {displayFields.status && <TableCell>Status</TableCell>}
              {displayFields.city && <TableCell>Ciudad</TableCell>}
              {displayFields.drive && <TableCell>Drive</TableCell>}
              {displayFields.tds && <TableCell>TDS</TableCell>}
              {displayFields.volumeTotal && <TableCell>Volument Total Producto</TableCell>}
              {displayFields.volumeReject && <TableCell>Volumen Rechazo</TableCell>}
              {displayFields.flowRate && <TableCell>Flujo Caudal</TableCell>}
              {displayFields.rejectFlow && <TableCell>Flujo Rechazo</TableCell>}
              {displayFields.sedimentFilter && <TableCell>F. Sedimentos</TableCell>}
              {displayFields.granularCarbonFilter && <TableCell>F. Carbon Granular</TableCell>}
              {displayFields.blockCarbonFilter && <TableCell>F. Carbon Bloque</TableCell>}
              {displayFields.oiMembrane && <TableCell>Membrana OI</TableCell>}
              {displayFields.temperature && <TableCell>Temp</TableCell>}
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProducts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((product) => (
              <TableRow key={product.id}>
                {displayFields.product && (
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
                )}
                {displayFields.status && (
                  <TableCell>
                    <Chip
                      label={product.online ? 'Online' : 'Offline'}
                      color={product.online ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                )}
                {displayFields.city && (
                  <TableCell>
                    {product.city}
                  </TableCell>
                )}
                {displayFields.drive && (
                  <TableCell>
                    {product.drive}
                  </TableCell>
                )}
                {displayFields.tds && (
                  <TableCell>{product.status.find(s => s.code === 'tds_out')?.value || 'N/A'} ppm</TableCell>
                )}
                {displayFields.volumeTotal && (
                  <TableCell>{product.status.find(s => s.code === 'flowrate_total_1')?.value || 'N/A'} L</TableCell>
                )}
                {displayFields.volumeReject && (
                  <TableCell>{product.status.find(s => s.code === 'flowrate_total_2')?.value || 'N/A'} L</TableCell>
                )}
                {displayFields.flowRate && (
                  <TableCell>{product.status.find(s => s.code === 'flowrate_speed_1')?.value || 'N/A'} L</TableCell>
                )}
                {displayFields.rejectFlow && (
                  <TableCell>{product.status.find(s => s.code === 'flowrate_speed_2')?.value || 'N/A'} L</TableCell>
                )}
                {displayFields.sedimentFilter && (
                  <TableCell>{product.status.find(s => s.code === 'filter_element_1')?.value || 'N/A'} H</TableCell>
                )}
                {displayFields.granularCarbonFilter && (
                  <TableCell>{product.status.find(s => s.code === 'filter_element_2')?.value || 'N/A'} H</TableCell>
                )}
                {displayFields.blockCarbonFilter && (
                  <TableCell>{product.status.find(s => s.code === 'filter_element_3')?.value || 'N/A'} H</TableCell>
                )}
                {displayFields.oiMembrane && (
                  <TableCell>{product.status.find(s => s.code === 'filter_element_4')?.value || 'N/A'} H</TableCell>
                )}
                {displayFields.temperature && (
                  <TableCell>{product.status.find(s => s.code === 'temperature')?.value || 'N/A'} °C</TableCell>
                )}
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
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredProducts.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </>
  );
}

export default ProductTableList;

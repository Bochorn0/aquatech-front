import axios from 'axios';
import { CSVLink } from 'react-csv';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { styled } from '@mui/material/styles';
import { Box, Chip, Grid, Table, Paper, Stack, Button, Select, Switch, Checkbox, MenuItem, TableRow, TableCell, TableBody, TextField, TableHead, InputLabel, Typography, FormControl, TableContainer, TablePagination, CircularProgress, FormControlLabel } from '@mui/material';

import { CONFIG } from 'src/config-global';

interface Status {
  code: string;
  value: any;  // Adjust this if you want more specific types for the value
};

interface Product {
  id: string;
  name: string;
  city: string;
  cliente: string;
  drive: string;
  online: boolean;
  icon: string;
  status: Status[];
  // Allow dynamic properties (strings) to be added to a product object
  [key: string]: any;  // This allows any string as a key on the product object
}

interface DisplayFields {
  product: boolean;
  city: boolean;
  cliente: boolean;
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

const StyledTableContainer = styled(TableContainer)({
  borderRadius: '12px',
  boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden',
});

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
  },
}));

const StyledTableCell = styled(TableCell)({
  padding: '12px',
  fontSize: '14px',
});
const StyledTableCellHeader = styled(TableCell)({
  padding: '12px',
  fontSize: '14px',
  fontWeight: 'bold',
});

function ProductTableList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [driveFilter, setDriveFilter] = useState('');
  const [clienteFilter, setClienteFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [switchState, setSwitchState] = useState<Record<string, boolean>>({});
  const [showDisplayFields, setShowDiplayFields] = useState(false);
  const [displayFields, setDisplayFields] = useState<DisplayFields>({
    product: true,
    status: true,
    city: true,
    cliente: true,
    drive: true,
    tds: true,
    volumeTotal: true,
    volumeReject: true,
    flowRate: true,
    rejectFlow: true,
    sedimentFilter: false,
    granularCarbonFilter: false,
    blockCarbonFilter: false,
    oiMembrane: false,
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


  const handleFieldToggle = (field: keyof DisplayFields) => {
    setDisplayFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const filteredProducts = products.filter((product) => {
    // Construct the product values for searching
    const productValues = [
      product.name,
      product.city,
      product.cliente,
      product.drive,
      product.online ? 'Online' : 'Offline',
      `${product.status.find(s => s.code === 'tds_out')?.value || ''} ppm`,
      `${product.status.find(s => s.code === 'flowrate_total_1')?.value || ''} L`,
      `${product.status.find(s => s.code === 'flowrate_total_2')?.value || ''} L`,
      `${product.status.find(s => s.code === 'flowrate_speed_1')?.value || ''} L`,
      `${product.status.find(s => s.code === 'flowrate_speed_2')?.value || ''} L`,
      `${product.status.find(s => s.code === 'filter_element_1')?.value || ''} H`,
      `${product.status.find(s => s.code === 'filter_element_2')?.value || ''} H`,
      `${product.status.find(s => s.code === 'filter_element_3')?.value || ''} H`,
      `${product.status.find(s => s.code === 'filter_element_4')?.value || ''} H`,
      `${product.status.find(s => s.code === 'temperature')?.value || ''} °C`,
    ].join(' ').toLowerCase(); // Join all values into a single string for easier search
    
    // Search query filter (case-insensitive)
    const matchesSearchQuery = searchQuery === '' || productValues.includes(searchQuery.toLowerCase()) ;
  
    // City filter (exact match)
    const matchesCityFilter = cityFilter === '' || product.city.toLowerCase() === cityFilter.toLowerCase();

    // Drive filter (exact match)
    const matchesClienteFilter = clienteFilter === '' || product.cliente.toLowerCase() === clienteFilter.toLowerCase();

    // Drive filter (exact match)
    const matchesDriveFilter = driveFilter === '' || product.drive.toLowerCase() === driveFilter.toLowerCase();

    // Status filter (exact match)
    const matchesStatusFilter = statusFilter === '' || (statusFilter === 'online' ? product.online : !product.online);
  
    // Combine all filter conditions
    return matchesSearchQuery && matchesCityFilter && matchesClienteFilter && matchesDriveFilter && matchesStatusFilter;
  });

  const mappedFilteredData = filteredProducts.map((product: Product) => {
    const updatedProduct = { ...product };
  
    // Map the status values and add them as separate properties
    product.status.forEach((statusItem) => {
      updatedProduct[statusItem.code] = statusItem.value;
    });

    updatedProduct.status = []
    return updatedProduct;
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
        <title>{`Productos - ${CONFIG.appName}`}</title>
      </Helmet>
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom>Filtrar Productos</Typography>
        
        <Chip
          label="Ver lista de campos disponibles"
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
      <Box sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Buscar productos"
              variant="outlined"
              fullWidth
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth>
              <InputLabel>Ciudad</InputLabel>
              <Select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
                <MenuItem value="">Todas</MenuItem>
                {[...new Set(products.map((p) => p.city))].map((city) => (
                  <MenuItem key={city} value={city}>{city}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth>
              <InputLabel>Empresa</InputLabel>
              <Select value={clienteFilter} onChange={(e) => setClienteFilter(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {[...new Set(products.map((p) => p.cliente))].map((cliente) => (
                  <MenuItem key={cliente} value={cliente}>{cliente}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth>
              <InputLabel>Sucursal</InputLabel>
              <Select value={driveFilter} onChange={(e) => setDriveFilter(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {[...new Set(products.map((p) => p.drive))].map((drive) => (
                  <MenuItem key={drive} value={drive}>{drive}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="online">Online</MenuItem>
                <MenuItem value="offline">Offline</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
      <StyledTableContainer>
        <Paper elevation={3}>
          <Box sx={{ overflowX: 'auto' }}> {/* Ensures table responsiveness */}
            <Grid container>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="h5" gutterBottom sx={{ p: 4 }}>
                  Product List
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={8} textAlign='right'>
                <Typography variant="h5" gutterBottom sx={{ p: 4 }}>
                  Total : {filteredProducts.length} 
                  <CSVLink data={mappedFilteredData} filename={`Productos_${new Date()}.csv`}>
                    <Button variant="contained" color="primary" sx={{ml: 2}}>
                      Exportar
                    </Button>
                  </CSVLink>
                </Typography>
              </Grid>
            </Grid>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f4f6f8' }}>
                {displayFields.product && <StyledTableCellHeader> Product</StyledTableCellHeader>}
                {displayFields.status && <StyledTableCellHeader>Status</StyledTableCellHeader>}
                {displayFields.city && <StyledTableCellHeader>Ciudad</StyledTableCellHeader>}
                {displayFields.cliente && <StyledTableCellHeader>Empresa</StyledTableCellHeader>}
                {displayFields.drive && <StyledTableCellHeader>Drive</StyledTableCellHeader>}
                {displayFields.tds && <StyledTableCellHeader>TDS</StyledTableCellHeader>}
                {displayFields.volumeTotal && <StyledTableCellHeader>Volumen Total Prod.</StyledTableCellHeader>}
                {displayFields.volumeReject && <StyledTableCellHeader>Volumen Rechazo</StyledTableCellHeader>}
                {displayFields.flowRate && <StyledTableCellHeader>Flujo Caudal</StyledTableCellHeader>}
                {displayFields.rejectFlow && <StyledTableCellHeader>Flujo rechazo</StyledTableCellHeader>}
                {displayFields.sedimentFilter && <StyledTableCellHeader>F. Sedimentos</StyledTableCellHeader>}
                {displayFields.granularCarbonFilter && <StyledTableCellHeader>F. Carbon Granular</StyledTableCellHeader>}
                {displayFields.blockCarbonFilter && <StyledTableCellHeader>F. Carbon Bloque</StyledTableCellHeader>}
                {displayFields.oiMembrane && <StyledTableCellHeader>Membrana</StyledTableCellHeader>}
                {displayFields.temperature && <StyledTableCellHeader>Temp</StyledTableCellHeader>}
                <StyledTableCellHeader>Actions</StyledTableCellHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProducts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((product) => (
                  <StyledTableRow key={product.id}>
                    {displayFields.product && (
                      <StyledTableCell>
                        <Box display="flex" alignItems="center">
                          <img
                            src={`${CONFIG.ICON_URL}/${product.icon}`}
                            alt={product.name}
                            style={{ width: '40px', height: '40px', marginRight: '10px' }}
                          />
                          <Typography variant="body1">{product.name}</Typography>
                        </Box>
                      </StyledTableCell>
                    )}
                    {displayFields.status && (
                      <StyledTableCell>
                        <Chip
                          label={product.online ? 'Online' : 'Offline'}
                          color={product.online ? 'success' : 'error'}
                          size="small"
                        />
                      </StyledTableCell>
                    )}
                    {displayFields.city && (
                      <StyledTableCell>
                        {product.city}
                      </StyledTableCell>
                    )}
                    {displayFields.cliente && (
                      <StyledTableCell>
                        {product.cliente}
                      </StyledTableCell>
                    )}
                    {displayFields.drive && (
                      <StyledTableCell>
                        {product.drive}
                      </StyledTableCell>
                    )}
                    {displayFields.tds && (
                      <StyledTableCell>{product.status.find(s => s.code === 'tds_out')?.value || 'N/A'} ppm</StyledTableCell>
                    )}
                    {displayFields.volumeTotal && (
                      <StyledTableCell>{product.status.find(s => s.code === 'flowrate_total_1')?.value || 'N/A'} L</StyledTableCell>
                    )}
                    {displayFields.volumeReject && (
                      <StyledTableCell>{product.status.find(s => s.code === 'flowrate_total_2')?.value || 'N/A'} L</StyledTableCell>
                    )}
                    {displayFields.flowRate && (
                      <StyledTableCell>{product.status.find(s => s.code === 'flowrate_speed_1')?.value || 'N/A'} L</StyledTableCell>
                    )}
                    {displayFields.rejectFlow && (
                      <StyledTableCell>{product.status.find(s => s.code === 'flowrate_speed_2')?.value || 'N/A'} L</StyledTableCell>
                    )}
                    {displayFields.sedimentFilter && (
                      <StyledTableCell>{product.status.find(s => s.code === 'filter_element_1')?.value || 'N/A'} H</StyledTableCell>
                    )}
                    {displayFields.granularCarbonFilter && (
                      <StyledTableCell>{product.status.find(s => s.code === 'filter_element_2')?.value || 'N/A'} H</StyledTableCell>
                    )}
                    {displayFields.blockCarbonFilter && (
                      <StyledTableCell>{product.status.find(s => s.code === 'filter_element_3')?.value || 'N/A'} H</StyledTableCell>
                    )}
                    {displayFields.oiMembrane && (
                      <StyledTableCell>{product.status.find(s => s.code === 'filter_element_4')?.value || 'N/A'} H</StyledTableCell>
                    )}
                    {displayFields.temperature && (
                      <StyledTableCell>{product.status.find(s => s.code === 'temperature')?.value || 'N/A'} °C</StyledTableCell>
                    )}
                    <StyledTableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label="Flush"
                            disabled={!product.online}
                            color={(switchState[product.id] || false) ? 'primary' : 'default'}
                            sx={{ display: 'flex', alignItems: 'center', padding: '5px' }}
                            icon={
                              <Switch
                                title="Forzar flush"
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
                    </StyledTableCell>
                  </StyledTableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </StyledTableContainer>
      <TablePagination
        component="div"
        count={filteredProducts.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
      />
    </>
  );
}

export default ProductTableList;

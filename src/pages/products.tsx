import Swal from 'sweetalert2';
import { CSVLink } from 'react-csv';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Box, Chip, Grid, Table, Paper, Stack, Button, Select, Switch, MenuItem, TableRow, TableBody, TextField, TableHead, InputLabel, Typography, FormControl, TablePagination, CircularProgress } from '@mui/material';

import { StyledTableRow, StyledTableCell, StyledTableContainer, StyledTableCellHeader } from "src/utils/styles";

import { CONFIG } from 'src/config-global';
import { get, post } from "src/api/axiosHelper";

import type { Cliente, Product, DisplayFields } from './types';

function ProductTableList() {
  const [currentProducts, setCurrentProducts] = useState<Product[]>([]);
  const [currentRole, setCurretRole] = useState<string>('');
  const [cityFilters, setCityFilters] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [clientFilters, setClientFilters] = useState<Cliente[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('All');
  const [isInitialFetch, setInitialFetch] = useState(true);
  const [driveFilters, setDriveFilters] = useState<string[]>([]);
  const [selectedDrive, setSelectedDrive] = useState<string>('All');
  const [statusFilters] = useState(['Online', 'Offline']);
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [switchState, setSwitchState] = useState<Record<string, boolean>>({});
  // const [showDisplayFields, setShowDiplayFields] = useState(false);
  const [displayFields] = useState<DisplayFields>({
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
  const fetchClients = async () => {
    try {
      const user = localStorage.getItem('user');
      let firstClients: Cliente[] = [];
      if (user) {
        firstClients = await get<Cliente[]>(`/clients/`) || [];
        firstClients = firstClients.filter((client) => client.name !== 'All');
        setClientFilters(firstClients);

        const client = JSON.parse(user).cliente as Cliente;
        setSelectedClient(client.name);
        setCurretRole(JSON.parse(user).role.name);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };
  fetchClients();
}, []);

useEffect(() => {
  const fetchProducts = async () => {
    try {
      let clientId = '' as Cliente['_id'];
      const user = localStorage.getItem('user');

      // Find clientId only if clientFilters is loaded
      if (clientFilters.length > 0) {
        clientId = clientFilters.find((client) => client.name === selectedClient)?._id || '';
      } else if (user && isInitialFetch) {
        const client = JSON.parse(user).cliente as Cliente;
        clientId = client._id;
      }

      const productParams = { 
        city: selectedCity, 
        cliente: clientId, 
        drive: selectedDrive, 
        status: selectedStatus 
      };
      const response = await get<Product[]>(`/products/`, productParams);
      const productos = response || [];
      const ciudades = [...new Set(productos.map((product: Product) => product.city))] as string[];
      const drives = [...new Set(productos.map((product: Product) => product.drive))] as string[];

      setCurrentProducts(productos);
      setCityFilters(ciudades);
      setDriveFilters(drives);
      if (isInitialFetch) {
        setInitialFetch(false);
      }

    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (clientFilters.length > 0 || isInitialFetch) {
    fetchProducts();
    const interval = setInterval(fetchProducts, 300000);
    return () => clearInterval(interval); // ✅ cleanup when needed
  }

  return () => {}; // ✅ empty cleanup function when condition is false

}, [clientFilters, isInitialFetch, selectedCity, selectedClient, selectedDrive, selectedStatus]);

  const confirmationAlert = () => Swal.fire({
    icon: 'warning',
    title: 'Advertencia',
    text: 'Estas a punto de forzar un flush. estas seguro?',
    showCancelButton: true,
    confirmButtonText: 'Sí, Continuar',
    cancelButtonText: 'Cancelar',
  });

  const handleToggle = async (productId: string) => {
    if (processing[productId]) return; // Prevent multiple clicks
  
    // Show confirmation prompt
      try {
        const result = await confirmationAlert();
        if (result.isConfirmed) {
          setProcessing((prev) => ({ ...prev, [productId]: true }));
          setSwitchState((prev) => ({ ...prev, [productId]: true })); // Turn switch ON
          const requestData = { 
            id: productId,
            commands: [{ "code": "water_wash", "value": true }]
          };
          const response = await post(`/products/sendCommand`, requestData);
          setCurrentProducts((prevProducts) =>
            prevProducts.map((product) =>
              product.id === productId ? { ...product, online: true } : product
            )
          );
          console.log('Command executed:', response);
        }
      } catch (error) {
        console.error("Error deleting user:", error);
      } finally {
        setProcessing((prev) => ({ ...prev, [productId]: false }));
        setSwitchState((prev) => ({ ...prev, [productId]: false })); // Reset switch OFF
      }
    }


  // const handleFieldToggle = (field: keyof DisplayFields) => {
  //   setDisplayFields((prev) => ({
  //     ...prev,
  //     [field]: !prev[field],
  //   }));
  // };

  const filteredProducts = currentProducts.filter((product) => {
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
  
    // Combine all filter conditions
    return matchesSearchQuery;
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
        <title>{`Equipos - ${CONFIG.appName}`}</title>
      </Helmet>
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom>Filtrar Productos</Typography>
        
        {/* <Chip
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
          /> */}
      </Box>
      {/* <Box sx={{ p: 2 }} style={{ display: showDisplayFields ? 'block' : 'none' }}>
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
      </Box> */}
      <Box  sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Buscar en productos"
              variant="outlined"
              fullWidth
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
          <FormControl fullWidth>
              <InputLabel>Ciudad</InputLabel>
              <Select value={selectedCity}  onChange={(e) => setSelectedCity(e.target.value)}>
                <MenuItem value="All">Todas</MenuItem>
                {cityFilters.map((city) => (
                  <MenuItem key={city} value={city}>{city}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {currentRole === 'admin' && (
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth>
                <InputLabel>Cliente</InputLabel>
                <Select value={selectedClient}  onChange={(e) => setSelectedClient(e.target.value)}>
                  <MenuItem value="All">Todos</MenuItem>
                  {clientFilters.map((cliente) => (
                    <MenuItem key={cliente._id} value={cliente.name}>{cliente.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth>
              <InputLabel>Sucursal</InputLabel>
              <Select value={selectedDrive} onChange={(e) => setSelectedDrive(e.target.value)}>
                <MenuItem value="All">Todas</MenuItem>
                {driveFilters.map((drive) => (
                  <MenuItem key={drive} value={drive}>{drive}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <MenuItem value="All">Todos</MenuItem>
                {statusFilters.map((status) => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
      <Box sx={{ p: 2 }}>
        <StyledTableContainer>
          <Paper elevation={3}>
            <Box sx={{ overflowX: 'auto' }}> {/* Ensures table responsiveness */}
              <Grid container>
                <Grid item xs={12} sm={9}>
                  <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
                    Lista de equipos en {selectedClient === 'All' ? 'Todos los clientes' : selectedClient}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3} textAlign='right'>
                  <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
                    <CSVLink data={mappedFilteredData} filename={`Productos_${new Date()}.csv`}>
                      <Button variant="contained" color="primary" fullWidth>
                        Exportar | {filteredProducts.length} 
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
                  {displayFields.cliente && <StyledTableCellHeader>Cliente</StyledTableCellHeader>}
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
                          <Typography variant="body1">
                            <img
                              src={`${CONFIG.ICON_URL}/${product.icon}`}
                              alt={product.name}
                              style={{ width: '40px', height: '40px', marginRight: '10px' }}
                            />
                            {product.name}
                          </Typography>
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
                          {product.cliente.name}
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
                              disabled={!product.online || product.product_type !== 'Osmosis'}
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
                              onClick={() => navigate(`/Equipos/${product.id}`)}
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
      </Box>
    </>
  );
}

export default ProductTableList;

import Swal from "sweetalert2";
import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";

import {
  Box,
  Grid,
  Paper,
  Table,
  Select,
  Button,
  Dialog,
  Checkbox,
  MenuItem,
  TableRow,
  TableBody,
  TableHead,
  TextField,
  InputLabel,
  IconButton,
  Typography,
  FormControl,
  DialogTitle,
  ListItemText,
  DialogContent,
  DialogActions,
  CircularProgress
} from "@mui/material";

import { CustomTab, CustomTabs, StyledTableRow, StyledTableCell, StyledTableContainer, StyledTableCellHeader } from "src/utils/styles";

import { CONFIG } from "src/config-global";

import { SvgColor } from 'src/components/svg-color';

import type { City, Metric, Cliente, Product, PuntosVenta } from './types';

const estados = [
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Ciudad de Mexico',
  'Coahuila',
  'Colima',
  'Durango',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Mexico',
  'Michoacan',
  'Morelos',
  'Nayarit',
  'Nuevo Leon',
  'Oaxaca',
  'Puebla',
  'Queretaro',
  'Quintana Roo',
  'San Luis Potosi',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatan',
  'Zacatecas',
];

const defaultCity: City = {
    state: "",
    city: "",
    lat: 0,
    lon: 0,
  }
const defaultclient = { _id: '', name: '' , email:'', address: {city: '', state: '', country: '', street: '', zip: '', lat: '', lon: ''}}
const defaultMetric = { _id: '', cliente: '', client_name: '', punto_venta_id: '', punto_venta_name: '', tds_range: 0, production_volume_range: 0, rejected_volume_range: 0, flow_rate_speed_range: 0, active_time: 0, metrics_description: '' }

const defaultProduct: Product = {
    id: "",
    name: "",
    city: "",
    state: "",
    product_type: "",
    cliente: defaultclient,
    drive: "",
    online: false,
    icon: "",
    status: [],
    lat: 0,
    lon: 0  
}
const defaultPv = { _id: '', name: '' , client_name:'', cliente: defaultclient, city: defaultCity, city_name: '', productos: [defaultProduct]}

// Helper function to make v2.0 API calls
const apiV2Call = async (endpoint: string, method: string = 'GET', data?: any) => {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  };
  
  if (data && (method === 'POST' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(`${CONFIG.API_BASE_URL_V2}${endpoint}`, options);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

export function CustomizationPageV2() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [puntosVenta, setPuntosVenta] = useState<PuntosVenta[]>([]);

  const [formData, setFormData] = useState<Metric>(defaultMetric);
  const [clientFormData, setClientFormData] = useState<Cliente>(defaultclient);
  
  const [cityFormData, setCityFormData] = useState<City>(defaultCity);

  const [pvFormData, setPvFormData] = useState<PuntosVenta>(defaultPv);
  
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [pvModalOpen, setPvModalOpen] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [tabIndex, setTabIndex] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchMetrics();
    fetchClients();
    fetchCities();
    fetchPuntosVenta();
    fetchProducts();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await apiV2Call('/metrics');
      setMetrics(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await apiV2Call('/clients');
      let filteredClients = (Array.isArray(response) ? response : []).filter((client: Cliente) => client.name !== 'All');

      const user = localStorage.getItem('user');
      if (user) {
        const client_ = JSON.parse(user).cliente as Cliente;
        if (client_.name && client_.name !== 'All') {
          filteredClients = filteredClients.filter((client: Cliente) => client.name === client_.name);
        }
      }
      setClients(filteredClients);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      // Products still come from v1.0 (MongoDB) for now
      const { get } = await import("src/api/axiosHelper");
      const response = await get<Product[]>(`/products`);
      setProducts(response);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchCities = async () => {
    try {
      const response = await apiV2Call('/cities');
      setCities(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Error fetching cities:", error);
    }
  };

  const fetchPuntosVenta = async () => {
    try {
      const response = await apiV2Call('/puntoVentas/all');
      const data = Array.isArray(response) ? response : [];
      
      // Normalize puntos de venta for display
      const formatted = data.map((pv: any) => ({
        ...pv,
        cliente: pv.cliente?._id || pv.cliente || pv.clientId || '',
        client_name: pv.cliente?.name || '',
        city: pv.city?._id || pv.city || '',
        city_name: pv.city?.city || '',
        productos: pv.productos || []
      }));

      setPuntosVenta(formatted as unknown as PuntosVenta[]);
    } catch (error) {
      console.error("Error fetching puntos de venta:", error);
    }
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (editingId) {
        await apiV2Call(`/metrics/${editingId}`, 'PATCH', formData);
      } else {
        await apiV2Call('/metrics', 'POST', formData);
      }
      handleCloseModal();
      fetchMetrics();
    } catch (error) {
      console.error("Error submitting metric:", error);
      Swal.fire('Error', 'Error al guardar métrica', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (metric: Metric) => {
    setFormData(metric);
    setEditingId(metric._id || metric.id || null);
    setModalOpen(true);
  };

  const handleClientEdit = (client: Cliente) => {
    if (!client.address) {
      client.address = defaultclient.address;
    }
    setClientFormData(client);
    setClientModalOpen(true);
  };

  const handleCityEdit = (city: City) => {
    setCityFormData(city);
    setCityModalOpen(true);
  };

  const handlePvEdit = (pv: PuntosVenta) => {
    setPvFormData(pv);
    setPvModalOpen(true);
  };

  const confirmationAlert = () => Swal.fire({
    icon: 'warning',
    title: 'Advertencia',
    text: '¿Estás seguro de que deseas eliminar este registro?',
    showCancelButton: true,
    confirmButtonText: 'Sí, Continuar',
    cancelButtonText: 'Cancelar',
  });

  const handleDelete = async (id: string) => {
    try {
      const result = await confirmationAlert();
      if (result.isConfirmed) {
        await apiV2Call(`/metrics/${id}`, 'DELETE');
        fetchMetrics();
        Swal.fire('Éxito', 'Métrica eliminada', 'success');
      }
    } catch (error) {
      console.error("Error deleting metric:", error);
      Swal.fire('Error', 'Error al eliminar métrica', 'error');
    }
  };

  const handleClientDelete = async (id: string) => {
    try {
      const result = await confirmationAlert();
      if (result.isConfirmed) {
        await apiV2Call(`/clients/${id}`, 'DELETE');
        fetchClients();
        Swal.fire('Éxito', 'Cliente eliminado', 'success');
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      Swal.fire('Error', 'Error al eliminar cliente', 'error');
    }
  };

  const handleCityDelete = async (id: string) => {
    try {
      const result = await confirmationAlert();
      if (result.isConfirmed) {
        await apiV2Call(`/cities/${id}`, 'DELETE');
        fetchCities();
        Swal.fire('Éxito', 'Ciudad eliminada', 'success');
      }
    } catch (error) {
      console.error("Error deleting city:", error);
      Swal.fire('Error', 'Error al eliminar ciudad', 'error');
    }
  };

  const handlePvDelete = async (id: string) => {
    try {
      const result = await confirmationAlert();
      if (result.isConfirmed) {
        await apiV2Call(`/puntoVentas/${id}`, 'DELETE');
        fetchPuntosVenta();
        Swal.fire('Éxito', 'Punto de venta eliminado', 'success');
      }
    } catch (error) {
      console.error("Error deleting PuntoVenta:", error);
      Swal.fire('Error', 'Error al eliminar punto de venta', 'error');
    }
  };

  const handleOpenModal = () => {
    setFormData(defaultMetric);
    setEditingId(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleClientChange = (e: any) => {
    const { name, value } = e.target;
    if (name.includes("address")) {
      const [, addressField] = name.split(".");
      setClientFormData((prevData) => ({
        ...prevData,
        address: {
          ...prevData.address,
          [addressField]: value,
        },
      }));
    } else {
      setClientFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };
  
  const handleCityChange = (e: any) => {
    const { name, value } = e.target;
    setCityFormData((prevData) => ({
      ...prevData,
      [name]: name === "lat" || name === "lon" ? parseFloat(value) : value,
    }));
  };

  const handlePvChange = (e: any) => {
    const { name, value } = e.target;
    setPvFormData((prevData) => ({
      ...prevData,
      [name]: name === "productos" ? (typeof value === "string" ? value.split(",") : value) : value
    }));
  };

  const handleClientSubmit = async () => {
    setLoading(true);
    try {
      if (clientFormData._id || clientFormData.id) {
        const id = clientFormData._id || clientFormData.id;
        await apiV2Call(`/clients/${id}`, 'PATCH', clientFormData);
      } else {
        await apiV2Call('/clients', 'POST', clientFormData);
      }
      handleCloseClientModal();
      fetchClients();
      Swal.fire('Éxito', 'Cliente guardado', 'success');
    } catch (error) {
      console.error("Error submitting client:", error);
      Swal.fire('Error', 'Error al guardar cliente', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCitySubmit = async () => {
    setLoading(true);
    try {
      if (cityFormData._id || cityFormData.id) {
        const id = cityFormData._id || cityFormData.id;
        await apiV2Call(`/cities/${id}`, 'PATCH', cityFormData);
      } else {
        await apiV2Call('/cities', 'POST', cityFormData);
      }
      handleCloseCityModal();
      fetchCities();
      Swal.fire('Éxito', 'Ciudad guardada', 'success');
    } catch (error) {
      console.error("Error submitting city:", error);
      Swal.fire('Error', 'Error al guardar ciudad', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePvSubmit = async () => {
    setLoading(true);
    try {
      if (pvFormData._id || pvFormData.id) {
        const id = pvFormData._id || pvFormData.id;
        await apiV2Call(`/puntoVentas/${id}`, 'PATCH', pvFormData);
      } else {
        await apiV2Call('/puntoVentas', 'POST', pvFormData);
      }
      handleClosePvModal();
      fetchPuntosVenta();
      Swal.fire('Éxito', 'Punto de venta guardado', 'success');
    } catch (error) {
      console.error("Error submitting punto de venta:", error);
      Swal.fire('Error', 'Error al guardar punto de venta', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenClientModal = () => {
    setClientFormData(defaultclient);
    setClientModalOpen(true);
  };

  const handleCloseClientModal = () => {
    setClientModalOpen(false);
  };

  const handleOpenCityModal = () => {
    setCityFormData(defaultCity);
    setCityModalOpen(true);
  };
  
  const handleOpenPvModal = () => {
    setPvFormData(defaultPv);
    setPvModalOpen(true);
  };

  const handleCloseCityModal = () => {
    setCityModalOpen(false);
  };

  const handleClosePvModal = () => {
    setPvModalOpen(false);
  };
  
  return (
    <>
      <Helmet>
        <title>Personalizar configuraciones V2 - {CONFIG.appName}</title>
      </Helmet>
      <Box sx={{ p: 2 }}>
        <CustomTabs 
          value={tabIndex}
          onChange={(e, newValue) => setTabIndex(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth" 
          centered
        >
          <CustomTab label="Métricas" />
          <CustomTab label="PuntosVenta" />
          <CustomTab label="Clientes" />
          <CustomTab label="Ciudades" />
        </CustomTabs>
        
        {tabIndex === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ overflowX: 'auto' }}>
                <Grid container>
                  <Grid item xs={12} sm={9}>
                    <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
                      Lista de métricas
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3} textAlign='right'>
                    <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
                      <Button variant="contained" color="primary" onClick={handleOpenModal} fullWidth>
                        Nueva Métrica
                      </Button>
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
              <StyledTableContainer>
                <Paper elevation={3}>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f4f6f8' }}>
                          <StyledTableCellHeader>Cliente</StyledTableCellHeader>
                          <StyledTableCellHeader>Punto de Venta</StyledTableCellHeader>
                          <StyledTableCellHeader>Rango TDS</StyledTableCellHeader>
                          <StyledTableCellHeader>Volumen de Producción</StyledTableCellHeader>
                          <StyledTableCellHeader>Acciones</StyledTableCellHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {metrics.map((metric) => (
                          <StyledTableRow key={metric._id || metric.id}>
                            <StyledTableCell>{metric.client_name}</StyledTableCell>
                            <StyledTableCell>{metric.punto_venta_name || '-'}</StyledTableCell>
                            <StyledTableCell>{metric.tds_range}</StyledTableCell>
                            <StyledTableCell>{metric.production_volume_range}</StyledTableCell>
                            <StyledTableCell>
                              <IconButton onClick={() => handleEdit(metric)} sx={{ mr: 1, color: 'primary.main' }}>
                                <SvgColor src='./assets/icons/actions/edit.svg' />
                              </IconButton>
                              <IconButton onClick={() => handleDelete(metric._id || metric.id || '')} sx={{ mr: 1, color: 'danger.main' }}>
                                <SvgColor src='./assets/icons/actions/delete.svg' />
                              </IconButton>
                            </StyledTableCell>
                          </StyledTableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Paper>
              </StyledTableContainer>
            </Grid>
          </Grid>
        )}

        {tabIndex === 1 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ overflowX: 'auto' }}>
                <Grid container>
                  <Grid item xs={12} sm={9}>
                    <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
                      Lista de Puntos de venta 
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3} textAlign='right'>
                    <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
                      <Button variant="contained" color="primary" onClick={handleOpenPvModal} fullWidth>
                        Nuevo Punto de Venta
                      </Button>
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
              <StyledTableContainer>
                <Paper elevation={3}>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f4f6f8' }}>
                          <StyledTableCellHeader>Cliente</StyledTableCellHeader>
                          <StyledTableCellHeader>Nombre</StyledTableCellHeader>
                          <StyledTableCellHeader>Ciudad</StyledTableCellHeader>
                          <StyledTableCellHeader># Productos</StyledTableCellHeader>
                          <StyledTableCellHeader>Acciones</StyledTableCellHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {puntosVenta.map((pv) => (
                          <StyledTableRow key={pv._id || pv.id}>
                            <StyledTableCell>{pv.client_name}</StyledTableCell>
                            <StyledTableCell>{pv.name}</StyledTableCell>
                            <StyledTableCell>{pv.city_name}</StyledTableCell>
                            <StyledTableCell>{pv.productos?.length || 0}</StyledTableCell>
                            <StyledTableCell>
                              <IconButton onClick={() => handlePvEdit(pv)} sx={{ mr: 1, color: 'primary.main' }}>
                                <SvgColor src='./assets/icons/actions/edit.svg' />
                              </IconButton>
                              <IconButton onClick={() => handlePvDelete(pv._id || pv.id || '')} sx={{ mr: 1, color: 'danger.main' }}>
                                <SvgColor src='./assets/icons/actions/delete.svg' />
                              </IconButton>
                            </StyledTableCell>
                          </StyledTableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Paper>
              </StyledTableContainer>
            </Grid>
          </Grid>
        )}

        {tabIndex === 2 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ overflowX: 'auto' }}>
                <Grid container>
                  <Grid item xs={12} sm={9}>
                    <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
                      Lista de clientes 
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3} textAlign='right'>
                    <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
                      <Button variant="contained" color="primary" onClick={handleOpenClientModal} fullWidth>
                        Nuevo Cliente
                      </Button>
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
              <StyledTableContainer>
                <Paper elevation={3}>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f4f6f8' }}>
                          <StyledTableCellHeader>Nombre</StyledTableCellHeader>
                          <StyledTableCellHeader>Email</StyledTableCellHeader>
                          <StyledTableCellHeader>Teléfono</StyledTableCellHeader>
                          <StyledTableCellHeader>Acciones</StyledTableCellHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {clients.map((client) => (
                          <StyledTableRow key={client._id || client.id}>
                            <StyledTableCell>{client.name}</StyledTableCell>
                            <StyledTableCell>{client.email}</StyledTableCell>
                            <StyledTableCell>{client.phone}</StyledTableCell>
                            <StyledTableCell>
                              <IconButton sx={{ mr: 1, color: 'primary.main' }} onClick={() => handleClientEdit(client)}>
                                <SvgColor src='./assets/icons/actions/edit.svg' />
                              </IconButton>
                              <IconButton sx={{ mr: 1, color: 'danger.main' }} onClick={() => handleClientDelete(client._id || client.id || '')}>
                                <SvgColor src='./assets/icons/actions/delete.svg' />
                              </IconButton>
                            </StyledTableCell>
                          </StyledTableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Paper>
              </StyledTableContainer>
            </Grid>
          </Grid>
        )}
        
        {tabIndex === 3 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ overflowX: 'auto' }}>
                <Grid container>
                  <Grid item xs={12} sm={9}>
                    <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
                      Lista de ciudades 
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3} textAlign='right'>
                    <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
                      <Button variant="contained" color="primary" onClick={handleOpenCityModal} fullWidth>
                        Nueva Ciudad
                      </Button>
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
              <StyledTableContainer>
                <Paper elevation={3}>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f4f6f8' }}>
                          <StyledTableCellHeader>Estado</StyledTableCellHeader>
                          <StyledTableCellHeader>Ciudad</StyledTableCellHeader>
                          <StyledTableCellHeader>Latitud</StyledTableCellHeader>
                          <StyledTableCellHeader>Longitud</StyledTableCellHeader>
                          <StyledTableCellHeader>Acciones</StyledTableCellHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cities.map((city) => (
                          <StyledTableRow key={city._id || city.id}>
                            <StyledTableCell>{city.state}</StyledTableCell>
                            <StyledTableCell>{city.city}</StyledTableCell>
                            <StyledTableCell>{city.lat}</StyledTableCell>
                            <StyledTableCell>{city.lon}</StyledTableCell>
                            <StyledTableCell>
                              <IconButton sx={{ mr: 1, color: 'primary.main' }} onClick={() => handleCityEdit(city)}>
                                <SvgColor src='./assets/icons/actions/edit.svg' />
                              </IconButton>
                              <IconButton sx={{ mr: 1, color: 'danger.main' }} onClick={() => handleCityDelete(city._id || city.id || '')}>
                                <SvgColor src='./assets/icons/actions/delete.svg' />
                              </IconButton>
                            </StyledTableCell>
                          </StyledTableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Paper>
              </StyledTableContainer>
            </Grid>
          </Grid>
        )}
        
        {/* Modal for Creating / Editing Metrics */}
        <Grid item xs={12}>
          <Dialog open={modalOpen} onClose={handleCloseModal} fullWidth maxWidth="sm">
            <DialogTitle>{editingId ? "Editar Métrica" : "Nueva Métrica"}</DialogTitle>
            <DialogContent>
              <Box display="flex" flexDirection="column" gap={2} mt={1}>
                <FormControl fullWidth>
                  <InputLabel>Cliente</InputLabel>
                  <Select value={formData.cliente || formData.clientId || ''} name="cliente" onChange={handleChange} fullWidth>
                    {clients.map((cliente) => (
                      <MenuItem key={cliente._id || cliente.id} value={cliente._id || cliente.id}>{cliente.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Punto de Venta</InputLabel>
                  <Select value={formData.punto_venta_id || ''} name="punto_venta_id" onChange={handleChange} fullWidth>
                    {puntosVenta.map((pv) => (
                      <MenuItem key={pv._id || pv.id} value={pv._id || pv.id}>{pv.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField label="Rango Tds" name="tds_range" type="number" value={formData.tds_range} onChange={handleChange} fullWidth />
                <TextField label="Volumen de producción" name="production_volume_range" type="number" value={formData.production_volume_range} onChange={handleChange} fullWidth />
                <TextField label="Volumen de rechazo" name="rejected_volume_range" type="number" value={formData.rejected_volume_range} onChange={handleChange} fullWidth />
                <TextField label="Rango de velocidad de flujo" name="flow_rate_speed_range" type="number" value={formData.flow_rate_speed_range} onChange={handleChange} fullWidth />
                <TextField label="Descripción" name="metrics_description" value={formData.metrics_description} onChange={handleChange} fullWidth multiline rows={3} />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseModal} color="secondary">Cancelar</Button>
              <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading}>
                {loading ? <CircularProgress size={24} /> : editingId ? "Actualizar" : "Guardar"}
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Client Modal */}
          <Dialog open={clientModalOpen} onClose={handleCloseClientModal} fullWidth maxWidth="sm">
            <DialogTitle>{clientFormData._id || clientFormData.id ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
            <DialogContent>
              <Box display="flex" flexDirection="column" gap={2} mt={1}>
                <TextField label="Nombre" name="name" value={clientFormData.name} onChange={handleClientChange} fullWidth />
                <TextField label="Email" name="email" value={clientFormData.email} onChange={handleClientChange} fullWidth />
                <TextField label="Teléfono" name="phone" value={clientFormData.phone} onChange={handleClientChange} fullWidth />
                <TextField label="Dirección" name="address.street" value={clientFormData.address.street} onChange={handleClientChange} fullWidth />
                <TextField label="Ciudad" name="address.city" value={clientFormData.address.city} onChange={handleClientChange} fullWidth />
                <FormControl fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select value={clientFormData.address.state} name="address.state" onChange={handleClientChange} fullWidth>
                    {estados.map((state) => (
                      <MenuItem key={state} value={state}>{state}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField label="Código Postal" name="address.zip" value={clientFormData.address.zip} onChange={handleClientChange} fullWidth />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseClientModal} color="secondary">Cancelar</Button>
              <Button onClick={handleClientSubmit} variant="contained" color="primary" disabled={loading}>
                {loading ? <CircularProgress size={24} /> : (clientFormData._id || clientFormData.id) ? "Actualizar" : "Guardar"}
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* City Modal */}
          <Dialog open={cityModalOpen} onClose={handleCloseCityModal} fullWidth maxWidth="sm">
            <DialogTitle>{cityFormData._id || cityFormData.id ? "Editar Ciudad" : "Nueva Ciudad"}</DialogTitle>
            <DialogContent>
              <Box display="flex" flexDirection="column" gap={2} mt={1}>
                <FormControl fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select value={cityFormData.state} name="state" onChange={handleCityChange} fullWidth>
                    {estados.map((state) => (
                      <MenuItem key={state} value={state}>{state}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField label="Ciudad" name="city" value={cityFormData.city} onChange={handleCityChange} fullWidth />
                <TextField label="Latitud" name="lat" type="number" value={cityFormData.lat} onChange={handleCityChange} fullWidth />
                <TextField label="Longitud" name="lon" type="number" value={cityFormData.lon} onChange={handleCityChange} fullWidth />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseCityModal} color="secondary">Cancelar</Button>
              <Button onClick={handleCitySubmit} variant="contained" color="primary" disabled={loading}>
                {loading ? <CircularProgress size={24} /> : (cityFormData._id || cityFormData.id) ? "Actualizar" : "Guardar"}
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* PuntoVenta Modal */}
          <Dialog open={pvModalOpen} onClose={handleClosePvModal} fullWidth maxWidth="sm">
            <DialogTitle>
              {pvFormData._id || pvFormData.id ? "Editar Punto de Venta" : "Nuevo Punto de Venta"}
            </DialogTitle>
            <DialogContent>
              <Box display="flex" flexDirection="column" gap={2} mt={1}>
                <TextField
                  label="Nombre"
                  name="name"
                  value={pvFormData.name || ""}
                  onChange={handlePvChange}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>Productos</InputLabel>
                  <Select
                    multiple
                    name="productos"
                    value={pvFormData.productos || []}
                    onChange={handlePvChange}
                    renderValue={(selected) =>
                      products
                        .filter((p) => selected.includes(p._id))
                        .map((p) => p.name)
                        .join(", ")
                    }
                  >
                    {products.map((prod) => (
                      <MenuItem key={prod._id} value={prod._id}>
                        <Checkbox checked={pvFormData.productos?.includes(prod._id)} />
                        <ListItemText primary={prod.name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Ciudad</InputLabel>
                  <Select
                    value={pvFormData.city || ""}
                    name="city"
                    onChange={handlePvChange}
                  >
                    {cities.map((c) => (
                      <MenuItem key={c._id || c.id} value={c._id || c.id}>
                        {c.city || c._id || c.id}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Cliente</InputLabel>
                  <Select
                    value={pvFormData.cliente || ""}
                    name="cliente"
                    onChange={handlePvChange}
                  >
                    {clients.map((cli) => (
                      <MenuItem key={cli._id || cli.id} value={cli._id || cli.id}>
                        {cli.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClosePvModal} color="secondary">
                Cancelar
              </Button>
              <Button
                onClick={handlePvSubmit}
                variant="contained"
                color="primary"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : (pvFormData._id || pvFormData.id) ? "Actualizar" : "Guardar"}
              </Button>
            </DialogActions>
          </Dialog>
        </Grid>
      </Box>
    </>
  );
}

export default CustomizationPageV2;

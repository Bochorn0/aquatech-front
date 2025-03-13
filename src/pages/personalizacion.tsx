import Swal from "sweetalert2";
import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";

import {
  Box,
  Chip,
  Grid,
  Table,
  Select,
  Switch,
  Button,
  Dialog,
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
  DialogContent,
  DialogActions,
  CircularProgress
} from "@mui/material";

import { CustomTab, CustomTabs, StyledTableRow, StyledTableCell, StyledTableContainer, StyledTableCellHeader } from "src/utils/styles";

import { CONFIG } from "src/config-global";
import { get, post, patch, remove } from "src/api/axiosHelper";

import { SvgColor } from 'src/components/svg-color';

import type { City, Metric, Cliente } from './types';

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

const ProductTypes = ['Osmosis', 'Nivel']

const defaultclient = { _id: '', name: '' , email:'', address: {city: '', state: '', country: '', street: '', zip: '', lat: '', lon: ''}}
const defaultMetric = { _id: '', cliente: '', client_name: '', product_type: '', tds_range: 0, production_volume_range: 0, temperature_range: 0, rejected_volume_range: 0, flow_rate_speed_range: 0, active_time: 0, metrics_description: '', filter_only_online: true }
export function CustomizationPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);

  const [formData, setFormData] = useState<Metric>(defaultMetric);
  const [clientFormData, setClientFormData] = useState<Cliente>(defaultclient);
  
  const [cityFormData, setCityFormData] = useState<City>({
    state: "",
    city: "",
    lat: 0,
    lon: 0,
  });
  
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    fetchMetrics();
    fetchClients();
    fetchCities();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await get<Metric[]>(`/metrics`);
      setMetrics(response);
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await get<Cliente[]>(`/clients`);
      let filteredClients = response.filter(client => client.name !== 'All');

      const user = localStorage.getItem('user');
      if (user) {
        const client_ = JSON.parse(user).cliente as Cliente;
        console.log('client_',client_);
        if (client_.name && client_.name !== 'All') {
        filteredClients = filteredClients.filter(client => client.name === client_.name);
        }
        console.log('filteredClients',filteredClients);
      }
      setClients(filteredClients);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchCities = async () => {
    try {
      const response = await get<City[]>(`/cities`);
      setCities(response);
    } catch (error) {
      console.error("Error fetching cities:", error);
    }
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    console.log('e',e);
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (editingId) {
        await patch<Metric>(`/metrics/${editingId}`, formData);
      } else {
        await post<Metric>(`/metrics`, formData);
      }
      handleCloseModal();
      fetchMetrics();
    } catch (error) {
      console.error("Error submitting metric:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (metric: Metric) => {
    setFormData(metric);
    setEditingId(metric._id || null);
    setModalOpen(true);
  };

  const handleClientEdit = (client: Cliente) => {
    console.log('client edit',client);
    if (!client.address) {
      client.address = defaultclient.address
    }
    setClientFormData(client);
    setClientModalOpen(true);
  };

  const handleCityEdit = (city: City) => {
    setCityFormData(city);
    setCityModalOpen(true);
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
        await remove<Metric>(`/metrics/${id}`);
        fetchMetrics();
      }
    } catch (error) {
      console.error("Error deleting metric:", error);
    }
  };

  const handleClientDelete = async (id: string) => {
    try {
      const result = await confirmationAlert();
      if (result.isConfirmed) {
        await remove<Cliente>(`/clients/${id}`);
        fetchClients();
      }
    } catch (error) {
      console.error("Error deleting client:", error);
    }
  };

  const handleCityDelete = async (id: string) => {
    try {
      const result = await confirmationAlert();
      if (result.isConfirmed) {
        await remove<City>(`/cities/${id}`);
        fetchCities();
      }
    } catch (error) {
      console.error("Error deleting city:", error);
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

  const handleClientChange = (e:any) => {
    const { name, value } = e.target;
    if (name.includes("address")) {
      const [addressKey, addressField] = name.split(".");
      console.log('addressKey',addressKey);
      setClientFormData((prevData) => ({
        ...prevData,
        address: {
          ...prevData.address,
          [addressField]: value,
        },
      }));
    }
    else {
      setClientFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };
  
  const handleCityChange = (e : any) => {
    console.log('e',e);
    const { name, value } = e.target;
    setCityFormData((prevData) => ({
      ...prevData,
      [name]: name === "lat" || name === "lon" ? parseFloat(value) : value,
    }));
  };
  
  const handleClientSubmit = async () => {
    setLoading(true);
    try {
      if (clientFormData._id) {
        await patch<Cliente>(`/clients/${clientFormData._id}`, clientFormData);
      } else {
        await post<Cliente>(`/clients`, clientFormData);
      }
      handleCloseClientModal();
      fetchClients();
    } catch (error) {
      console.error("Error submitting client:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCitySubmit = async () => {
    setLoading(true);
    try {
      if (cityFormData._id) {
        await patch<City>(`/cities/${cityFormData._id}`, cityFormData);
      } else {
        await post<City>(`/cities`, cityFormData);
      }
      handleCloseCityModal();
      fetchCities();
    } catch (error) {
      console.error("Error submitting city:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenClientModal = () => {
    setClientFormData(defaultclient);
    console.log('clientFormData',clientFormData);
    setClientModalOpen(true);
  };

  const handleCloseClientModal = () => {
    setClientModalOpen(false);
  };

  const handleOpenCityModal = () => {
    setCityFormData({
      state: "",
      city: "",
      lat: 0,
      lon: 0,
    });
    setCityModalOpen(true);
  };

  const handleCloseCityModal = () => {
    setCityModalOpen(false);
  };
  
  return (
    <>
      <Helmet>
        <title>Personalizar configuraciones - {CONFIG.appName}</title>
      </Helmet>
      <Box sx={{ p: 2 }}>

      <CustomTabs value={tabIndex}
            onChange={(e, newValue) => setTabIndex(newValue)}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth" centered>
          <CustomTab label="Métricas" />
          <CustomTab label="Clientes" />
          <CustomTab label="Ciudades" />
      </CustomTabs>
        {tabIndex === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ overflowX: 'auto' }}> {/* Ensures table responsiveness */}
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
                <Table>
                  <TableHead>
                    <StyledTableRow>
                      <StyledTableCellHeader>Cliente</StyledTableCellHeader>
                      <StyledTableCellHeader>Tipo de Producto</StyledTableCellHeader>
                      <StyledTableCellHeader>Rango TDS</StyledTableCellHeader>
                      <StyledTableCellHeader>Volumen de Producción</StyledTableCellHeader>
                      <StyledTableCellHeader>Temperatura</StyledTableCellHeader>
                      <StyledTableCellHeader>Acciones</StyledTableCellHeader>
                    </StyledTableRow>
                  </TableHead>
                  <TableBody>
                    {metrics.map((metric) => (
                      <StyledTableRow key={metric._id}>
                        <StyledTableCell>{metric.client_name}</StyledTableCell>
                        <StyledTableCell>{metric.product_type}</StyledTableCell>
                        <StyledTableCell>{metric.tds_range}</StyledTableCell>
                        <StyledTableCell>{metric.production_volume_range}</StyledTableCell>
                        <StyledTableCell>{metric.temperature_range}</StyledTableCell>
                        <StyledTableCell>
                          <IconButton onClick={() => handleEdit(metric)} sx={{ mr: 1, color: 'primary.main' }}>
                            <SvgColor src='./assets/icons/actions/edit.svg' />
                          </IconButton>
                          <IconButton onClick={() => handleDelete(metric._id!)} sx={{ mr: 1, color: 'danger.main' }}>
                            <SvgColor src='./assets/icons/actions/delete.svg' />
                          </IconButton>
                        </StyledTableCell>
                    </StyledTableRow>
                    ))}
                  </TableBody>
                </Table>
              </StyledTableContainer>
            </Grid>
          </Grid>
        )}

        {tabIndex === 1 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ overflowX: 'auto' }}> {/* Ensures table responsiveness */}
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
                <Table>
                  <TableHead>
                    <TableRow>
                      <StyledTableCellHeader>Nombre</StyledTableCellHeader>
                      <StyledTableCellHeader>Email</StyledTableCellHeader>
                      <StyledTableCellHeader>Teléfono</StyledTableCellHeader>
                      <StyledTableCellHeader>Acciones</StyledTableCellHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client._id}>
                        <StyledTableCell>{client.name}</StyledTableCell>
                        <StyledTableCell>{client.email}</StyledTableCell>
                        <StyledTableCell>{client.phone}</StyledTableCell>
                        <StyledTableCell>
                          <IconButton sx={{ mr: 1, color: 'primary.main' }} onClick={() => handleClientEdit(client)}>
                            <SvgColor src='./assets/icons/actions/edit.svg' />
                          </IconButton>
                          <IconButton sx={{ mr: 1, color: 'danger.main' }} onClick={() => handleClientDelete(client._id!)}>
                            <SvgColor src='./assets/icons/actions/delete.svg' />
                          </IconButton>
                        </StyledTableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </StyledTableContainer>
            </Grid>
          </Grid>
        )}
        {tabIndex === 2 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ overflowX: 'auto' }}> {/* Ensures table responsiveness */}
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
                <Table>
                  <TableHead>
                    <StyledTableRow>
                      <StyledTableCellHeader>Estado</StyledTableCellHeader>
                      <StyledTableCellHeader>Ciudad</StyledTableCellHeader>
                      <StyledTableCellHeader>Latitud</StyledTableCellHeader>
                      <StyledTableCellHeader>Longitud</StyledTableCellHeader>
                      <StyledTableCell> Acciones </StyledTableCell>
                    </StyledTableRow>
                  </TableHead>
                  <TableBody>
                    {cities.map((city) => (
                      <StyledTableRow key={city._id}>
                        <StyledTableCell>{city.state}</StyledTableCell>
                        <StyledTableCell>{city.city}</StyledTableCell>
                        <StyledTableCell>{city.lat}</StyledTableCell>
                        <StyledTableCell>{city.lon}</StyledTableCell>
                        <StyledTableCell>
                          <IconButton sx={{ mr: 1, color: 'primary.main' }} onClick={() => handleCityEdit(city)}>
                            <SvgColor src='./assets/icons/actions/edit.svg' />
                          </IconButton>
                          <IconButton sx={{ mr: 1, color: 'danger.main' }} onClick={() => handleCityDelete(city._id!)}>
                            <SvgColor src='./assets/icons/actions/delete.svg' />
                          </IconButton>
                        </StyledTableCell>
                      </StyledTableRow>
                    ))}
                  </TableBody>
                </Table>
              </StyledTableContainer>
            </Grid>
          </Grid>
        )}
       {/* Modal for Creating / Editing */}
       <Grid item xs={12}>
        <Dialog open={modalOpen} onClose={handleCloseModal} fullWidth maxWidth="sm">
          <DialogTitle>{editingId ? "Editar Métrica" : "Nueva Métrica"}</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <FormControl fullWidth>
                <InputLabel>Cliente</InputLabel>
                <Select value={formData.cliente} name="cliente" onChange={handleChange} fullWidth>
                  {clients.map((cliente) => (
                    <MenuItem key={cliente._id} value={cliente._id}>{cliente.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Tipo de Producto</InputLabel>
                <Select value={formData.product_type} name="product_type" onChange={handleChange} fullWidth>
                  {ProductTypes.map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField label="Rango Tds" name="tds_range" type="number" value={formData.tds_range} onChange={handleChange} fullWidth />
              <TextField label="Volumen de producción" name="production_volume_range" type="number" value={formData.production_volume_range} onChange={handleChange} fullWidth />
              <TextField label="Rango de temperatura" name="temperature_range" type="number" value={formData.temperature_range} onChange={handleChange} fullWidth />
              <TextField label="Volumen de rechazo" name="rejected_volume_range" type="number" value={formData.rejected_volume_range} onChange={handleChange} fullWidth />
              <TextField label="Rango de velocidad de flujo" name="flow_rate_speed_range" type="number" value={formData.flow_rate_speed_range} onChange={handleChange} fullWidth />
              <Chip
                  label="Filtrar solo activos"
                  color='default'
                  sx={{ display: 'flex', alignItems: 'center', padding: '5px' }}
                  icon={
                    <Switch
                      title="Toma en cuenta solo los productos en linea al usar las metricas"
                      checked={formData.filter_only_online} 
                      onChange={(e) => setFormData((prevData) => ({ ...prevData, filter_only_online: e.target.checked }))}
                    />
                  }
                />
              {/* <TextField label="tiempo activo" name="active_time" type="number" value={formData.active_time} onChange={handleChange} fullWidth /> */}
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
        <Dialog open={clientModalOpen} onClose={handleCloseClientModal} fullWidth maxWidth="sm">
          <DialogTitle>{clientFormData._id ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <TextField label="Nombre" name="name" value={clientFormData.name} onChange={handleClientChange} fullWidth />
              <TextField label="Email" name="email" value={clientFormData.email} onChange={handleClientChange} fullWidth />
              <TextField label="Teléfono" name="phone" value={clientFormData.phone} onChange={handleClientChange} fullWidth />
              {/* Address Fields */}
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
              {loading ? <CircularProgress size={24} /> : clientFormData._id ? "Actualizar" : "Guardar"}
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog open={cityModalOpen} onClose={handleCloseCityModal} fullWidth maxWidth="sm">
          <DialogTitle>{cityFormData._id ? "Editar Ciudad" : "Nueva Ciudad"}</DialogTitle>
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
              {loading ? <CircularProgress size={24} /> : cityFormData._id ? "Actualizar" : "Guardar"}
            </Button>
          </DialogActions>
        </Dialog>
      </Grid>
      </Box>
    </>
  );
}

export default CustomizationPage;

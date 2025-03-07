import axios from "axios";
import Swal from "sweetalert2";
import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";

import { styled } from '@mui/material/styles';
import {
  Box,
  Tab,
  Tabs,
  Grid,
  Table,
  Select,
  Button,
  Dialog,
  MenuItem,
  TableRow,
  TableBody,
  TableHead,
  TableCell,
  TextField,
  InputLabel,
  IconButton,
  Typography,
  FormControl,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  CircularProgress
} from "@mui/material";

import { CONFIG } from "src/config-global";

import { SvgColor } from 'src/components/svg-color';

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

interface Metric {
  _id?: string;
  cliente: string;
  product_type: string;
  tds_range: number;
  production_volume_range: number;
  temperature_range: number;
  rejected_volume_range: number;
  flow_rate_speed_range: number;
  active_time: number;
  metrics_description: string;
}
interface Client {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    lat: string;
    lng: string;
  };
}

interface City {
  _id?: string;
  state: string;
  city: string;
  lat: number;
  lon: number;
}

// Styled Tabs
const CustomTabs = styled(Tabs)({
  backgroundColor: "#fff",
  boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
  borderRadius: "8px",
  padding: "4px",
  "& .MuiTabs-indicator": {
    display: "none", // Hide default indicator
  },
});

// Styled Tab
const CustomTab = styled(Tab)({
  textTransform: "none",
  fontWeight: 600,
  fontSize: "16px",
  borderRadius: "8px",
  padding: "10px 16px",
  transition: "all 0.3s ease",
"&.Mui-selected": {
    background: "linear-gradient(135deg, rgb(255, 86, 48), rgb(255, 127, 80))", // Warm red-orange gradient
    color: "#fff",
    boxShadow: "0px 3px 6px rgba(255, 86, 48, 0.3)", // Soft orange glow
  },
  "&:hover": {
    backgroundColor: "rgba(255, 86, 48, 0.1)", // Light hover effect
  }
});

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

export function CustomizationPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);

  const [formData, setFormData] = useState<Metric>({
    cliente: "",
    product_type: "",
    tds_range: 0,
    production_volume_range: 0,
    temperature_range: 0,
    rejected_volume_range: 0,
    flow_rate_speed_range: 0,
    active_time: 0,
    metrics_description: "",
  });
  const [clientFormData, setClientFormData] = useState<Client>({
    name: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      lat: "",
      lng: "",
    },
  });
  
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
  const [clients, setClients] = useState<Client[]>([]);
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    fetchMetrics();
    fetchClients();
    fetchCities();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/metrics`);
      setMetrics(response.data);
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/clients`);
      setClients(response.data);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchCities = async () => {
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/cities`);
      setCities(response.data);
    } catch (error) {
      console.error("Error fetching cities:", error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: name.includes("range") || name === "active_time" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (editingId) {
        await axios.patch(`${CONFIG.API_BASE_URL}/metrics/${editingId}`, formData);
      } else {
        await axios.post(`${CONFIG.API_BASE_URL}/metrics`, formData);
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

  const handleClientEdit = (client: Client) => {
    console.log('client edit',client);
    if (!client.address) {
      client.address = {
        street: "",
        city: "",
        state: "",
        zip: "",
        country: "",
        lat: "",
        lng: "",
      };
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
        await axios.delete(`${CONFIG.API_BASE_URL}/metrics/${id}`);
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
        await axios.delete(`${CONFIG.API_BASE_URL}/clients/${id}`);
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
        await axios.delete(`${CONFIG.API_BASE_URL}/cities/${id}`);
        fetchCities();
      }
    } catch (error) {
      console.error("Error deleting city:", error);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      cliente: "",
      product_type: "",
      tds_range: 0,
      production_volume_range: 0,
      temperature_range: 0,
      rejected_volume_range: 0,
      flow_rate_speed_range: 0,
      active_time: 0,
      metrics_description: "",
    });
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
        await axios.patch(`${CONFIG.API_BASE_URL}/clients/${clientFormData._id}`, clientFormData);
      } else {
        await axios.post(`${CONFIG.API_BASE_URL}/clients`, clientFormData);
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
        await axios.patch(`${CONFIG.API_BASE_URL}/cities/${cityFormData._id}`, cityFormData);
      } else {
        await axios.post(`${CONFIG.API_BASE_URL}/cities`, cityFormData);
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
    setClientFormData({
      name: "",
      email: "",
      phone: "",
      address: {
        street: "",
        city: "",
        state: "",
        zip: "",
        country: "",
        lat: "",
        lng: "",
      },
    });
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
                      <StyledTableCellHeader>TDS Range</StyledTableCellHeader>
                      <StyledTableCellHeader>Production Volume</StyledTableCellHeader>
                      <StyledTableCellHeader>Temperature</StyledTableCellHeader>
                      <StyledTableCellHeader>Acciones</StyledTableCellHeader>
                    </StyledTableRow>
                  </TableHead>
                  <TableBody>
                    {metrics.map((metric) => (
                      <StyledTableRow key={metric._id}>
                        <StyledTableCell>{metric.cliente}</StyledTableCell>
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
              <TextField label="Cliente" name="cliente" value={formData.cliente} onChange={handleChange} fullWidth />
              <TextField label="Tipo de Producto" name="product_type" value={formData.product_type} onChange={handleChange} fullWidth />
              <TextField label="TDS Range" name="tds_range" type="number" value={formData.tds_range} onChange={handleChange} fullWidth />
              <TextField label="Production Volume" name="production_volume_range" type="number" value={formData.production_volume_range} onChange={handleChange} fullWidth />
              <TextField label="Temperature" name="temperature_range" type="number" value={formData.temperature_range} onChange={handleChange} fullWidth />
              <TextField label="Rejected Volume" name="rejected_volume_range" type="number" value={formData.rejected_volume_range} onChange={handleChange} fullWidth />
              <TextField label="Flow Rate Speed" name="flow_rate_speed_range" type="number" value={formData.flow_rate_speed_range} onChange={handleChange} fullWidth />
              <TextField label="Active Time" name="active_time" type="number" value={formData.active_time} onChange={handleChange} fullWidth />
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

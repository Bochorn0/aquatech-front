import type { SelectChangeEvent } from "@mui/material/Select";

import Swal from "sweetalert2";
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";

import {
  Box,
  Chip,
  Grid,
  Paper,
  Table,
  Select,
  Switch,
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
import { get, post, patch, remove } from "src/api/axiosHelper";

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

const ProductTypes = ['Osmosis', 'Nivel']

const defaultCity: City = {
    state: "",
    city: "",
    lat: 0,
    lon: 0,
  }
const defaultclient = { _id: '', name: '' , email:'', address: {city: '', state: '', country: '', street: '', zip: '', lat: '', lon: ''}}
const defaultMetric = { _id: '', cliente: '', client_name: '', product_type: '', tds_range: 0, production_volume_range: 0, temperature_range: 0, rejected_volume_range: 0, flow_rate_speed_range: 0, active_time: 0, metrics_description: '', filter_only_online: true }

const defaultPv = { _id: '', name: '' , client_name:'', cliente: defaultclient, city: defaultCity, city_name: '', productos: []}
export function CustomizationPage() {
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
  const [productFormData, setProductFormData] = useState<{ _id?: string; name?: string; cliente: string; city: string; state: string; product_type: string }>({
    cliente: '',
    city: '',
    state: '',
    product_type: 'Osmosis',
  });
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productSearchText, setProductSearchText] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [bulkProductFormData, setBulkProductFormData] = useState<{ cliente: string; city: string; state: string; product_type: string }>({
    cliente: '',
    city: '',
    state: '',
    product_type: '',
  });
  const [bulkProductModalOpen, setBulkProductModalOpen] = useState(false);

  useEffect(() => {
    fetchMetrics();
    fetchClients();
    fetchCities();
    fetchPuntosVenta();
    fetchProducts();
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

  const fetchProducts = async () => {
    try {
      const response = await get<Product[]>(`/products`);
      setProducts(response);
    } catch (error) {
      console.error("Error fetching products:", error);
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

const fetchPuntosVenta = async () => {
  try {
    const response = await get<PuntosVenta[]>(`/puntoVentas/all`);

    // Normalizamos todos los puntos de venta
    const formatted = response.map((pv) => ({
      ...pv,
      cliente: typeof pv.cliente === 'object' && pv.cliente !== null ? pv.cliente._id : pv.cliente,
      client_name: typeof pv.cliente === 'object' && pv.cliente !== null ? pv.cliente.name : "",
      city: typeof pv.city === 'object' && pv.city !== null ? pv.city._id : pv.city,
      city_name: typeof pv.city === 'object' && pv.city !== null ? pv.city.city : "",
      productos: Array.isArray(pv.productos) ? pv.productos.map((p: any) => typeof p === 'object' && p !== null ? p._id : p) : []
    }));

    setPuntosVenta(formatted as unknown as PuntosVenta[]);

  } catch (error) {
    console.error("Error fetching puntos de venta:", error);
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

  const handlePvEdit = (pv: PuntosVenta) => {
    // Ensure productos is an array of IDs (strings)
    const normalizedPv: PuntosVenta = {
      ...pv,
      productos: Array.isArray(pv.productos) 
        ? (pv.productos.map((p: any) => 
            typeof p === 'object' && p !== null && p._id 
              ? p._id 
              : p
          ).filter((id: any) => id && id !== '') as string[])
        : [],
      cliente: typeof pv.cliente === 'object' && pv.cliente !== null && pv.cliente._id
        ? pv.cliente._id 
        : (typeof pv.cliente === 'string' ? pv.cliente : ''),
      city: typeof pv.city === 'object' && pv.city !== null && pv.city._id
        ? pv.city._id 
        : (typeof pv.city === 'string' ? pv.city : ''),
    };
    setPvFormData(normalizedPv);
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

  const handlePvDelete = async (id: string) => {
    try {
      const result = await confirmationAlert();
      if (result.isConfirmed) {
        await remove<City>(`/puntoVentas/${id}`);
        fetchPuntosVenta();
      }
    } catch (error) {
      console.error("Error deleting PuntoVenta:", error);
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

const handlePvChange = (e: any) => {
  const { name, value } = e.target;
  setPvFormData((prevData) => ({
    ...prevData,
    [name]: name === "productos" 
      ? (Array.isArray(value) ? value : (typeof value === "string" ? value.split(",") : []))
      : value
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

  const handlePvSubmit = async () => {
    setLoading(true);
    try {
      // Normalize data before sending: extract IDs from objects
      const normalizedData = {
        name: pvFormData.name,
        cliente: typeof pvFormData.cliente === 'object' && pvFormData.cliente !== null 
          ? pvFormData.cliente._id 
          : pvFormData.cliente,
        city: typeof pvFormData.city === 'object' && pvFormData.city !== null 
          ? pvFormData.city._id 
          : pvFormData.city,
        productos: Array.isArray(pvFormData.productos) 
          ? pvFormData.productos.map((p: any) => 
              typeof p === 'object' && p !== null && p._id 
                ? p._id 
                : p
            ).filter((id: any) => id && id !== '') // Filter out empty strings
          : [],
      };

      if (pvFormData._id) {
        await patch<City>(`/puntoVentas/${pvFormData._id}`, normalizedData);
      } else {
        await post<City>(`/puntoVentas`, normalizedData);
      }
      handleClosePvModal();
      fetchPuntosVenta();
    } catch (error) {
      console.error("Error submitting punto de venta:", error);
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

  const handleProductEdit = (product: Product) => {
    const prod = product as Product & { _id?: string };
    setProductFormData({
      _id: prod._id ?? prod.id,
      name: prod.name,
      cliente: typeof prod.cliente === 'object' && prod.cliente !== null && prod.cliente._id
        ? prod.cliente._id
        : (typeof prod.cliente === 'string' ? prod.cliente : ''),
      city: prod.city ?? '',
      state: prod.state ?? '',
      product_type: prod.product_type ?? 'Osmosis',
    });
    setProductModalOpen(true);
  };

  const handleProductChange = (e: any) => {
    const { name, value } = e.target;
    if (name === 'city' && value) {
      const c = cities.find((city) => city._id === value);
      if (c) {
        setProductFormData((prev) => ({ ...prev, city: c.city ?? '', state: c.state ?? '' }));
        return;
      }
    }
    setProductFormData((prev) => ({ ...prev, [name]: value }));
  };

  const productFormCityId = cities.find((c) => c.city === productFormData.city && c.state === productFormData.state)?._id ?? '';

  const handleProductSubmit = async () => {
    if (!productFormData._id) return;
    setLoading(true);
    try {
      await patch<Product>(`/products/${productFormData._id}`, {
        cliente: productFormData.cliente,
        city: productFormData.city,
        state: productFormData.state,
        product_type: productFormData.product_type,
      });
      handleCloseProductModal();
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseProductModal = () => {
    setProductModalOpen(false);
    setProductFormData({ cliente: '', city: '', state: '', product_type: 'Osmosis' });
  };

  const productSearchLower = productSearchText.trim().toLowerCase();
  const filteredProducts = productSearchLower
    ? products.filter((p) => {
        const prod = p as Product & { _id?: string };
        const name = (prod.name ?? '').toLowerCase();
        const clientName = (typeof prod.cliente === 'object' && prod.cliente !== null ? prod.cliente.name : '').toLowerCase();
        const city = (prod.city ?? '').toLowerCase();
        const productType = (prod.product_type ?? '').toLowerCase();
        return [name, clientName, city, productType].some((s) => s.includes(productSearchLower));
      })
    : products;

  const handleSelectAllProducts = (checked: boolean) => {
    if (checked) {
      const ids = new Set(filteredProducts.map((p) => (p as Product & { _id?: string })._id ?? (p as Product).id));
      setSelectedProductIds(ids);
    } else {
      setSelectedProductIds(new Set());
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(productId);
      else next.delete(productId);
      return next;
    });
  };

  const handleOpenBulkProductModal = () => {
    setBulkProductFormData({ cliente: '', city: '', state: '', product_type: '' });
    setBulkProductModalOpen(true);
  };

  const handleCloseBulkProductModal = () => {
    setBulkProductModalOpen(false);
    setBulkProductFormData({ cliente: '', city: '', state: '', product_type: '' });
  };

  const handleBulkProductChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    if (name === 'city') {
      if (value) {
        const c = cities.find((city) => city._id === value);
        if (c) {
          setBulkProductFormData((prev) => ({ ...prev, city: c.city ?? '', state: c.state ?? '' }));
          return;
        }
      } else {
        setBulkProductFormData((prev) => ({ ...prev, city: '', state: '' }));
        return;
      }
    }
    setBulkProductFormData((prev) => ({ ...prev, [name]: value }));
  };

  const bulkProductCityId = cities.find((c) => c.city === bulkProductFormData.city && c.state === bulkProductFormData.state)?._id ?? '';

  const handleBulkProductSubmit = async () => {
    const payload: { cliente?: string; city?: string; state?: string; product_type?: string } = {};
    if (bulkProductFormData.cliente) payload.cliente = bulkProductFormData.cliente;
    if (bulkProductFormData.city) payload.city = bulkProductFormData.city;
    if (bulkProductFormData.state) payload.state = bulkProductFormData.state;
    if (bulkProductFormData.product_type) payload.product_type = bulkProductFormData.product_type;
    if (Object.keys(payload).length === 0) return;
    setLoading(true);
    try {
      await Promise.all(
        Array.from(selectedProductIds).map((id) => patch<Product>(`/products/${id}`, payload))
      );
      handleCloseBulkProductModal();
      setSelectedProductIds(new Set());
      fetchProducts();
    } catch (error) {
      console.error('Error bulk updating products:', error);
    } finally {
      setLoading(false);
    }
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
          <CustomTab label="PuntosVenta" />
          <CustomTab label="Clientes" />
          <CustomTab label="Ciudades" />
          <CustomTab label="Equipos" />
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
                <Paper elevation={3}>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f4f6f8' }}>
                          <StyledTableCellHeader>Cliente</StyledTableCellHeader>
                          <StyledTableCellHeader>Tipo de Producto</StyledTableCellHeader>
                          <StyledTableCellHeader>Rango TDS</StyledTableCellHeader>
                          <StyledTableCellHeader>Volumen de Producción</StyledTableCellHeader>
                          <StyledTableCellHeader>Temperatura</StyledTableCellHeader>
                          <StyledTableCellHeader>Acciones</StyledTableCellHeader>
                        </TableRow>
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
                  </Box>
                </Paper>
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
                          <StyledTableRow key={pv._id}>
                            <StyledTableCell>{pv.client_name}</StyledTableCell>
                            <StyledTableCell>{pv.name}</StyledTableCell>
                            <StyledTableCell>{pv.city_name}</StyledTableCell>
                            <StyledTableCell>{pv.productos.length}</StyledTableCell>
                            <StyledTableCell>
                              <IconButton onClick={() => handlePvEdit(pv)} sx={{ mr: 1, color: 'primary.main' }}>
                                <SvgColor src='./assets/icons/actions/edit.svg' />
                              </IconButton>
                              <IconButton onClick={() => handlePvDelete(pv._id!)} sx={{ mr: 1, color: 'danger.main' }}>
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
                          <StyledTableRow key={client._id}>
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
                  </Box>
                </Paper>
              </StyledTableContainer>
            </Grid>
          </Grid>
        )}

        {tabIndex === 4 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ overflowX: 'auto' }}>
                <Grid container alignItems="center" spacing={2} sx={{ p: 2 }}>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Buscar por nombre, cliente, ciudad o tipo..."
                      value={productSearchText}
                      onChange={(e) => setProductSearchText(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      {filteredProducts.length} equipo(s)
                      {selectedProductIds.size > 0 && ` · ${selectedProductIds.size} seleccionado(s)`}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3} textAlign="right">
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleOpenBulkProductModal}
                      disabled={selectedProductIds.size === 0}
                    >
                      Actualizar seleccionados
                    </Button>
                  </Grid>
                </Grid>
              </Box>
              <StyledTableContainer>
                <Paper elevation={3}>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f4f6f8' }}>
                          <StyledTableCellHeader padding="checkbox">
                            <Checkbox
                              indeterminate={selectedProductIds.size > 0 && selectedProductIds.size < filteredProducts.length}
                              checked={filteredProducts.length > 0 && selectedProductIds.size === filteredProducts.length}
                              onChange={(e) => handleSelectAllProducts(e.target.checked)}
                            />
                          </StyledTableCellHeader>
                          <StyledTableCellHeader>Nombre</StyledTableCellHeader>
                          <StyledTableCellHeader>Cliente</StyledTableCellHeader>
                          <StyledTableCellHeader>Ciudad</StyledTableCellHeader>
                          <StyledTableCellHeader>Tipo de producto</StyledTableCellHeader>
                          <StyledTableCellHeader>Acciones</StyledTableCellHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredProducts.map((product) => {
                          const prod = product as Product & { _id?: string };
                          const productId = prod._id ?? prod.id;
                          const clientName = typeof prod.cliente === 'object' && prod.cliente !== null ? prod.cliente.name : '-';
                          const isSelected = selectedProductIds.has(productId);
                          return (
                            <StyledTableRow key={productId}>
                              <StyledTableCell padding="checkbox">
                                <Checkbox
                                  checked={isSelected}
                                  onChange={(e) => handleSelectProduct(productId, e.target.checked)}
                                />
                              </StyledTableCell>
                              <StyledTableCell>{prod.name}</StyledTableCell>
                              <StyledTableCell>{clientName}</StyledTableCell>
                              <StyledTableCell>{prod.city ?? '-'}</StyledTableCell>
                              <StyledTableCell>{prod.product_type ?? '-'}</StyledTableCell>
                              <StyledTableCell>
                                <IconButton onClick={() => handleProductEdit(prod)} sx={{ mr: 1, color: 'primary.main' }}>
                                  <SvgColor src='./assets/icons/actions/edit.svg' />
                                </IconButton>
                              </StyledTableCell>
                            </StyledTableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Box>
                </Paper>
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
        <Dialog open={pvModalOpen} onClose={handleClosePvModal} fullWidth maxWidth="sm">
          <DialogTitle>
            {pvFormData._id ? "Editar Punto de Venta" : "Nuevo Punto de Venta"}
          </DialogTitle>

          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              {/* Nombre */}
              <TextField
                label="Nombre"
                name="name"
                value={pvFormData.name || ""}
                onChange={handlePvChange}
                fullWidth
              />

              {/* Productos */}
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

              {/* Ciudad */}
              <FormControl fullWidth>
                <InputLabel>Ciudad</InputLabel>
                <Select
                  value={pvFormData.city || ""}
                  name="city"
                  onChange={handlePvChange}
                >
                  {cities.map((c) => (
                    <MenuItem key={c._id} value={c._id}>
                      {c.city || c._id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Cliente */}
              <FormControl fullWidth>
                <InputLabel>Cliente</InputLabel>
                <Select
                  value={pvFormData.cliente || ""}
                  name="cliente"
                  onChange={handlePvChange}
                >
                  {clients.map((cli) => (
                    <MenuItem key={cli._id} value={cli._id}>
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
              {loading ? <CircularProgress size={24} /> : pvFormData._id ? "Actualizar" : "Guardar"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={productModalOpen} onClose={handleCloseProductModal} fullWidth maxWidth="sm">
          <DialogTitle>Editar equipo (producto)</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              {productFormData.name && (
                <TextField label="Nombre" value={productFormData.name} fullWidth disabled />
              )}
              <FormControl fullWidth>
                <InputLabel>Cliente</InputLabel>
                <Select
                  value={productFormData.cliente || ''}
                  name="cliente"
                  onChange={handleProductChange}
                  fullWidth
                >
                  {clients.map((cli) => (
                    <MenuItem key={cli._id} value={cli._id}>
                      {cli.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Ciudad</InputLabel>
                <Select
                  value={productFormCityId}
                  name="city"
                  onChange={handleProductChange}
                  fullWidth
                >
                  {cities.map((c) => (
                    <MenuItem key={c._id} value={c._id}>
                      {c.city} ({c.state})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Tipo de producto</InputLabel>
                <Select
                  value={productFormData.product_type || 'Osmosis'}
                  name="product_type"
                  onChange={handleProductChange}
                  fullWidth
                >
                  {ProductTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseProductModal} color="secondary">
              Cancelar
            </Button>
            <Button
              onClick={handleProductSubmit}
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Actualizar'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={bulkProductModalOpen} onClose={handleCloseBulkProductModal} fullWidth maxWidth="sm">
          <DialogTitle>Actualizar varios equipos</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Se aplicarán los valores que completes a {selectedProductIds.size} producto(s). Deja en blanco lo que no quieras cambiar.
            </Typography>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <FormControl fullWidth>
                <InputLabel>Cliente</InputLabel>
                <Select
                  value={bulkProductFormData.cliente || ''}
                  name="cliente"
                  onChange={handleBulkProductChange}
                  fullWidth
                >
                  <MenuItem value="">(sin cambiar)</MenuItem>
                  {clients.map((cli) => (
                    <MenuItem key={cli._id} value={cli._id}>
                      {cli.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Ciudad</InputLabel>
                <Select
                  value={bulkProductCityId}
                  name="city"
                  onChange={handleBulkProductChange}
                  fullWidth
                >
                  <MenuItem value="">(sin cambiar)</MenuItem>
                  {cities.map((c) => (
                    <MenuItem key={c._id} value={c._id}>
                      {c.city} ({c.state})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Tipo de producto</InputLabel>
                <Select
                  value={bulkProductFormData.product_type || ''}
                  name="product_type"
                  onChange={handleBulkProductChange}
                  fullWidth
                >
                  <MenuItem value="">(sin cambiar)</MenuItem>
                  {ProductTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseBulkProductModal} color="secondary">
              Cancelar
            </Button>
            <Button
              onClick={handleBulkProductSubmit}
              variant="contained"
              color="primary"
              disabled={loading || (!bulkProductFormData.cliente && !bulkProductFormData.city && !bulkProductFormData.product_type)}
            >
              {loading ? <CircularProgress size={24} /> : `Aplicar a ${selectedProductIds.size}`}
            </Button>
          </DialogActions>
        </Dialog>

      </Grid>
      </Box>
    </>
  );
}

export default CustomizationPage;

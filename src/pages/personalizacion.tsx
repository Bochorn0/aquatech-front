import type { SelectChangeEvent } from "@mui/material/Select";

import Swal from "sweetalert2";
import { Helmet } from "react-helmet-async";
import { useMemo, useState, useEffect } from "react";

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
import { get as getV2 } from "src/api/axiosHelperV2";
import { get, post, patch, remove } from "src/api/axiosHelper";

import { SvgColor } from 'src/components/svg-color';

import type { City, User, Metric, Product, Cliente, PuntosVenta } from './types';

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
  // Check if user is admin
  const isAdmin = useMemo(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return false;
      const user: User = JSON.parse(userStr);
      return user.role?.name?.toLowerCase() === 'admin';
    } catch {
      return false;
    }
  }, []);

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
    let list: Cliente[] = [];
    try {
      const response = await get<Cliente[]>(`/clients`);
      list = Array.isArray(response) ? response : [];
    } catch (err) {
      console.error("Error fetching clients (v1):", err);
      try {
        const v2Response = await getV2<Cliente[]>(`/clients`);
        list = Array.isArray(v2Response) ? v2Response : [];
      } catch (v2Err) {
        console.error("Error fetching clients (v2 fallback):", v2Err);
      }
    }
    let filteredClients = list.filter((client) => client?.name !== 'All');
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const client_ = JSON.parse(user).cliente as Cliente;
        if (client_?.name && client_.name !== 'All') {
          filteredClients = filteredClients.filter(
            (client) => client?.name && client.name.toLowerCase() === client_.name.toLowerCase()
          );
        }
      } catch {
        // ignore invalid user
      }
    }
    setClients(filteredClients);
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
    const list = Array.isArray(response) ? response : [];

    const formatted = list.map((pv) => {
      const clienteObj = typeof pv.cliente === 'object' && pv.cliente !== null ? pv.cliente as any : null;
      const cityObj = typeof pv.city === 'object' && pv.city !== null ? pv.city as any : null;
      const clienteId = clienteObj ? (clienteObj._id ?? clienteObj.id) : (pv as any).clientId ?? pv.cliente;
      const cityId = cityObj ? (cityObj._id ?? cityObj.id) : pv.city;
      const productIds = Array.isArray(pv.productos)
        ? (pv.productos as any[]).map((p) => (typeof p === 'object' && p != null ? (p._id ?? p.id) : p))
        : [];
      return {
        ...pv,
        cliente: clienteId ?? '',
        client_name: clienteObj?.name ?? '',
        city: cityId ?? '',
        city_name: cityObj?.city ?? '',
        productos: productIds,
      };
    });

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
    const clientIdStr =
      typeof pv.cliente === 'object' && pv.cliente !== null
        ? (pv.cliente as any)._id ?? (pv.cliente as any).id ?? ''
        : typeof pv.cliente === 'string'
          ? pv.cliente
          : (pv as any).clientId ?? '';
    const cityIdStr =
      typeof pv.city === 'object' && pv.city !== null
        ? (pv.city as any)._id ?? (pv.city as any).id ?? ''
        : typeof pv.city === 'string'
          ? pv.city
          : '';
    const productIds: string[] = Array.isArray(pv.productos)
      ? (pv.productos
          .map((p: any) => {
            if (typeof p === 'object' && p !== null) return (p as any)._id ?? (p as any).id ?? '';
            return typeof p === 'string' || typeof p === 'number' ? String(p) : '';
          })
          .filter((id) => id !== '') as string[])
      : [];
    const normalizedPv: PuntosVenta = {
      ...pv,
      cliente: clientIdStr,
      city: cityIdStr,
      productos: productIds,
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
      ? (Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [])
      : value,
  }));
};

/** Dedicated handler so multi-select value is always set (MUI can pass value in event.target.value). */
const handlePvProductosChange = (e: any) => {
  const value = e?.target?.value;
  const next = Array.isArray(value) ? value : value != null && value !== "" ? [value] : [];
  setPvFormData((prev) => ({ ...prev, productos: next }));
};


  
  const handleClientSubmit = async () => {
    setLoading(true);
    try {
      const clientId = clientFormData._id ?? clientFormData.id;
      if (clientId) {
        await patch<Cliente>(`/clients/${clientId}`, clientFormData);
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
    const state = (cityFormData.state ?? "").toString().trim();
    const city = (cityFormData.city ?? "").toString().trim();
    if (!state || !city) {
      Swal.fire("Campos requeridos", "Estado y ciudad son obligatorios.", "warning");
      return;
    }
    setLoading(true);
    try {
      if (cityFormData._id) {
        await patch<City>(`/cities/${cityFormData._id}`, { ...cityFormData, state, city });
      } else {
        await post<City>(`/cities`, { ...cityFormData, state, city, lat: cityFormData.lat, lon: cityFormData.lon });
      }
      handleCloseCityModal();
      fetchCities();
    } catch (error) {
      console.error("Error submitting city:", error);
      Swal.fire("Error", (error as any)?.response?.data?.message ?? "Error al guardar ciudad", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePvSubmit = async () => {
    setLoading(true);
    try {
      const clienteId =
        typeof pvFormData.cliente === 'object' && pvFormData.cliente !== null
          ? (pvFormData.cliente as any)._id ?? (pvFormData.cliente as any).id
          : pvFormData.cliente;
      const cityId =
        typeof pvFormData.city === 'object' && pvFormData.city !== null
          ? (pvFormData.city as any)._id ?? (pvFormData.city as any).id
          : pvFormData.city;
      const productIds = Array.isArray(pvFormData.productos)
        ? pvFormData.productos
            .map((p: any) => (typeof p === 'object' && p != null ? (p as any)._id ?? (p as any).id : String(p)))
            .filter((id) => id !== '')
        : [];
      const normalizedData = {
        name: pvFormData.name,
        cliente: clienteId ?? '',
        city: cityId ?? '',
        productos: productIds,
      };

      const pvId = (pvFormData as any)._id ?? (pvFormData as any).id;
      if (pvId) {
        await patch<City>(`/puntoVentas/${pvId}`, normalizedData);
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
    const name = (productFormData.name ?? '').toString().trim();
    if (!name && !productFormData._id) {
      Swal.fire("Campo requerido", "El nombre del producto es obligatorio.", "warning");
      return;
    }
    setLoading(true);
    try {
      if (productFormData._id) {
        await patch<Product>(`/products/${productFormData._id}`, {
          cliente: productFormData.cliente,
          city: productFormData.city,
          state: productFormData.state,
          product_type: productFormData.product_type,
        });
      } else {
        await post<Product>(`/products`, {
          name: name || 'Sin nombre',
          cliente: productFormData.cliente || '',
          city: productFormData.city || '',
          state: productFormData.state || '',
          product_type: productFormData.product_type || 'Osmosis',
        });
      }
      handleCloseProductModal();
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      Swal.fire("Error", (error as any)?.response?.data?.message ?? "Error al guardar producto", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseProductModal = () => {
    setProductModalOpen(false);
    setProductFormData({ _id: undefined, name: '', cliente: '', city: '', state: '', product_type: 'Osmosis' });
  };

  const handleOpenNewProductModal = () => {
    setProductFormData({ _id: undefined, name: '', cliente: '', city: '', state: '', product_type: 'Osmosis' });
    setProductModalOpen(true);
  };

  const handleProductDelete = async (product: Product & { _id?: string }) => {
    const productId = product._id ?? product.id;
    if (!productId) return;
    try {
      const result = await confirmationAlert();
      if (result.isConfirmed) {
        await remove<Product>(`/products/${productId}`);
        fetchProducts();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
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

  /** Toggle Tuya logs routine for a product (admin only). Used in Productos rutina logs tab. */
  const handleTuyaLogsRoutineToggle = async (product: Product & { _id?: string }, enabled: boolean) => {
    const productId = product._id ?? product.id;
    if (!productId) return;
    setLoading(true);
    try {
      await patch<Product>(`/products/${productId}`, { tuya_logs_routine_enabled: enabled });
      setProducts((prev) =>
        prev.map((p) => {
          const pid = (p as Product & { _id?: string })._id ?? p.id;
          if (pid === productId) return { ...p, tuya_logs_routine_enabled: enabled };
          return p;
        })
      );
    } catch (error) {
      console.error('Error updating Tuya logs routine:', error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar la configuración.' });
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
          {isAdmin && <CustomTab label="Clientes" />}
          {isAdmin && <CustomTab label="Ciudades" />}
          <CustomTab label="Equipos" />
          {isAdmin && <CustomTab label="Productos rutina logs" />}
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
                              {isAdmin && (
                                <IconButton onClick={() => handlePvDelete(pv._id!)} sx={{ mr: 1, color: 'danger.main' }}>
                                  <SvgColor src='./assets/icons/actions/delete.svg' />
                                </IconButton>
                              )}
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

        {isAdmin && tabIndex === 2 && (
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
                          <StyledTableRow key={client._id ?? client.id ?? ''}>
                            <StyledTableCell>{client.name}</StyledTableCell>
                            <StyledTableCell>{client.email}</StyledTableCell>
                            <StyledTableCell>{client.phone}</StyledTableCell>
                            <StyledTableCell>
                              <IconButton sx={{ mr: 1, color: 'primary.main' }} onClick={() => handleClientEdit(client)}>
                                <SvgColor src='./assets/icons/actions/edit.svg' />
                              </IconButton>
                              <IconButton sx={{ mr: 1, color: 'danger.main' }} onClick={() => handleClientDelete((client._id ?? client.id) ?? '')}>
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
        {isAdmin && tabIndex === 3 && (
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
                  <Grid item xs={12} sm={3} textAlign="right" sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <Button variant="contained" color="primary" onClick={handleOpenNewProductModal}>
                      Nuevo producto
                    </Button>
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
                                {isAdmin && (
                                  <IconButton onClick={() => handleProductDelete(prod)} sx={{ color: 'danger.main' }} title="Eliminar equipo">
                                    <SvgColor src='./assets/icons/actions/delete.svg' />
                                  </IconButton>
                                )}
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

        {isAdmin && tabIndex === 5 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                Productos incluidos en la rutina que obtiene logs de Tuya en lotes (cron). Solo los equipos activados aquí se procesan.
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Grid container alignItems="center" spacing={2} sx={{ p: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Buscar por nombre, cliente, ciudad o tipo..."
                      value={productSearchText}
                      onChange={(e) => setProductSearchText(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      {filteredProducts.length} equipo(s) · {filteredProducts.filter((p) => (p as Product & { tuya_logs_routine_enabled?: boolean }).tuya_logs_routine_enabled).length} con rutina de logs activa
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
                          <StyledTableCellHeader>Cliente</StyledTableCellHeader>
                          <StyledTableCellHeader>Ciudad</StyledTableCellHeader>
                          <StyledTableCellHeader>Tipo</StyledTableCellHeader>
                          <StyledTableCellHeader>Rutina logs Tuya</StyledTableCellHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredProducts.map((product) => {
                          const prod = product as Product & { _id?: string; tuya_logs_routine_enabled?: boolean };
                          const productId = prod._id ?? prod.id;
                          const clientName = typeof prod.cliente === 'object' && prod.cliente !== null ? prod.cliente.name : '-';
                          const enabled = Boolean(prod.tuya_logs_routine_enabled);
                          return (
                            <StyledTableRow key={productId}>
                              <StyledTableCell>{prod.name}</StyledTableCell>
                              <StyledTableCell>{clientName}</StyledTableCell>
                              <StyledTableCell>{prod.city ?? '-'}</StyledTableCell>
                              <StyledTableCell>{prod.product_type ?? '-'}</StyledTableCell>
                              <StyledTableCell>
                                <Switch
                                  checked={enabled}
                                  onChange={(e) => handleTuyaLogsRoutineToggle(prod, e.target.checked)}
                                  disabled={loading}
                                  color="primary"
                                />
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
                <InputLabel shrink>Cliente</InputLabel>
                <Select value={formData.cliente} name="cliente" onChange={handleChange} fullWidth>
                  {clients.map((cliente) => (
                    <MenuItem key={cliente._id ?? cliente.id ?? ''} value={cliente._id ?? cliente.id ?? ''}>{cliente.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel shrink>Tipo de Producto</InputLabel>
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
          <DialogTitle>{(clientFormData._id ?? clientFormData.id) ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <TextField label="Nombre" name="name" value={clientFormData.name} onChange={handleClientChange} fullWidth />
              <TextField label="Email" name="email" value={clientFormData.email} onChange={handleClientChange} fullWidth />
              <TextField label="Teléfono" name="phone" value={clientFormData.phone} onChange={handleClientChange} fullWidth />
              {/* Address Fields */}
              <TextField label="Dirección" name="address.street" value={clientFormData.address.street} onChange={handleClientChange} fullWidth />
              <TextField label="Ciudad" name="address.city" value={clientFormData.address.city} onChange={handleClientChange} fullWidth />
              <FormControl fullWidth>
                <InputLabel shrink>Estado</InputLabel>
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
              {loading ? <CircularProgress size={24} /> : (clientFormData._id ?? clientFormData.id) ? "Actualizar" : "Guardar"}
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog open={cityModalOpen} onClose={handleCloseCityModal} fullWidth maxWidth="sm">
          <DialogTitle>{cityFormData._id ? "Editar Ciudad" : "Nueva Ciudad"}</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <FormControl fullWidth>
                <InputLabel shrink>Estado</InputLabel>
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
            {(pvFormData as any)._id ?? (pvFormData as any).id ? "Editar Punto de Venta" : "Nuevo Punto de Venta"}
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
                <InputLabel shrink>Productos</InputLabel>
                <Select
                  multiple
                  name="productos"
                  value={Array.isArray(pvFormData.productos) ? pvFormData.productos.map((id) => String(id)) : []}
                  onChange={handlePvProductosChange}
                  renderValue={(selected) =>
                    products
                      .filter((p) => selected.includes(String((p as any)._id ?? (p as any).id ?? '')))
                      .map((p) => p.name)
                      .join(", ")
                  }
                >
                  {products.map((prod) => {
                    const prodId = (prod as any)._id ?? (prod as any).id ?? '';
                    return (
                      <MenuItem key={prodId} value={prodId}>
                        <Checkbox checked={(pvFormData.productos || []).map(String).includes(String(prodId))} />
                        <ListItemText primary={prod.name} />
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              {/* Ciudad */}
              <FormControl fullWidth>
                <InputLabel shrink>Ciudad</InputLabel>
                <Select
                  value={pvFormData.city != null && pvFormData.city !== '' ? String(pvFormData.city) : ''}
                  name="city"
                  onChange={handlePvChange}
                >
                  {cities.map((c) => {
                    const cId = (c as any)._id ?? (c as any).id ?? '';
                    return (
                      <MenuItem key={cId} value={cId}>
                        {(c as any).city || cId}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              {/* Cliente */}
              <FormControl fullWidth>
                <InputLabel shrink>Cliente</InputLabel>
                <Select
                  value={pvFormData.cliente != null && pvFormData.cliente !== '' ? String(pvFormData.cliente) : ''}
                  name="cliente"
                  onChange={handlePvChange}
                >
                  {clients.map((cli) => (
                    <MenuItem key={cli._id ?? cli.id ?? ''} value={cli._id ?? cli.id ?? ''}>
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
              {loading ? <CircularProgress size={24} /> : ((pvFormData as any)._id ?? (pvFormData as any).id) ? "Actualizar" : "Guardar"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={productModalOpen} onClose={handleCloseProductModal} fullWidth maxWidth="sm">
          <DialogTitle>{productFormData._id ? "Editar equipo (producto)" : "Nuevo producto"}</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <TextField
                label="Nombre"
                name="name"
                value={productFormData.name ?? ""}
                onChange={handleProductChange}
                fullWidth
                disabled={!!productFormData._id}
                required={!productFormData._id}
              />
              <FormControl fullWidth>
                <InputLabel shrink>Cliente</InputLabel>
                <Select
                  value={productFormData.cliente || ''}
                  name="cliente"
                  onChange={handleProductChange}
                  fullWidth
                >
                  {clients.map((cli) => (
                    <MenuItem key={cli._id ?? cli.id ?? ''} value={cli._id ?? cli.id ?? ''}>
                      {cli.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel shrink>Ciudad</InputLabel>
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
                <InputLabel shrink>Tipo de producto</InputLabel>
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
              {loading ? <CircularProgress size={24} /> : (productFormData._id ? 'Actualizar' : 'Guardar')}
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
                <InputLabel shrink>Cliente</InputLabel>
                <Select
                  value={bulkProductFormData.cliente || ''}
                  name="cliente"
                  onChange={handleBulkProductChange}
                  fullWidth
                >
                  <MenuItem value="">(sin cambiar)</MenuItem>
                  {clients.map((cli) => (
                    <MenuItem key={cli._id ?? cli.id ?? ''} value={cli._id ?? cli.id ?? ''}>
                      {cli.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel shrink>Ciudad</InputLabel>
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
                <InputLabel shrink>Tipo de producto</InputLabel>
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

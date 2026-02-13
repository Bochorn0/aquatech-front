import Swal from "sweetalert2";
import { Helmet } from "react-helmet-async";
import { useMemo, useState, useEffect } from "react";

import {
  Box,
  Chip,
  Grid,
  Paper,
  Table,
  Button,
  Dialog,
  Select,
  Switch,
  MenuItem,
  TableRow,
  Accordion,
  TableBody,
  TableHead,
  TextField,
  IconButton,
  InputLabel,
  Typography,
  DialogTitle,
  FormControl,
  DialogActions,
  DialogContent,
  AccordionDetails,
  AccordionSummary,
  CircularProgress,
  FormControlLabel
} from "@mui/material";

import { CustomTab, CustomTabs, StyledTableRow, StyledTableCell, StyledTableContainer, StyledTableCellHeader } from "src/utils/styles";

import { CONFIG } from "src/config-global";

import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';

import type { City, User, Metric, Cliente, MetricAlert, PuntosVenta } from './types';

// Custom Swal instance with higher z-index to appear above MUI modals (MUI Dialog z-index is 1300)
const MySwal = Swal.mixin({
  customClass: {
    container: 'swal-on-top'
  },
  didOpen: () => {
    // Set z-index higher than MUI Dialog (1300)
    const container = document.querySelector('.swal2-container') as HTMLElement;
    if (container) {
      container.style.zIndex = '9999';
    }
  }
});

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
const defaultMetric: Metric = { 
  _id: '', 
  cliente: '', 
  client_name: '', 
  punto_venta_id: '', 
  punto_venta_name: '', 
  metric_name: '',
  metric_type: '',
  sensor_type: '',
  sensor_unit: '',
  rules: [],
  conditions: undefined,
  enabled: true,
  read_only: false,
  display_order: 0
}

const defaultAlert: MetricAlert = {
  usuario: '',
  correo: '',
  celular: '',
  celularAlert: false,
  dashboardAlert: false,
  emailAlert: false,
  preventivo: false,
  correctivo: false,
  emailCooldownMinutes: 10,
  emailMaxPerDay: 5
}

// Available metric types from specification
const METRIC_TYPES = [
  { value: 'conectados', label: 'CONECTADOS', sensorTypes: ['online'], unit: '' },
  { value: 'tds', label: 'TDS', sensorTypes: ['tds'], unit: 'PPM' },
  { value: 'produccion', label: 'PRODUCCION', sensorTypes: ['flujo_produccion'], unit: 'L/MIN' },
  { value: 'rechazo', label: 'RECHAZO', sensorTypes: ['flujo_rechazo'], unit: 'L/MIN' },
  { value: 'eficiencia', label: 'EFICIENCIA', sensorTypes: ['eficiencia'], unit: '%' },
  { value: 'recuperacion', label: 'RECUPERACION', sensorTypes: ['acumulado_cruda', 'flujo_recuperacion'], unit: '%' },
  { value: 'nivel_agua_cruda', label: 'NIVEL AGUA CRUDA', sensorTypes: ['nivel_cruda', 'caudal_cruda'], unit: '%' },
  { value: 'nivel_agua_purificada', label: 'NIVEL AGUA PURIFICADA', sensorTypes: ['nivel_purificada', 'flujo_produccion'], unit: '%' },
  { value: 'co2', label: 'CO2', sensorTypes: ['presion_co2'], unit: 'PSI' },
  { value: 'amperaje_nieve', label: 'AMPERAJE MAQUINA NIEVE', sensorTypes: ['corriente_ch1', 'corriente_ch2', 'corriente_ch3', 'corriente_ch4'], unit: 'A', readOnly: true },
  { value: 'amperaje_frappe', label: 'AMPERAJE MAQUINA FRAPEE', sensorTypes: ['corriente_ch1', 'corriente_ch2', 'corriente_ch3', 'corriente_ch4'], unit: 'A', readOnly: true },
];

// Available sensor types from the system
const SENSOR_TYPES = [
  { value: 'tds', label: 'TDS', unit: 'PPM' },
  { value: 'flujo_produccion', label: 'Flujo Producción', unit: 'L/min' },
  { value: 'flujo_rechazo', label: 'Flujo Rechazo', unit: 'L/min' },
  { value: 'flujo_recuperacion', label: 'Flujo Recuperación', unit: 'L/min' },
  { value: 'eficiencia', label: 'Eficiencia', unit: '%' },
  { value: 'nivel_cruda', label: 'Nivel Cruda', unit: 'mm' },
  { value: 'nivel_purificada', label: 'Nivel Purificada', unit: 'mm' },
  { value: 'electronivel_purificada', label: 'Nivel Electrónico Purificada', unit: '%' },
  { value: 'electronivel_recuperada', label: 'Nivel Electrónico Recuperada', unit: '%' },
  { value: 'caudal_cruda', label: 'Caudal Cruda', unit: 'L/min' },
  { value: 'caudal_cruda_lmin', label: 'Caudal Cruda (L/min)', unit: 'L/min' },
  { value: 'acumulado_cruda', label: 'Acumulado Cruda', unit: 'L' },
  { value: 'presion_co2', label: 'Presión CO2', unit: 'PSI' },
  { value: 'corriente_ch1', label: 'Corriente Canal 1', unit: 'A' },
  { value: 'corriente_ch2', label: 'Corriente Canal 2', unit: 'A' },
  { value: 'corriente_ch3', label: 'Corriente Canal 3', unit: 'A' },
  { value: 'corriente_ch4', label: 'Corriente Canal 4', unit: 'A' },
  { value: 'vida', label: 'Vida', unit: 'días' },
  { value: 'online', label: 'Online', unit: '' },
];

// Severidad = tipo de nivel (normal/preventivo/crítico). El color se deriva de la severidad.
const SEVERITY_TO_COLOR: Record<'normal' | 'preventivo' | 'critico', string> = {
  normal: '#00A76F',
  preventivo: '#FFAB00',
  critico: '#FF5630',
};

const SEVERITY_OPTIONS: { value: 'normal' | 'preventivo' | 'critico'; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'preventivo', label: 'Preventivo' },
  { value: 'critico', label: 'Crítico' },
];

/** Infer severity from color for rules saved without severity (legacy). */
function inferSeverityFromColor(color: string | undefined): 'normal' | 'preventivo' | 'critico' | null {
  if (!color) return null;
  const c = color.toLowerCase().replace(/\s/g, '');
  if (c.includes('00a76f') || c.includes('00b050')) return 'normal';
  if (c.includes('ff5630') || c.includes('ee0000') || c.includes('ff0000')) return 'critico';
  if (c.includes('ffab00') || c.includes('ffff00')) return 'preventivo';
  return null;
}

interface SensorConfig {
  id?: string;
  _id?: string;
  puntoVentaId?: string;
  sensorName?: string;
  sensorType?: string;
  resourceId?: string;
  resourceType?: string;
  label?: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  enabled?: boolean;
  latestReading?: {
    value: number;
    timestamp: string;
    createdAt: string;
  };
}

const defaultPv = { _id: '', name: '' , codigo_tienda: '', client_name:'', cliente: defaultclient, city: defaultCity, city_name: '', productos: []}

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
  const [metricAlerts, setMetricAlerts] = useState<MetricAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
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
  // Sensors state for edit modal
  const [editPvSensors, setEditPvSensors] = useState<SensorConfig[]>([]);
  const [editPvId, setEditPvId] = useState<string | null>(null);
  
  // Sensors state for view modal
  const [viewSensors, setViewSensors] = useState<SensorConfig[]>([]);
  // Punto de venta selected for configuring its metrics (one row per PV in list)
  const [configurarPv, setConfigurarPv] = useState<{
    cliente: string;
    punto_venta_id: string;
    client_name: string;
    punto_venta_name: string;
  } | null>(null);
  const [viewPvId, setViewPvId] = useState<string | null>(null);
  const [sensorsModalOpen, setSensorsModalOpen] = useState(false);
  const [viewingPvName, setViewingPvName] = useState<string>('');
  
  // Dev mode state for puntoVenta
  const [devModeEnabled, setDevModeEnabled] = useState<boolean>(false);

  // Helper to ensure string type
  const toStr = (val: any): string => String(val);

  // Helper to safely format dates
  const formatDate = (timestamp: string | null | undefined, fallbackTimestamp?: string | null): string => {
    // Try primary timestamp first
    if (timestamp) {
      try {
        // Check if timestamp looks invalid (e.g., year > 10000 or weird format)
        const dateStr = String(timestamp);
        
        // Check for obviously invalid years in the string
        const yearMatch = dateStr.match(/[+-]?(\d{4,})/);
        if (yearMatch) {
          const year = parseInt(yearMatch[1], 10);
          if (year > 2100 || year < 1900) {
            // Invalid year, try fallback
            if (fallbackTimestamp) {
              return formatDate(fallbackTimestamp);
            }
            return 'Fecha inválida';
          }
        }
        
        const date = new Date(timestamp);
        
        // Check if date is valid
        if (Number.isNaN(date.getTime())) {
          if (fallbackTimestamp) {
            return formatDate(fallbackTimestamp);
          }
          return 'Fecha inválida';
        }
        
        // Check if year is reasonable (between 1900 and 2100)
        const year = date.getFullYear();
        if (year < 1900 || year > 2100) {
          if (fallbackTimestamp) {
            return formatDate(fallbackTimestamp);
          }
          return 'Fecha inválida';
        }
        
        return date.toLocaleString('es-MX', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      } catch (error) {
        console.warn('[formatDate] Error parsing timestamp:', timestamp, error);
        if (fallbackTimestamp) {
          return formatDate(fallbackTimestamp);
        }
        return 'Fecha inválida';
      }
    }
    
    // Try fallback if primary is missing
    if (fallbackTimestamp) {
      return formatDate(fallbackTimestamp);
    }
    
    return '-';
  };

  useEffect(() => {
    fetchMetrics();
    fetchClients();
    fetchCities();
    fetchPuntosVenta();
  }, []);

  // Debug: Monitor sensors state changes
  useEffect(() => {
    console.log('[useEffect] Edit sensors state changed:', editPvSensors);
    console.log('[useEffect] Edit pvId:', editPvId);
    console.log('[useEffect] View sensors state changed:', viewSensors);
    console.log('[useEffect] View pvId:', viewPvId);
  }, [editPvSensors, editPvId, viewSensors, viewPvId]);

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
      // Deduplicate clients by id - more robust comparison
      const seen = new Set<string | number>();
      const uniqueClients = filteredClients.filter((client: Cliente) => {
        const clientId = client._id || client.id;
        if (!clientId) return false; // Skip entries without ID
        const idStr = String(clientId);
        if (seen.has(idStr)) {
          return false; // Duplicate
        }
        seen.add(idStr);
        return true;
      });
      console.log('[fetchClients] Total clients:', filteredClients.length, 'Unique:', uniqueClients.length);
      setClients(uniqueClients);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchSensorsForEdit = async (pvId: string) => {
    try {
      console.log('[fetchSensorsForEdit] Fetching sensors for pvId:', pvId);
      const response = await apiV2Call(`/puntoVentas/${pvId}/sensors`);
      console.log('[fetchSensorsForEdit] Response received:', response);
      console.log('[fetchSensorsForEdit] Is array?', Array.isArray(response));
      const sensorsData = Array.isArray(response) ? response : (response?.data || response?.sensors || []);
      console.log('[fetchSensorsForEdit] Setting edit sensors:', sensorsData);
      setEditPvSensors(sensorsData);
    } catch (error) {
      console.error("Error fetching sensors for edit:", error);
      setEditPvSensors([]);
    }
  };

  const fetchSensorsForView = async (pvId: string) => {
    try {
      console.log('[fetchSensorsForView] Fetching sensors for pvId:', pvId);
      const response = await apiV2Call(`/puntoVentas/${pvId}/sensors`);
      console.log('[fetchSensorsForView] Response received:', response);
      console.log('[fetchSensorsForView] Is array?', Array.isArray(response));
      const sensorsData = Array.isArray(response) ? response : (response?.data || response?.sensors || []);
      console.log('[fetchSensorsForView] Setting view sensors:', sensorsData);
      setViewSensors(sensorsData);
    } catch (error) {
      console.error("Error fetching sensors for view:", error);
      setViewSensors([]);
    }
  };

  const fetchCities = async () => {
    try {
      const response = await apiV2Call('/cities');
      const citiesData = Array.isArray(response) ? response : [];
      // Deduplicate cities by id - more robust comparison
      const seen = new Set<string | number>();
      const uniqueCities = citiesData.filter((city: City) => {
        const cityId = city._id || city.id;
        if (!cityId) return false; // Skip entries without ID
        const idStr = String(cityId);
        if (seen.has(idStr)) {
          return false; // Duplicate
        }
        seen.add(idStr);
        return true;
      });
      console.log('[fetchCities] Total cities:', citiesData.length, 'Unique:', uniqueCities.length);
      setCities(uniqueCities);
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
        codigo_tienda: pv.codigo_tienda || pv.code || '',
        cliente: pv.cliente?._id || pv.cliente || pv.clientId || '',
        client_name: pv.cliente?.name || '',
        city: pv.city?._id || pv.city || '',
        city_name: pv.city?.city || '',
        productos: [] // Products removed - using sensors instead
      }));

      setPuntosVenta(formatted as unknown as PuntosVenta[]);
    } catch (error) {
      console.error("Error fetching puntos de venta:", error);
    }
  };

  /** Group metrics by punto de venta so the list shows one row per PV */
  const metricsByPuntoVenta = useMemo(() => {
    const byKey = new Map<string, { client_name: string; punto_venta_name: string; cliente: string; punto_venta_id: string; metrics: Metric[] }>();
    metrics.forEach((m) => {
      const pvId = m.punto_venta_id ?? '';
      const key = `${m.cliente ?? m.clientId ?? ''}|${pvId}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          client_name: m.client_name ?? '',
          punto_venta_name: m.punto_venta_name ?? (pvId ? 'Punto de venta' : 'Todos'),
          cliente: String(m.cliente ?? m.clientId ?? ''),
          punto_venta_id: pvId,
          metrics: []
        });
      }
      byKey.get(key)!.metrics.push(m);
    });
    return Array.from(byKey.values());
  }, [metrics]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    
    // If cliente changes, filter puntosVenta and clear punto_venta_id if it doesn't belong to new cliente
    if (name === 'cliente') {
      const selectedClienteId = value;
      
      // Check if current punto_venta_id belongs to the new cliente
      const currentPvId = formData.punto_venta_id;
      const currentPv = puntosVenta.find(pv => String(pv._id || pv.id) === String(currentPvId));
      const shouldClearPv = selectedClienteId && currentPv && (
        typeof currentPv.cliente === 'object' && currentPv.cliente !== null
          ? String((currentPv.cliente as any)._id || (currentPv.cliente as any).id) !== String(selectedClienteId)
          : String(currentPv.cliente) !== String(selectedClienteId)
      );
      
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
        punto_venta_id: shouldClearPv ? '' : prevData.punto_venta_id,
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  /** Build payload for a single metric only (no _id/id on create; never send full metrics list). Always send full content including rules. */
  const buildMetricPayload = (): Record<string, unknown> => {
    const cliente = formData.cliente || formData.clientId || undefined;
    const punto_venta_id = formData.punto_venta_id || undefined;
    const metric_name = formData.metric_name || undefined;
    const metric_type = formData.metric_type || undefined;
    const sensor_type = formData.sensor_type || undefined;
    const sensor_unit = formData.sensor_unit || undefined;
    const rawRules = Array.isArray(formData.rules) ? formData.rules : (formData.rules != null ? [formData.rules] : []);
    const rules = rawRules.map((r: any) => ({
      ...r,
      severity: r.severity ?? inferSeverityFromColor(r.color) ?? 'normal',
      color: r.color ?? SEVERITY_TO_COLOR[(r.severity ?? inferSeverityFromColor(r.color) ?? 'normal') as keyof typeof SEVERITY_TO_COLOR]
    }));
    const conditions = formData.conditions ?? null;
    const enabled = formData.enabled !== false;
    const read_only = formData.read_only === true;
    const display_order = Number(formData.display_order) || 0;

    const payload: Record<string, unknown> = {
      ...(cliente ? { cliente } : {}),
      ...(punto_venta_id ? { punto_venta_id } : {}),
      ...(metric_name ? { metric_name } : {}),
      ...(metric_type ? { metric_type } : {}),
      ...(sensor_type ? { sensor_type } : {}),
      ...(sensor_unit ? { sensor_unit } : {}),
      rules,
      ...(conditions != null ? { conditions } : {}),
      enabled,
      read_only,
      display_order
    };
    return payload;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let savedMetricId = editingId;
      const payload = buildMetricPayload();
      const wasMetricCreate = !editingId;

      // Save or update metric (only this metric's data; never overwrite other metrics)
      if (editingId) {
        const updated = await apiV2Call(`/metrics/${editingId}`, 'PATCH', payload);
        savedMetricId = updated.id || updated._id || editingId;
      } else {
        const created = await apiV2Call('/metrics', 'POST', payload);
        savedMetricId = created.id || created._id;
      }

      // Save alerts for this metric (alerts are per-metric / per-sensor customization)
      if (savedMetricId && metricAlerts.length > 0) {
        if (wasMetricCreate) {
          // New metric: only create new alerts. Do not PATCH alerts by id (those ids belong to other metrics).
          const createPromises = metricAlerts
            .filter(alert => alert.usuario && alert.correo)
            .map(async (alert) => {
              const alertData = {
                usuario: alert.usuario,
                correo: alert.correo,
                celular: alert.celular,
                celularAlert: alert.celularAlert ?? alert.celular_alert,
                dashboardAlert: alert.dashboardAlert ?? alert.dashboard_alert,
                emailAlert: alert.emailAlert ?? alert.email_alert,
                preventivo: alert.preventivo,
                correctivo: alert.correctivo,
                emailCooldownMinutes: alert.emailCooldownMinutes ?? 10,
                emailMaxPerDay: alert.emailMaxPerDay ?? 5
              };
              return apiV2Call(`/metrics/${savedMetricId}/alerts`, 'POST', alertData);
            });
          await Promise.all(createPromises);
        } else {
          // Editing existing metric: sync alerts (PATCH existing, POST new, DELETE removed)
          const existingAlerts = await apiV2Call(`/metrics/${savedMetricId}/alerts`);
          const existingIds = new Set((Array.isArray(existingAlerts) ? existingAlerts : []).map((a: MetricAlert) => String(a.id || a._id)));

          const alertPromises = metricAlerts
            .filter(alert => alert.usuario && alert.correo)
            .map(async (alert) => {
              const alertData = {
                usuario: alert.usuario,
                correo: alert.correo,
                celular: alert.celular,
                celularAlert: alert.celularAlert ?? alert.celular_alert,
                dashboardAlert: alert.dashboardAlert ?? alert.dashboard_alert,
                emailAlert: alert.emailAlert ?? alert.email_alert,
                preventivo: alert.preventivo,
                correctivo: alert.correctivo,
                emailCooldownMinutes: alert.emailCooldownMinutes ?? 10,
                emailMaxPerDay: alert.emailMaxPerDay ?? 5
              };
              const alertId = alert.id || alert._id;
              if (alertId && existingIds.has(String(alertId))) {
                await apiV2Call(`/metrics/${savedMetricId}/alerts/${alertId}`, 'PATCH', alertData);
                existingIds.delete(String(alertId));
              } else {
                await apiV2Call(`/metrics/${savedMetricId}/alerts`, 'POST', alertData);
              }
            });

          await Promise.all(alertPromises);

          const deletePromises = Array.from(existingIds).map(existingId =>
            apiV2Call(`/metrics/${savedMetricId}/alerts/${existingId}`, 'DELETE')
          );
          await Promise.all(deletePromises);
        }
      }
      
      handleCloseModal();
      fetchMetrics();
      MySwal.fire('Éxito', 'Métrica guardada exitosamente', 'success');
    } catch (error) {
      console.error("Error submitting metric:", error);
      MySwal.fire('Error', 'Error al guardar métrica', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetricAlerts = async (metricId: string) => {
    if (!metricId) {
      setMetricAlerts([]);
      return;
    }
    setLoadingAlerts(true);
    try {
      const response = await apiV2Call(`/metrics/${metricId}/alerts`);
      setMetricAlerts(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Error fetching metric alerts:", error);
      setMetricAlerts([]);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleAddAlert = () => {
    const newAlert = { ...defaultAlert };
    setMetricAlerts([...metricAlerts, newAlert]);
  };

  const handleUpdateAlert = (index: number, field: keyof MetricAlert, value: any) => {
    const newAlerts = [...metricAlerts];
    newAlerts[index] = { ...newAlerts[index], [field]: value };
    setMetricAlerts(newAlerts);
  };

  const handleDeleteAlert = (index: number) => {
    const newAlerts = metricAlerts.filter((_, i) => i !== index);
    setMetricAlerts(newAlerts);
  };

  const handleEdit = async (metric: Metric) => {
    setFormData(metric);
    setEditingId(metric._id || metric.id || null);
    setModalOpen(true);
    // Fetch alerts for this metric
    if (metric._id || metric.id) {
      await fetchMetricAlerts(metric._id || metric.id || '');
    }
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

  const handlePvEdit = async (pv: PuntosVenta) => {
    const pvId = pv._id || pv.id || null;
    console.log('[handlePvEdit] Editing puntoVenta:', pv, 'pvId:', pvId);
    // dev_mode: only boolean column from API, not meta or other JSON
    const devModeValue = pv.dev_mode === true;
    setPvFormData({ ...pv, devMode: devModeValue });
    setEditPvId(pvId ? String(pvId) : null);
    if (pvId) {
      await fetchSensorsForEdit(String(pvId));
      setDevModeEnabled(devModeValue);
    }
    setPvModalOpen(true);
  };

  const confirmationAlert = () => MySwal.fire({
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
        MySwal.fire('Éxito', 'Métrica eliminada', 'success');
      }
    } catch (error) {
      console.error("Error deleting metric:", error);
      MySwal.fire('Error', 'Error al eliminar métrica', 'error');
    }
  };

  const handleClientDelete = async (id: string) => {
    try {
      const result = await confirmationAlert();
      if (result.isConfirmed) {
        await apiV2Call(`/clients/${id}`, 'DELETE');
        fetchClients();
        MySwal.fire('Éxito', 'Cliente eliminado', 'success');
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      MySwal.fire('Error', 'Error al eliminar cliente', 'error');
    }
  };

  const handleCityDelete = async (id: string) => {
    try {
      const result = await confirmationAlert();
      if (result.isConfirmed) {
        await apiV2Call(`/cities/${id}`, 'DELETE');
        fetchCities();
        MySwal.fire('Éxito', 'Ciudad eliminada', 'success');
      }
    } catch (error) {
      console.error("Error deleting city:", error);
      MySwal.fire('Error', 'Error al eliminar ciudad', 'error');
    }
  };

  const handlePvDelete = async (id: string) => {
    try {
      const result = await confirmationAlert();
      if (result.isConfirmed) {
        await apiV2Call(`/puntoVentas/${id}`, 'DELETE');
        fetchPuntosVenta();
        MySwal.fire('Éxito', 'Punto de venta eliminado', 'success');
      }
    } catch (error) {
      console.error("Error deleting PuntoVenta:", error);
      MySwal.fire('Error', 'Error al eliminar punto de venta', 'error');
    }
  };

  const handleOpenModal = () => {
    setFormData(defaultMetric);
    setEditingId(null);
    setModalOpen(true);
  };

  /** Open metric modal with cliente and punto de venta pre-filled (from "Nueva métrica" inside configurar PV) */
  const handleOpenModalForPv = (pv: { cliente: string; punto_venta_id: string; client_name: string; punto_venta_name: string }) => {
    setFormData({
      ...defaultMetric,
      cliente: pv.cliente,
      punto_venta_id: pv.punto_venta_id,
      client_name: pv.client_name,
      punto_venta_name: pv.punto_venta_name
    });
    setEditingId(null);
    setMetricAlerts([]);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setFormData(defaultMetric);
    setEditingId(null);
    setMetricAlerts([]);
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
      [name]: value
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
      MySwal.fire('Éxito', 'Cliente guardado', 'success');
    } catch (error) {
      console.error("Error submitting client:", error);
      MySwal.fire('Error', 'Error al guardar cliente', 'error');
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
      MySwal.fire('Éxito', 'Ciudad guardada', 'success');
    } catch (error) {
      console.error("Error submitting city:", error);
      MySwal.fire('Error', 'Error al guardar ciudad', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePvSubmit = async () => {
    setLoading(true);
    try {
      const payload = { ...pvFormData, devMode: devModeEnabled };
      if (pvFormData._id || pvFormData.id) {
        const id = pvFormData._id || pvFormData.id;
        await apiV2Call(`/puntoVentas/${id}`, 'PATCH', payload);
      } else {
        await apiV2Call('/puntoVentas', 'POST', payload);
      }
      handleClosePvModal();
      fetchPuntosVenta();
      MySwal.fire('Éxito', 'Punto de venta guardado', 'success');
    } catch (error) {
      console.error("Error submitting punto de venta:", error);
      MySwal.fire('Error', 'Error al guardar punto de venta', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSensorDelete = async (sensorId: string) => {
    try {
      const result = await confirmationAlert();
      if (result.isConfirmed && editPvId) {
        await apiV2Call(`/puntoVentas/${editPvId}/sensors/${sensorId}`, 'DELETE');
        await fetchSensorsForEdit(editPvId);
        MySwal.fire('Éxito', 'Sensor eliminado', 'success');
      }
    } catch (error) {
      console.error("Error deleting sensor:", error);
      MySwal.fire('Error', 'Error al eliminar sensor', 'error');
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
    setEditPvId(null);
    setEditPvSensors([]);
    setPvModalOpen(true);
  };

  const handleCloseCityModal = () => {
    setCityModalOpen(false);
  };

  const handleClosePvModal = () => {
    setPvModalOpen(false);
    setEditPvId(null);
    setEditPvSensors([]);
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
          {isAdmin && <CustomTab label="Clientes" />}
          {isAdmin && <CustomTab label="Ciudades" />}
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
                          <StyledTableCellHeader>Métricas</StyledTableCellHeader>
                          <StyledTableCellHeader>Estado</StyledTableCellHeader>
                          <StyledTableCellHeader>Acciones</StyledTableCellHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {metricsByPuntoVenta.map((row) => (
                          <StyledTableRow key={`${row.cliente}|${row.punto_venta_id}`}>
                            <StyledTableCell>{row.client_name || '-'}</StyledTableCell>
                            <StyledTableCell>{row.punto_venta_name || 'Todos'}</StyledTableCell>
                            <StyledTableCell>
                              {row.metrics.length === 0
                                ? '-'
                                : row.metrics.map((m) => m.metric_name || m.metric_type || 'Legacy').join(', ')}
                            </StyledTableCell>
                            <StyledTableCell>
                              <Chip
                                label={row.metrics.some((m) => m.enabled !== false) ? 'Activo' : 'Inactivo'}
                                color={row.metrics.some((m) => m.enabled !== false) ? 'success' : 'default'}
                                size="small"
                              />
                            </StyledTableCell>
                            <StyledTableCell>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<SvgColor src="./assets/icons/actions/edit.svg" />}
                                onClick={() =>
                                  setConfigurarPv({
                                    cliente: row.cliente,
                                    punto_venta_id: row.punto_venta_id,
                                    client_name: row.client_name,
                                    punto_venta_name: row.punto_venta_name
                                  })
                                }
                              >
                                Configurar métricas
                              </Button>
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
                          <StyledTableCellHeader>Sensores</StyledTableCellHeader>
                          <StyledTableCellHeader>Acciones</StyledTableCellHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {puntosVenta.map((pv) => (
                          <StyledTableRow key={pv._id || pv.id}>
                            <StyledTableCell>{pv.client_name}</StyledTableCell>
                            <StyledTableCell>{pv.name}</StyledTableCell>
                            <StyledTableCell>{pv.city_name}</StyledTableCell>
                            <StyledTableCell>
                              <Button 
                                size="small" 
                                variant="outlined"
                                onClick={async () => {
                                  const pvId = pv._id || pv.id || '';
                                  if (pvId) {
                                    const pvIdStr = toStr(pvId);
                                    await fetchSensorsForView(pvIdStr);
                                    setViewPvId(pvIdStr);
                                    const pvName = (pv.name || '') as string;
                                    setViewingPvName(pvName);
                                    setSensorsModalOpen(true);
                                  }
                                }}
                              >
                                Ver Sensores
                              </Button>
                            </StyledTableCell>
                            <StyledTableCell>
                              <IconButton onClick={() => handlePvEdit(pv)} sx={{ mr: 1, color: 'primary.main' }}>
                                <SvgColor src='./assets/icons/actions/edit.svg' />
                              </IconButton>
                              {isAdmin && (
                                <IconButton onClick={() => handlePvDelete(pv._id || pv.id || '')} sx={{ mr: 1, color: 'danger.main' }}>
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
        
        {isAdmin && tabIndex === 3 && (
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

        {/* Modal: Métricas del Punto de Venta (one PV → list of metric types, add/edit/delete) */}
        <Dialog
          open={configurarPv !== null}
          onClose={() => setConfigurarPv(null)}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>
            Métricas — {configurarPv?.punto_venta_name ?? 'Punto de venta'}
          </DialogTitle>
          <DialogContent>
            {configurarPv && (
              <Box sx={{ pt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {configurarPv.client_name} · {configurarPv.punto_venta_name}
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={() => handleOpenModalForPv(configurarPv)}
                  >
                    Nueva métrica
                  </Button>
                </Box>
                {(() => {
                  const pvMetrics =
                    metricsByPuntoVenta.find(
                      (r) =>
                        String(r.punto_venta_id) === String(configurarPv.punto_venta_id) &&
                        String(r.cliente) === String(configurarPv.cliente)
                    )?.metrics ?? [];
                  if (pvMetrics.length === 0) {
                    return (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        No hay métricas configuradas. Usa &quot;Nueva métrica&quot; para agregar TDS, NIVEL AGUA CRUDA, etc.
                      </Typography>
                    );
                  }
                  return (
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f4f6f8' }}>
                          <StyledTableCellHeader>Tipo de Métrica</StyledTableCellHeader>
                          <StyledTableCellHeader>Sensor</StyledTableCellHeader>
                          <StyledTableCellHeader>Estado</StyledTableCellHeader>
                          <StyledTableCellHeader>Acciones</StyledTableCellHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pvMetrics.map((metric) => (
                          <TableRow key={metric._id || metric.id}>
                            <StyledTableCell>{metric.metric_name || metric.metric_type || 'Legacy'}</StyledTableCell>
                            <StyledTableCell>
                              {metric.sensor_type ? `${metric.sensor_type} (${metric.sensor_unit || ''})` : '-'}
                            </StyledTableCell>
                            <StyledTableCell>
                              <Chip
                                label={metric.enabled !== false ? 'Activo' : 'Inactivo'}
                                color={metric.enabled !== false ? 'success' : 'default'}
                                size="small"
                              />
                            </StyledTableCell>
                            <StyledTableCell>
                              <IconButton onClick={() => handleEdit(metric)} sx={{ mr: 1, color: 'primary.main' }} size="small">
                                <SvgColor src="./assets/icons/actions/edit.svg" />
                              </IconButton>
                              <IconButton onClick={() => handleDelete(metric._id || metric.id || '')} sx={{ mr: 1, color: 'danger.main' }} size="small">
                                <SvgColor src="./assets/icons/actions/delete.svg" />
                              </IconButton>
                            </StyledTableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  );
                })()}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfigurarPv(null)} color="secondary">
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal for Creating / Editing Metrics - Interactive Configuration */}
        <Grid item xs={12}>
          <Dialog open={modalOpen} onClose={handleCloseModal} fullWidth maxWidth="lg">
            <DialogTitle>{editingId ? "Editar Métrica" : "Nueva Métrica"}</DialogTitle>
            <DialogContent>
              <Box display="flex" flexDirection="column" gap={2} mt={1} sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Basic Information */}
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<Iconify icon="solar:alt-arrow-down-bold-duotone" width={24} />}>
                    <Typography variant="h6">Información Básica</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Cliente</InputLabel>
                          <Select value={formData.cliente || formData.clientId || ''} name="cliente" onChange={handleChange}>
                            {clients.map((cliente) => (
                              <MenuItem key={cliente._id || cliente.id} value={cliente._id || cliente.id}>{cliente.name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Punto de Venta</InputLabel>
                          <Select 
                            value={formData.punto_venta_id || ''} 
                            name="punto_venta_id" 
                            onChange={handleChange}
                            disabled={!formData.cliente && !formData.clientId}
                          >
                            <MenuItem value="">Todos</MenuItem>
                            {(() => {
                              // Filter puntosVenta by selected cliente
                              const selectedClienteId = formData.cliente || formData.clientId;
                              const filteredPuntosVenta = selectedClienteId
                                ? puntosVenta.filter((pv) => {
                                    const pvClienteId = typeof pv.cliente === 'object' && pv.cliente !== null
                                      ? (pv.cliente as any)._id || (pv.cliente as any).id
                                      : pv.cliente;
                                    return String(pvClienteId) === String(selectedClienteId);
                                  })
                                : puntosVenta;
                              
                              return filteredPuntosVenta.map((pv) => (
                                <MenuItem key={pv._id || pv.id} value={pv._id || pv.id}>{pv.name}</MenuItem>
                              ));
                            })()}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Tipo de Métrica</InputLabel>
                          <Select 
                            value={formData.metric_type || ''} 
                            name="metric_type" 
                            onChange={(e) => {
                              const newType = e.target.value;
                              const selectedType = METRIC_TYPES.find(t => t.value === newType);
                              if (!selectedType) return;
                              const clienteId = String(formData.cliente || formData.clientId || '');
                              const pvId = String(formData.punto_venta_id || '');
                              // Prefer editing existing metric of this type for same cliente/PV to avoid duplicates
                              const existingMetric = metrics.find(
                                (m) =>
                                  String(m.metric_type ?? '') === String(newType) &&
                                  String(m.punto_venta_id ?? '') === pvId &&
                                  String(m.cliente ?? m.clientId ?? '') === clienteId
                              );
                              if (existingMetric) {
                                const rules = Array.isArray(existingMetric.rules) ? existingMetric.rules : (existingMetric.rules != null ? [existingMetric.rules] : []);
                                const clienteVal = existingMetric.cliente ?? existingMetric.clientId ?? formData.cliente;
                                const clientIdVal = existingMetric.clientId ?? existingMetric.cliente;
                                setFormData({
                                  ...existingMetric,
                                  cliente: clienteVal != null ? String(clienteVal) : undefined,
                                  clientId: clientIdVal != null ? String(clientIdVal) : undefined,
                                  rules
                                });
                                setEditingId(existingMetric._id || existingMetric.id || null);
                                if (existingMetric._id || existingMetric.id) {
                                  fetchMetricAlerts(String(existingMetric._id || existingMetric.id));
                                } else {
                                  setMetricAlerts([]);
                                }
                              } else {
                                setEditingId(null);
                                setMetricAlerts([]);
                                setFormData({
                                  ...formData,
                                  metric_type: newType,
                                  metric_name: selectedType.label,
                                  sensor_type: selectedType.sensorTypes[0] || '',
                                  sensor_unit: selectedType.unit,
                                  read_only: selectedType.readOnly || false,
                                  rules: []
                                });
                              }
                            }}
                          >
                            {METRIC_TYPES.map((type) => (
                              <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Tipo de Sensor</InputLabel>
                          <Select 
                            value={formData.sensor_type || ''} 
                            name="sensor_type" 
                            onChange={handleChange}
                            disabled={!formData.metric_type}
                          >
                            {formData.metric_type && METRIC_TYPES.find(t => t.value === formData.metric_type)?.sensorTypes.map((st) => {
                              const sensor = SENSOR_TYPES.find(s => s.value === st);
                              return sensor ? (
                                <MenuItem key={sensor.value} value={sensor.value}>{sensor.label}</MenuItem>
                              ) : null;
                            })}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField 
                          label="Unidad" 
                          name="sensor_unit" 
                          value={formData.sensor_unit || ''} 
                          onChange={handleChange} 
                          fullWidth 
                          disabled
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField 
                          label="Orden de Visualización" 
                          name="display_order" 
                          type="number" 
                          value={formData.display_order || 0} 
                          onChange={handleChange} 
                          fullWidth 
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 2 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={formData.enabled !== false}
                                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                              />
                            }
                            label="Habilitado"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={formData.read_only || false}
                                onChange={(e) => setFormData({ ...formData, read_only: e.target.checked })}
                                disabled={METRIC_TYPES.find(t => t.value === formData.metric_type)?.readOnly}
                              />
                            }
                            label="Solo Lectura"
                          />
                        </Box>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>

                {/* Rules Configuration */}
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<Iconify icon="solar:alt-arrow-down-bold-duotone" width={24} />}>
                    <Typography variant="h6">Configuración de Rangos y Colores</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1">Reglas de Rango</Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Iconify icon="solar:add-circle-bold-duotone" width={20} />}
                          onClick={() => {
                            const newRules = [...(formData.rules || []), { min: null, max: null, color: SEVERITY_TO_COLOR.normal, label: '', message: '', severity: 'normal' as const }];
                            setFormData({ ...formData, rules: newRules });
                          }}
                        >
                          Agregar Regla
                        </Button>
                      </Box>
                      {(formData.rules || []).map((rule, index) => (
                        <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={3}>
                              <TextField
                                label="Mínimo"
                                type="number"
                                value={rule.min ?? ''}
                                onChange={(e) => {
                                  const newRules = [...(formData.rules || [])];
                                  newRules[index].min = e.target.value === '' ? null : parseFloat(e.target.value);
                                  setFormData({ ...formData, rules: newRules });
                                }}
                                fullWidth
                                placeholder="Sin límite"
                              />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                              <TextField
                                label="Máximo"
                                type="number"
                                value={rule.max ?? ''}
                                onChange={(e) => {
                                  const newRules = [...(formData.rules || [])];
                                  newRules[index].max = e.target.value === '' ? null : parseFloat(e.target.value);
                                  setFormData({ ...formData, rules: newRules });
                                }}
                                fullWidth
                                placeholder="Sin límite"
                              />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                              <FormControl fullWidth>
                                <InputLabel>Severidad</InputLabel>
                                <Select
                                  value={rule.severity ?? (inferSeverityFromColor(rule.color) ?? 'normal')}
                                  onChange={(e) => {
                                    const newRules = [...(formData.rules || [])];
                                    const severity = e.target.value as 'normal' | 'preventivo' | 'critico';
                                    newRules[index].severity = severity;
                                    newRules[index].color = SEVERITY_TO_COLOR[severity];
                                    setFormData({ ...formData, rules: newRules });
                                  }}
                                >
                                  {SEVERITY_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ width: 20, height: 20, backgroundColor: SEVERITY_TO_COLOR[opt.value], border: '1px solid #ccc', borderRadius: 1 }} />
                                        {opt.label}
                                      </Box>
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={2}>
                              <TextField
                                label="Etiqueta"
                                value={rule.label || ''}
                                onChange={(e) => {
                                  const newRules = [...(formData.rules || [])];
                                  newRules[index].label = e.target.value;
                                  setFormData({ ...formData, rules: newRules });
                                }}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12} sm={1}>
                              <IconButton
                                color="error"
                                onClick={() => {
                                  const newRules = (formData.rules || []).filter((_, i) => i !== index);
                                  setFormData({ ...formData, rules: newRules });
                                }}
                              >
                                <SvgColor src='./assets/icons/actions/delete.svg' />
                              </IconButton>
                            </Grid>
                            <Grid item xs={12}>
                              <TextField
                                label="Mensaje de alerta (texto personalizado en dashboard)"
                                placeholder="Ej: Revisar suministro. Verificar tubería de entrada."
                                value={rule.message ?? ''}
                                onChange={(e) => {
                                  const newRules = [...(formData.rules || [])];
                                  newRules[index].message = e.target.value;
                                  setFormData({ ...formData, rules: newRules });
                                }}
                                fullWidth
                                size="small"
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      ))}
                      {(!formData.rules || formData.rules.length === 0) && (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                          No hay reglas configuradas. Agrega una regla para definir los rangos y severidad.
                        </Typography>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>

                {/* Conditions (for complex metrics) */}
                {(formData.metric_type === 'nivel_agua_cruda' || formData.metric_type === 'nivel_agua_purificada') && (
                  <Accordion>
                    <AccordionSummary expandIcon={<Iconify icon="solar:alt-arrow-down-bold-duotone" width={24} />}>
                      <Typography variant="h6">Condiciones Especiales</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" color="text.secondary">
                        Las condiciones especiales para métricas complejas se configurarán en una versión futura.
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                )}

                {/* Alerts/Notifications Section */}
                <Accordion defaultExpanded={false}>
                  <AccordionSummary expandIcon={<Iconify icon="solar:alt-arrow-down-bold-duotone" width={24} />}>
                    <Typography variant="h6">Alertas y Notificaciones</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1">Configuración de Alertas por Usuario</Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Iconify icon="solar:add-circle-bold-duotone" width={20} />}
                          onClick={handleAddAlert}
                          disabled={!editingId && !formData.metric_type}
                        >
                          Agregar Alerta
                        </Button>
                      </Box>
                      {loadingAlerts ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : (
                        <>
                          {metricAlerts.length > 0 ? (
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <StyledTableCellHeader>Usuario</StyledTableCellHeader>
                                  <StyledTableCellHeader>Correo</StyledTableCellHeader>
                                  <StyledTableCellHeader>Celular</StyledTableCellHeader>
                                  <StyledTableCellHeader>Celular Alert</StyledTableCellHeader>
                                  <StyledTableCellHeader>Dashboard Alert</StyledTableCellHeader>
                                  <StyledTableCellHeader>Email Alert</StyledTableCellHeader>
                                  <StyledTableCellHeader title="Minutos entre emails">Min entre emails</StyledTableCellHeader>
                                  <StyledTableCellHeader title="Máximo de emails por día">Max/día</StyledTableCellHeader>
                                  <StyledTableCellHeader>Preventivo</StyledTableCellHeader>
                                  <StyledTableCellHeader>Correctivo</StyledTableCellHeader>
                                  <StyledTableCellHeader>Acciones</StyledTableCellHeader>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {metricAlerts.map((alert, index) => (
                                  <TableRow key={index}>
                                    <StyledTableCell>
                                      <TextField
                                        size="small"
                                        value={alert.usuario || ''}
                                        onChange={(e) => handleUpdateAlert(index, 'usuario', e.target.value)}
                                        placeholder="Nombre del usuario"
                                        fullWidth
                                      />
                                    </StyledTableCell>
                                    <StyledTableCell>
                                      <TextField
                                        size="small"
                                        type="email"
                                        value={alert.correo || ''}
                                        onChange={(e) => handleUpdateAlert(index, 'correo', e.target.value)}
                                        placeholder="email@ejemplo.com"
                                        fullWidth
                                      />
                                    </StyledTableCell>
                                    <StyledTableCell>
                                      <TextField
                                        size="small"
                                        value={alert.celular || ''}
                                        onChange={(e) => handleUpdateAlert(index, 'celular', e.target.value)}
                                        placeholder="+52 1234567890"
                                        fullWidth
                                        disabled={!(alert.celularAlert || alert.celular_alert)}
                                      />
                                    </StyledTableCell>
                                    <StyledTableCell>
                                      <Switch
                                        checked={alert.celularAlert || alert.celular_alert || false}
                                        onChange={(e) => {
                                          handleUpdateAlert(index, 'celularAlert', e.target.checked);
                                          if (!e.target.checked) {
                                            handleUpdateAlert(index, 'celular', '');
                                          }
                                        }}
                                        size="small"
                                      />
                                    </StyledTableCell>
                                    <StyledTableCell>
                                      <Switch
                                        checked={alert.dashboardAlert || alert.dashboard_alert || false}
                                        onChange={(e) => handleUpdateAlert(index, 'dashboardAlert', e.target.checked)}
                                        size="small"
                                      />
                                    </StyledTableCell>
                                    <StyledTableCell>
                                      <Switch
                                        checked={alert.emailAlert || alert.email_alert || false}
                                        onChange={(e) => handleUpdateAlert(index, 'emailAlert', e.target.checked)}
                                        size="small"
                                      />
                                    </StyledTableCell>
                                    <StyledTableCell>
                                      <TextField
                                        size="small"
                                        type="number"
                                        value={alert.emailCooldownMinutes ?? 10}
                                        onChange={(e) => handleUpdateAlert(index, 'emailCooldownMinutes', Math.max(1, parseInt(e.target.value, 10) || 1))}
                                        inputProps={{ min: 1, max: 1440 }}
                                        sx={{ width: 70 }}
                                        disabled={!(alert.emailAlert || alert.email_alert)}
                                      />
                                    </StyledTableCell>
                                    <StyledTableCell>
                                      <TextField
                                        size="small"
                                        type="number"
                                        value={alert.emailMaxPerDay ?? 5}
                                        onChange={(e) => handleUpdateAlert(index, 'emailMaxPerDay', Math.max(1, Math.min(24, parseInt(e.target.value, 10) || 1)))}
                                        inputProps={{ min: 1, max: 24 }}
                                        sx={{ width: 70 }}
                                        disabled={!(alert.emailAlert || alert.email_alert)}
                                      />
                                    </StyledTableCell>
                                    <StyledTableCell>
                                      <Switch
                                        checked={alert.preventivo || false}
                                        onChange={(e) => handleUpdateAlert(index, 'preventivo', e.target.checked)}
                                        size="small"
                                      />
                                    </StyledTableCell>
                                    <StyledTableCell>
                                      <Switch
                                        checked={alert.correctivo || false}
                                        onChange={(e) => handleUpdateAlert(index, 'correctivo', e.target.checked)}
                                        size="small"
                                      />
                                    </StyledTableCell>
                                    <StyledTableCell>
                                      <IconButton
                                        color="error"
                                        size="small"
                                        onClick={() => handleDeleteAlert(index)}
                                      >
                                        <SvgColor src='./assets/icons/actions/delete.svg' />
                                      </IconButton>
                                    </StyledTableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                              No hay alertas configuradas. Agrega una alerta para configurar notificaciones por usuario.
                            </Typography>
                          )}
                        </>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
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
          <Dialog open={pvModalOpen} onClose={handleClosePvModal} fullWidth maxWidth="md">
            <DialogTitle>
              {pvFormData._id || pvFormData.id ? "Editar Punto de Venta" : "Nuevo Punto de Venta"}
            </DialogTitle>
            <DialogContent>
              <Box display="flex" flexDirection="column" gap={2} mt={1}>
                <TextField
                  label="Código tienda"
                  name="codigo_tienda"
                  placeholder="Ej: TIENDA_001, CODIGO_TIENDA_TEST"
                  value={pvFormData.codigo_tienda || ""}
                  onChange={handlePvChange}
                  fullWidth
                  helperText="Identificador único del punto de venta (requerido para v2.0)"
                />
                <TextField
                  label="Nombre"
                  name="name"
                  value={pvFormData.name || ""}
                  onChange={handlePvChange}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>Ciudad</InputLabel>
                  <Select
                    value={pvFormData.city || ""}
                    name="city"
                    onChange={handlePvChange}
                  >
                    {cities.map((c, idx) => {
                      const cityId = c._id || c.id || `city-${idx}`;
                      return (
                        <MenuItem key={cityId} value={cityId}>
                          {c.city || cityId}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Cliente</InputLabel>
                  <Select
                    value={pvFormData.cliente || ""}
                    name="cliente"
                    onChange={handlePvChange}
                  >
                    {clients.map((cli, idx) => {
                      const clientId = cli._id || cli.id || `client-${idx}`;
                      return (
                        <MenuItem key={clientId} value={clientId}>
                          {cli.name}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
                
                {/* Dev Mode Toggle - Only show when editing existing puntoVenta */}
                {editPvId && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={devModeEnabled}
                        onChange={async (event: React.ChangeEvent<HTMLInputElement>) => {
                          const enabled = event.target.checked;
                          setDevModeEnabled(enabled);
                          setPvFormData((prev) => ({ ...prev, devMode: enabled }));
                          try {
                            await apiV2Call(`/puntoVentas/${editPvId}`, 'PATCH', { devMode: enabled });
                          } catch (err) {
                            console.error('Error updating dev mode:', err);
                            MySwal.fire('Error', 'No se pudo guardar el modo desarrollo', 'error');
                          }
                        }}
                        color="primary"
                      />
                    }
                    label="Habilitar Modo Desarrollo (generar datos aleatorios y mostrar escenarios)"
                  />
                )}
                
                {/* Sensors Section - Only show when editing existing puntoVenta */}
                {editPvId && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Sensores Configurados {editPvSensors.length > 0 && `(${editPvSensors.length})`}
                    </Typography>
                    {editPvSensors.length > 0 ? (
                      <StyledTableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <StyledTableCellHeader>Nombre</StyledTableCellHeader>
                              <StyledTableCellHeader>Tipo</StyledTableCellHeader>
                              <StyledTableCellHeader>Último Valor</StyledTableCellHeader>
                              <StyledTableCellHeader>Unidad</StyledTableCellHeader>
                              <StyledTableCellHeader>Estado</StyledTableCellHeader>
                              <StyledTableCellHeader>Última Lectura</StyledTableCellHeader>
                              <StyledTableCellHeader>Acciones</StyledTableCellHeader>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {editPvSensors.map((sensor) => (
                              <TableRow key={sensor.id || sensor._id}>
                                <StyledTableCell>{sensor.sensorName || sensor.label || '-'}</StyledTableCell>
                                <StyledTableCell>{sensor.sensorType || '-'}</StyledTableCell>
                                <StyledTableCell>
                                  {sensor.latestReading?.value !== null && sensor.latestReading?.value !== undefined
                                    ? `${sensor.latestReading.value.toFixed(2)} ${sensor.unit || ''}`
                                    : '-'}
                                </StyledTableCell>
                                <StyledTableCell>{sensor.unit || '-'}</StyledTableCell>
                                <StyledTableCell>
                                  <Chip 
                                    label={sensor.enabled !== false ? 'Activo' : 'Inactivo'} 
                                    color={sensor.enabled !== false ? 'success' : 'default'} 
                                    size="small"
                                  />
                                </StyledTableCell>
                                <StyledTableCell>
                                  {formatDate(sensor.latestReading?.timestamp, sensor.latestReading?.createdAt)}
                                </StyledTableCell>
                                <StyledTableCell>
                                  {isAdmin && (
                                    <IconButton 
                                      size="small" 
                                      onClick={() => handleSensorDelete(sensor.id || sensor._id || '')}
                                      sx={{ color: 'error.main' }}
                                    >
                                      <SvgColor src='./assets/icons/actions/delete.svg' />
                                    </IconButton>
                                  )}
                                </StyledTableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </StyledTableContainer>
                    ) : (
                      <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#f5f5f5' }}>
                        <Typography variant="body2" color="text.secondary">
                          No hay sensores configurados aún. Los sensores se registrarán automáticamente cuando lleguen datos MQTT para este punto de venta.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
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

          {/* Sensors View Modal */}
          <Dialog open={sensorsModalOpen} onClose={() => {
            setSensorsModalOpen(false);
            setViewSensors([]);
            setViewPvId(null);
          }} fullWidth maxWidth="lg">
            <DialogTitle>
              Sensores - {viewingPvName}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                {viewSensors.length > 0 ? (
                  <StyledTableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <StyledTableCellHeader>Nombre</StyledTableCellHeader>
                          <StyledTableCellHeader>Tipo</StyledTableCellHeader>
                          <StyledTableCellHeader>Último Valor</StyledTableCellHeader>
                          <StyledTableCellHeader>Unidad</StyledTableCellHeader>
                          <StyledTableCellHeader>Estado</StyledTableCellHeader>
                          <StyledTableCellHeader>Última Lectura</StyledTableCellHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {viewSensors.map((sensor) => (
                          <TableRow key={sensor.id || sensor._id}>
                            <StyledTableCell>{sensor.sensorName || sensor.label || '-'}</StyledTableCell>
                            <StyledTableCell>{sensor.sensorType || '-'}</StyledTableCell>
                            <StyledTableCell>
                              {sensor.latestReading?.value !== null && sensor.latestReading?.value !== undefined
                                ? `${sensor.latestReading.value.toFixed(2)} ${sensor.unit || ''}`
                                : '-'}
                            </StyledTableCell>
                            <StyledTableCell>{sensor.unit || '-'}</StyledTableCell>
                            <StyledTableCell>
                              <Chip 
                                label={sensor.enabled !== false ? 'Activo' : 'Inactivo'} 
                                color={sensor.enabled !== false ? 'success' : 'default'} 
                                size="small"
                              />
                            </StyledTableCell>
                            <StyledTableCell>
                              {formatDate(sensor.latestReading?.timestamp, sensor.latestReading?.createdAt)}
                            </StyledTableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </StyledTableContainer>
                ) : (
                  <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#f5f5f5' }}>
                    <Typography variant="body2" color="text.secondary">
                      No hay sensores configurados aún. Los sensores se registrarán automáticamente cuando lleguen datos MQTT para este punto de venta.
                    </Typography>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSensorsModalOpen(false)} color="primary">
                Cerrar
              </Button>
            </DialogActions>
          </Dialog>
        </Grid>
      </Box>
    </>
  );
}

export default CustomizationPageV2;

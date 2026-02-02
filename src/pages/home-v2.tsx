import { Helmet } from 'react-helmet-async';
import { useMemo, useState, useEffect } from 'react';

import Grid from '@mui/material/Unstable_Grid2';
import { KeyboardArrowUp, KeyboardArrowDown } from '@mui/icons-material';
import {
  Box,
  Chip,
  Paper,
  Table,
  Button,
  Select,
  Collapse,
  MenuItem,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TextField,
  InputLabel,
  Typography,
  IconButton,
  FormControl,
  Autocomplete,
  TableContainer,
  TablePagination,
  CircularProgress,
} from '@mui/material';

import {
  getLevelForValue,
  buildMetricCharts,
  type MetricConfig,
  type SensorRecord,
  type SensorWithLevel,
  type OnlineOfflineChart,
  buildOnlineOfflineChart,
  type MetricRuleWithLevel,
  classifySensorsWithLevels,
  type DashboardMetricChart,
} from 'src/utils/sensor-metrics-helper';

import { CONFIG } from 'src/config-global';
import { get as getV2 } from 'src/api/axiosHelperV2';
import { PieChart } from 'src/pages/charts/pie-chart';
import { DashboardContent } from 'src/layouts/dashboard';
import { NivelHistoricoChart } from 'src/pages/charts/nivel-historico-chart';

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

type ClienteV2 = { id?: string; _id?: string; name: string };
type PuntoVentaV2 = {
  id: string;
  _id?: string;
  name: string;
  clientId?: string;
  cliente?: ClienteV2 | string;
  online?: boolean;
};
type MetricV2 = {
  id: string | number;
  _id?: string;
  metric_name?: string;
  sensor_type?: string;
  sensor_unit?: string;
  rules?: MetricRuleWithLevel[];
  clientId?: string | number;
  punto_venta_id?: string | number;
};
type PuntoVentaSensor = {
  id: string | number;
  sensorName?: string;
  sensor_name?: string;
  sensorType?: string;
  sensor_type?: string;
  name?: string;
  type?: string;
  latestReading?: { value: number | null; timestamp?: string; createdAt?: string } | null;
};

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 min

function isSensorOnline(latestReading: PuntoVentaSensor['latestReading']): boolean {
  if (!latestReading?.timestamp && !latestReading?.createdAt) return false;
  const ts = latestReading.timestamp || latestReading.createdAt;
  if (!ts) return false;
  const t = new Date(ts).getTime();
  return Date.now() - t < ONLINE_THRESHOLD_MS;
}

// Map sensor types for display (database format → display format)
function getSensorDisplayName(sensorType: string): string {
  const typeMap: Record<string, string> = {
    'corriente_ch1': 'Máquina Nieve (Izq)',
    'corriente_ch2': 'Máquina Nieve (Der)',
    'corriente_ch3': 'Máquina Frappe (Izq)',
    'corriente_ch4': 'Máquina Frappe (Der)',
    'electronivel_cruda': 'Nivel Cruda',
    'electronivel_purificada': 'Nivel Purificada',
    'electronivel_recuperada': 'Nivel Recuperada',
    'level_cruda': 'Nivel Cruda',
    'level_purificada': 'Nivel Purificada',
    'level_recuperada': 'Nivel Recuperada',
    'nivel_cruda': 'Nivel Cruda',
    'nivel_purificada': 'Nivel Purificada',
    'nivel_recuperada': 'Nivel Recuperada',
    'flujo_produccion': 'Flujo Producción',
    'flujo_rechazo': 'Flujo Rechazo',
    'flujo_recuperacion': 'Flujo Recuperación',
    'presion_co2': 'Presión CO2',
    'eficiencia': 'Eficiencia',
    'tds': 'TDS',
    'acumulado_cruda': 'Acumulado Cruda',
    'caudal_cruda': 'Caudal Cruda',
    'caudal_cruda_lmin': 'Caudal Cruda (L/min)',
    'vida': 'Vida del Sistema',
  };
  
  return typeMap[sensorType.toLowerCase()] || sensorType;
}

// Normalize sensor type for metric matching (database format → metric config format)
function normalizeSensorType(sensorType: string): string {
  return sensorType
    .toLowerCase()
    .replace(/^electronivel_/, 'nivel_')
    .replace(/^level_/, 'nivel_');
}

function enhanceRulesWithLevels(rules: MetricRuleWithLevel[]): MetricRuleWithLevel[] {
  return rules.map(rule => {
    if (rule.level) return rule;
    
    // Infer level from color
    const colorUpper = rule.color?.toUpperCase() || '';
    if (colorUpper.startsWith('#') && colorUpper.length >= 7) {
      const r = parseInt(colorUpper.substring(1, 3), 16);
      const g = parseInt(colorUpper.substring(3, 5), 16);
      const b = parseInt(colorUpper.substring(5, 7), 16);

      // Error: High red, low green/blue (e.g., #EE0000, #FF0000)
      if (r > 200 && g < 120 && b < 120) {
        return { ...rule, level: 'correctivo' as const };
      }
      // Warning: High red and green, low blue (e.g., #FFFF00, #FFAB00)
      if (r > 180 && g > 100 && b < 100) {
        return { ...rule, level: 'preventivo' as const };
      }
      // Success: High green (e.g., #00B050)
      if (g > 100 && r < 150) {
        return { ...rule, level: 'normal' as const };
      }
    }
    
    return rule;
  });
}

function evaluateMetricStatus(
  value: number | null | undefined,
  sensorType: string,
  metricConfigs: MetricConfig[]
): { level: string; color: 'success' | 'warning' | 'error' } {
  if (value === null || value === undefined) {
    return { level: 'sin datos', color: 'success' };
  }

  // Convert value to number if it's a string
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (Number.isNaN(numericValue)) {
    return { level: 'sin datos', color: 'success' };
  }

  // Normalize sensor type for matching (handle aliases)
  const normalizedSensorType = normalizeSensorType(sensorType);

  // Find matching metric config
  let metricConfig = metricConfigs.find((m) => {
    const metricType = m.sensor_type?.toLowerCase() || '';
    const normalizedMetricType = normalizeSensorType(metricType);
    
    return normalizedMetricType === normalizedSensorType;
  });
  
  // Fallback: if no config found for corriente_ch2/ch3/ch4, use corriente_ch1
  if (!metricConfig && /^corriente_ch[234]$/i.test(normalizedSensorType)) {
    metricConfig = metricConfigs.find((m) => 
      m.sensor_type?.toLowerCase() === 'corriente_ch1'
    );
  }

  if (!metricConfig || !metricConfig.rules || metricConfig.rules.length === 0) {
    return { level: 'normal', color: 'success' };
  }

  // Add level property to rules based on color if not present
  const rulesWithLevel = enhanceRulesWithLevels(metricConfig.rules);

  // Use the existing helper function to get the level
  const level = getLevelForValue(numericValue, rulesWithLevel);

  let color: 'success' | 'warning' | 'error' = 'success';
  if (level === 'correctivo') {
    color = 'error';
  } else if (level === 'preventivo') {
    color = 'warning';
  }

  return { level, color };
}

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

export function HomeV2Page() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClienteV2[]>([]);
  const [puntosVenta, setPuntosVenta] = useState<PuntoVentaV2[]>([]);
  const [metrics, setMetrics] = useState<MetricV2[]>([]);
  const [sensorsWithLevels, setSensorsWithLevels] = useState<SensorWithLevel[]>([]);
  const [onlineOfflineChart, setOnlineOfflineChart] = useState<OnlineOfflineChart | null>(null);
  const [metricCharts, setMetricCharts] = useState<DashboardMetricChart[]>([]);
  const [nivelCrudaChart, setNivelCrudaChart] = useState<{ categories: string[]; series: any[]; currentValue: number; metricRules: any[] } | null>(null);
  const [nivelPurificadaChart, setNivelPurificadaChart] = useState<{ categories: string[]; series: any[]; currentValue: number; metricRules: any[] } | null>(null);

  const [selectedClientId, setSelectedClientId] = useState<string>('All');
  const [selectedPuntoVentaId, setSelectedPuntoVentaId] = useState<string>('All');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [selectedSegment, setSelectedSegment] = useState<{
    title: string;
    label: string;
    color: string;
    sensors: SensorWithLevel[];
  } | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);

  const userCliente = useMemo(() => {
    try {
      const user = localStorage.getItem('user');
      if (!user) return null;
      const parsed = JSON.parse(user);
      // For dashboard v2, use postgresClientId if available, otherwise fall back to cliente
      if (parsed.postgresClientId) {
        return { id: parsed.postgresClientId, _id: parsed.postgresClientId, name: '' } as ClienteV2;
      }
      return (parsed.cliente as ClienteV2) || null;
    } catch {
      return null;
    }
  }, []);

  const filteredPuntos = useMemo(() => {
    let list = puntosVenta;
    if (selectedClientId && selectedClientId !== 'All') {
      list = list.filter((pv) => {
        const cid = typeof pv.cliente === 'object' && pv.cliente != null
          ? String((pv.cliente as ClienteV2).id ?? (pv.cliente as ClienteV2)._id)
          : String(pv.clientId);
        return cid === selectedClientId;
      });
    }
    if (selectedPuntoVentaId && selectedPuntoVentaId !== 'All') {
      list = list.filter((pv) => String(pv.id ?? pv._id) === selectedPuntoVentaId);
    }
    return list;
  }, [puntosVenta, selectedClientId, selectedPuntoVentaId]);

  // Get available charts for the filter
  const availableCharts = useMemo(() => {
    const charts: string[] = [];
    
    // Add metric charts
    metricCharts.forEach((chart) => {
      charts.push(chart.title);
    });
    
    // Add nivel charts
    if (nivelCrudaChart) {
      charts.push('Histórico de Nivel Cruda');
    }
    if (nivelPurificadaChart) {
      charts.push('Histórico de Nivel Purificada');
    }
    
    // Add online/offline chart
    if (onlineOfflineChart) {
      charts.push(onlineOfflineChart.title);
    }
    
    return charts;
  }, [metricCharts, nivelCrudaChart, nivelPurificadaChart, onlineOfflineChart]);
  
  // Initialize selected charts with all available charts
  useEffect(() => {
    if (availableCharts.length > 0 && selectedCharts.length === 0) {
      setSelectedCharts(availableCharts);
    }
  }, [availableCharts, selectedCharts.length]);

  const tableRows = useMemo(() => {
    const base = selectedSegment ? selectedSegment.sensors : sensorsWithLevels;
    return base;
  }, [selectedSegment, sensorsWithLevels]);

  const tableRowsFilteredByPunto = useMemo(() => {
    let filtered = tableRows;
    
    // Filter by punto de venta and client
    if (selectedPuntoVentaId !== 'All' || selectedClientId !== 'All') {
      filtered = filtered.filter((s) => {
        const matchPunto = selectedPuntoVentaId === 'All' || String(s.puntoVentaId) === selectedPuntoVentaId;
        const matchClient = selectedClientId === 'All' || filteredPuntos.some((pv) => String(pv.id ?? pv._id) === String(s.puntoVentaId));
        return matchPunto && matchClient;
      });
    }
    
    return filtered;
  }, [tableRows, selectedPuntoVentaId, selectedClientId, filteredPuntos]);

  const paginatedRows = useMemo(
    () =>
      tableRowsFilteredByPunto.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [tableRowsFilteredByPunto, page, rowsPerPage]
  );

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await getV2<ClienteV2[]>('/clients');
        const list = Array.isArray(response) ? response : [];
        const filtered = list.filter((c) => c.name !== 'All');
        let out = filtered;
        // Filter by user's assigned PostgreSQL client ID
        if (userCliente?.id || userCliente?._id) {
          const userClientId = String(userCliente.id ?? userCliente._id);
          out = filtered.filter((c) => String(c.id ?? c._id) === userClientId);
        }
        setClients(out);
        if (out.length > 0 && selectedClientId === 'All' && (userCliente?.id || userCliente?._id)) {
          const first = out[0];
          setSelectedClientId(String(first.id ?? first._id ?? ''));
        }
      } catch (e) {
        setClients([]);
      }
    };
    fetchClients();
  }, [selectedClientId, userCliente?.id, userCliente?._id]);

  useEffect(() => {
    const fetchPuntos = async () => {
      try {
        const response = await getV2<PuntoVentaV2[]>('/puntoVentas/all');
        const list = Array.isArray(response) ? response : [];
        setPuntosVenta(list);
      } catch (e) {
        setPuntosVenta([]);
      }
    };
    fetchPuntos();
  }, []);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const params: Record<string, string> = {};
        if (selectedClientId && selectedClientId !== 'All') params.clientId = selectedClientId;
        const response = await getV2<MetricV2[]>('/metrics', Object.keys(params).length ? params : undefined);
        const list = Array.isArray(response) ? response : [];
        setMetrics(list);
      } catch (e) {
        setMetrics([]);
      }
    };
    fetchMetrics();
  }, [selectedClientId]);

  const depPuntoIds = useMemo(() => filteredPuntos.map((p) => p.id).join(','), [filteredPuntos]);
  const depMetricIds = useMemo(() => JSON.stringify(metrics.map((m) => m.id)), [metrics]);

  useEffect(() => {
    if (filteredPuntos.length === 0) {
      setSensorsWithLevels([]);
      setOnlineOfflineChart(null);
      setMetricCharts([]);
      setLoading(false);
      return () => {};
    }

    let cancelled = false;
    setLoading(true);

    const run = async () => {
      const results = await Promise.all(
        filteredPuntos.map(async (pv) => {
          try {
            // Fetch sensors with historical readings based on time range
            const sensors = await getV2<any[]>(
              `/puntoVentas/${pv.id}/sensors/readings`,
              { timeRange: selectedTimeRange }
            );
            const list = Array.isArray(sensors) ? sensors : [];
            const pvId = String(pv.id ?? pv._id);
            const pvName = pv.name || `PV ${pvId}`;
            const clientName =
              typeof pv.cliente === 'object' && pv.cliente != null
                ? (pv.cliente as ClienteV2).name
                : '';

            return list.map((s, idx) => {
              const name = s.sensorName ?? s.sensor_name ?? s.name ?? `Sensor ${idx}`;
              const originalSensorType = s.sensorType ?? s.sensor_type ?? s.type ?? '';
              const sensorId = s.id ?? idx;
              const { latestReading, readingsCount = 0, readings = [] } = s;
              
              // Parse value to number for metric evaluation
              const rawValue = latestReading?.value ?? null;
              let value = rawValue !== null && rawValue !== undefined
                ? (typeof rawValue === 'string' ? parseFloat(rawValue) : rawValue)
                : null;
              
              // Ensure NaN is converted to null
              if (value !== null && Number.isNaN(value)) {
                value = null;
              }
              const online = isSensorOnline(latestReading);
              const readingTime = latestReading?.timestamp || latestReading?.createdAt;
              
              return {
                id: `${pvId}-${sensorId}`,
                puntoVentaId: pvId,
                puntoVentaName: pvName,
                clientName,
                sensorName: name,
                sensorType: originalSensorType,
                sensorTypeDisplay: getSensorDisplayName(originalSensorType),
                value,
                online,
                lastReadingTime: readingTime,
                readingsCount,
                readings: Array.isArray(readings) ? readings : [],
              } as SensorRecord & { 
                lastReadingTime?: string; 
                readingsCount: number;
                readings: Array<{ value: any; timestamp: string; createdAt: string }>;
                sensorTypeDisplay: string;
              };
            });
          } catch (e) {
            return [];
          }
        })
      );

      if (cancelled) return;

      const allSensors: SensorRecord[] = results.flat();

      const metricConfigs: MetricConfig[] = metrics.map((m) => ({
        id: m.id ?? m._id,
        metric_name: m.metric_name,
        sensor_type: m.sensor_type,
        sensor_unit: m.sensor_unit,
        rules: enhanceRulesWithLevels((m.rules || []) as MetricRuleWithLevel[]),
      }));
      
      // Normalize sensor types to match metric configs (handle aliases)
      // We create a temporary normalized version for matching, but keep original in the data
      const normalizedSensors = allSensors.map(sensor => {
        let normalizedType = normalizeSensorType(sensor.sensorType);
        
        // Map corriente_ch2/ch3/ch4 to corriente_ch1 for metric matching
        // since they all use the same rules
        if (/^corriente_ch[234]$/i.test(normalizedType)) {
          normalizedType = 'corriente_ch1';
        }
        
        return {
          ...sensor,
          sensorType: normalizedType,
        };
      });

      const withLevels = classifySensorsWithLevels(normalizedSensors, metricConfigs);
      
      // Restore original sensor types in the result (withLevels has normalized types from normalizedSensors)
      const withOriginalTypes = withLevels.map((sensor, idx) => ({
        ...sensor,
        sensorType: allSensors[idx].sensorType, // Restore original
        sensorTypeDisplay: (allSensors[idx] as any).sensorTypeDisplay,
      }));
      const onlineOffline = buildOnlineOfflineChart(withOriginalTypes);
      const metricChartsData = buildMetricCharts(withOriginalTypes, metricConfigs);

      // Calculate nivel cruda and purificada chart data
      const nivelCrudaSensors = withOriginalTypes.filter(s => 
        s.sensorType.toLowerCase().includes('nivel') && s.sensorType.toLowerCase().includes('cruda')
      );
      const nivelPurificadaSensors = withOriginalTypes.filter(s => 
        s.sensorType.toLowerCase().includes('nivel') && s.sensorType.toLowerCase().includes('purificada')
      );

      // Get metric rules for nivel_cruda
      const nivelCrudaMetric = metricConfigs.find(m => 
        m.sensor_type?.toLowerCase() === 'nivel_cruda'
      );
      const nivelCrudaRules = nivelCrudaMetric?.rules || [];

      // Get metric rules for nivel_purificada
      const nivelPurificadaMetric = metricConfigs.find(m => 
        m.sensor_type?.toLowerCase() === 'nivel_purificada'
      );
      const nivelPurificadaRules = nivelPurificadaMetric?.rules || [];

      if (nivelCrudaSensors.length > 0) {
        const allReadings = nivelCrudaSensors.flatMap(s => 
          ((s as any).readings || []).map((r: any) => ({
            value: parseFloat(r.value) || 0,
            timestamp: r.timestamp || r.createdAt,
          }))
        );
        
        // Sort by timestamp
        allReadings.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        const categories = allReadings.map(r => {
          const date = new Date(r.timestamp);
          const time = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
          
          // For week/month views, add date label
          if (selectedTimeRange === 'week' || selectedTimeRange === 'month') {
            const dateStr = date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
            return `${time}\n${dateStr}`;
          }
          
          return time;
        });
        
        const data = allReadings.map(r => r.value);
        const currentValue = nivelCrudaSensors.reduce((sum, s) => sum + (s.value || 0), 0) / nivelCrudaSensors.length;
        
        setNivelCrudaChart({
          categories,
          series: [{ name: 'Nivel Cruda', data }],
          currentValue,
          metricRules: nivelCrudaRules,
        });
      } else {
        setNivelCrudaChart(null);
      }

      if (nivelPurificadaSensors.length > 0) {
        const allReadings = nivelPurificadaSensors.flatMap(s => 
          ((s as any).readings || []).map((r: any) => ({
            value: parseFloat(r.value) || 0,
            timestamp: r.timestamp || r.createdAt,
          }))
        );
        
        // Sort by timestamp
        allReadings.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        const categories = allReadings.map(r => {
          const date = new Date(r.timestamp);
          const time = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
          
          // For week/month views, add date label
          if (selectedTimeRange === 'week' || selectedTimeRange === 'month') {
            const dateStr = date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
            return `${time}\n${dateStr}`;
          }
          
          return time;
        });
        
        const data = allReadings.map(r => r.value);
        const currentValue = nivelPurificadaSensors.reduce((sum, s) => sum + (s.value || 0), 0) / nivelPurificadaSensors.length;
        
        setNivelPurificadaChart({
          categories,
          series: [{ name: 'Nivel Purificada', data }],
          currentValue,
          metricRules: nivelPurificadaRules,
        });
      } else {
        setNivelPurificadaChart(null);
      }

      if (!cancelled) {
        setSensorsWithLevels(withOriginalTypes);
        setOnlineOfflineChart(onlineOffline);
        setMetricCharts(metricChartsData);
      }
      setLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [depMetricIds, depPuntoIds, filteredPuntos, metrics, selectedTimeRange]);

  const handleChartSectionClick = (data: { label: string; color?: string; sensors?: SensorWithLevel[] }) => {
    if (data.sensors) {
      setSelectedSegment({
        title: data.label,
        label: data.label,
        color: data.color ?? '#666',
        sensors: data.sensors,
      });
    } else {
      setSelectedSegment(null);
    }
  };

  const clearTableFilter = () => setSelectedSegment(null);

  const metricConfigs = useMemo<MetricConfig[]>(
    () =>
      metrics.map((m) => ({
        id: m.id ?? m._id,
        metric_name: m.metric_name,
        sensor_type: m.sensor_type,
        sensor_unit: m.sensor_unit,
        rules: (m.rules || []) as MetricRuleWithLevel[],
      })),
    [metrics]
  );

  if (loading && sensorsWithLevels.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${CONFIG.appName} - Dashboard V2`}</title>
      </Helmet>

      <DashboardContent maxWidth="xl">
        <Typography variant="h3" sx={{ mb: { xs: 3, md: 5 } }}>
          Dashboard V2 — Sensores
        </Typography>

        <Grid container spacing={3} sx={{ background: 'white' }}>
          <Grid xs={12} md={6} lg={3}>
            <FormControl fullWidth>
              <InputLabel>Cliente</InputLabel>
              <Select
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  setSelectedPuntoVentaId('All');
                }}
                label="Cliente"
              >
                <MenuItem value="All">Todos</MenuItem>
                {clients.map((c) => (
                  <MenuItem key={String(c.id ?? c._id)} value={String(c.id ?? c._id)}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} md={6} lg={3}>
            <FormControl fullWidth>
              <InputLabel>Punto de venta</InputLabel>
              <Select
                value={selectedPuntoVentaId}
                onChange={(e) => setSelectedPuntoVentaId(e.target.value)}
                label="Punto de venta"
              >
                <MenuItem value="All">Todos</MenuItem>
                {filteredPuntos.map((pv) => (
                  <MenuItem key={String(pv.id ?? pv._id)} value={String(pv.id ?? pv._id)}>
                    {pv.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} md={6} lg={3}>
            <FormControl fullWidth>
              <InputLabel>Rango de tiempo</InputLabel>
              <Select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value as 'today' | 'week' | 'month')}
                label="Rango de tiempo"
              >
                <MenuItem value="today">Mostrar datos de hoy</MenuItem>
                <MenuItem value="week">Mostrar última semana</MenuItem>
                <MenuItem value="month">Mostrar último mes</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid xs={12} md={6} lg={3}>
            <Autocomplete
              multiple
              options={availableCharts}
              value={selectedCharts}
              onChange={(event, newValue) => {
                setSelectedCharts(newValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Mostrar detalle de:"
                  placeholder="Seleccionar gráficas..."
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return (
                    <Chip
                      key={key}
                      variant="outlined"
                      label={option}
                      size="small"
                      {...tagProps}
                    />
                  );
                })
              }
              ChipProps={{ size: 'small' }}
              limitTags={2}
              disableCloseOnSelect
              sx={{ width: '100%' }}
            />
          </Grid>

          {nivelCrudaChart && selectedCharts.includes('Histórico de Nivel Cruda') && (
            <Grid xs={12}>
              <NivelHistoricoChart
                title="Histórico de Nivel Cruda"
                categories={nivelCrudaChart.categories}
                series={nivelCrudaChart.series}
                currentValue={nivelCrudaChart.currentValue}
                metricRules={nivelCrudaChart.metricRules}
              />
            </Grid>
          )}

          {nivelPurificadaChart && selectedCharts.includes('Histórico de Nivel Purificada') && (
            <Grid xs={12}>
              <NivelHistoricoChart
                title="Histórico de Nivel Purificada"
                categories={nivelPurificadaChart.categories}
                series={nivelPurificadaChart.series}
                currentValue={nivelPurificadaChart.currentValue}
                metricRules={nivelPurificadaChart.metricRules}
              />
            </Grid>
          )}

          {onlineOfflineChart && selectedCharts.includes(onlineOfflineChart.title) && (
            <Grid xs={12} sm={6} md={6} lg={4} xl={3}>
              <PieChart
                title={`${onlineOfflineChart.title} (${sensorsWithLevels.length})`}
                chart={{
                  series: onlineOfflineChart.series.map((s) => ({
                    label: s.label,
                    value: s.value,
                    color: s.color,
                    sensors: s.sensors,
                  })),
                  colors: onlineOfflineChart.series.map((s) => s.color),
                }}
                onSectionClick={(data) => handleChartSectionClick(data as { label: string; color?: string; sensors?: SensorWithLevel[] })}
              />
            </Grid>
          )}

          {metricCharts.filter((chart) => {
            // Exclude nivel_cruda and nivel_purificada from pie charts since we show them as line charts
            const metricType = chart.title.toLowerCase();
            const isNivelCruda = metricType.includes('nivel') && metricType.includes('cruda');
            const isNivelPurificada = metricType.includes('nivel') && metricType.includes('purificada');
            const isSelected = selectedCharts.includes(chart.title);
            return chart.series.length > 0 && !isNivelCruda && !isNivelPurificada && isSelected;
          }).map((chart) => (
            <Grid key={chart.metricId} xs={12} sm={6} md={6} lg={4} xl={3}>
              <PieChart
                title={chart.title}
                chart={{
                  series: chart.series.map((s) => ({
                    label: s.label,
                    value: s.value,
                    color: s.color,
                    sensors: s.sensors,
                  })),
                  colors: chart.series.map((s) => s.color),
                }}
                onSectionClick={(data) => handleChartSectionClick(data as { label: string; color?: string; sensors?: SensorWithLevel[] })}
              />
            </Grid>
          ))}

          <Grid xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="h5" sx={{ color: selectedSegment?.color }}>
                {selectedSegment
                  ? `Detalle: ${selectedSegment.label} (${selectedSegment.sensors.length})`
                  : `Todos los sensores (${tableRowsFilteredByPunto.length}${tableRowsFilteredByPunto.length !== sensorsWithLevels.length ? ` de ${sensorsWithLevels.length}` : ''})`}
              </Typography>
              {selectedSegment && (
                <Button size="small" onClick={clearTableFilter} variant="outlined">
                  Mostrar todos
                </Button>
              )}
            </Box>
          </Grid>

          <Grid xs={12}>
            <Paper sx={{ p: 2 }}>
              <TableContainer>
                <Table size="small" sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, width: 50 }} />
                      <TableCell sx={{ fontWeight: 700 }}>Punto de venta</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Cliente</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Sensor</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Valor</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Lecturas</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          No hay sensores para los filtros seleccionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRows.map((row) => {
                        const rowId = String(row.id);
                        const isExpanded = expandedRows.has(rowId);
                        const rowReadings = (row as any).readings || [];
                        
                        return (
                          <>
                            <TableRow key={row.id} sx={{ '& > *': { borderBottom: isExpanded ? 'none' : undefined } }}>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    const newExpanded = new Set(expandedRows);
                                    if (isExpanded) {
                                      newExpanded.delete(rowId);
                                    } else {
                                      newExpanded.add(rowId);
                                    }
                                    setExpandedRows(newExpanded);
                                  }}
                                  disabled={rowReadings.length === 0}
                                >
                                  {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                                </IconButton>
                              </TableCell>
                              <TableCell>{row.puntoVentaName}</TableCell>
                              <TableCell>{row.clientName}</TableCell>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {row.sensorName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {(row as any).sensorTypeDisplay || row.sensorType}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>{row.value != null ? String(row.value) : '—'}</TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={row.worstLevel}
                                  color={
                                    row.worstLevel === 'correctivo'
                                      ? 'error'
                                      : row.worstLevel === 'preventivo'
                                        ? 'warning'
                                        : 'success'
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={String((row as any).readingsCount ?? 0)}
                                  color="info"
                                  variant="outlined"
                                />
                              </TableCell>
                            </TableRow>
                            <TableRow key={`${row.id}-expanded`}>
                              <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                  <Box sx={{ margin: 2 }}>
                                    <Typography variant="h6" gutterBottom component="div">
                                      Historial de lecturas
                                    </Typography>
                                    {rowReadings.length === 0 ? (
                                      <Typography variant="body2" color="text.secondary">
                                        No hay lecturas disponibles para este período
                                      </Typography>
                                    ) : (
                                      <Table size="small" aria-label="readings">
                                        <TableHead>
                                          <TableRow>
                                            <TableCell sx={{ fontWeight: 600 }}>Fecha y Hora</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Valor</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {rowReadings.map((reading: any, idx: number) => {
                                            const timestamp = reading.timestamp || reading.createdAt;
                                            const date = new Date(timestamp);
                                            const formattedDate = date.toLocaleString('es-MX', {
                                              year: 'numeric',
                                              month: '2-digit',
                                              day: '2-digit',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              second: '2-digit',
                                            });
                                            
                                            const metricStatus = evaluateMetricStatus(
                                              reading.value,
                                              row.sensorType,
                                              metricConfigs
                                            );
                                            
                                            return (
                                              <TableRow key={`${row.id}-reading-${idx}`}>
                                                <TableCell>{formattedDate}</TableCell>
                                                <TableCell>{reading.value != null ? String(reading.value) : '—'}</TableCell>
                                                <TableCell>
                                                  <Chip
                                                    size="small"
                                                    label={metricStatus.level}
                                                    color={metricStatus.color}
                                                  />
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    )}
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={tableRowsFilteredByPunto.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10) || 10);
                  setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
                labelRowsPerPage="Filas:"
              />
            </Paper>
          </Grid>
        </Grid>
      </DashboardContent>
    </>
  );
}

export default HomeV2Page;

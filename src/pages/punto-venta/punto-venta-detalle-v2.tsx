import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import { 
  Box,
  Card,
  Chip,
  Grid,
  Alert,
  Button,
  Select,
  Divider,
  MenuItem,
  TextField,
  InputLabel,
  Typography,
  FormControl,
  CircularProgress
} from '@mui/material';

import { fNumber } from 'src/utils/format-number';
import { getDashboardVersion } from 'src/utils/permissions';

import { CONFIG } from 'src/config-global';

import { Chart, useChart } from 'src/components/chart';

export default function PuntoVentaDetalleV2() {
  const { id } = useParams<{ id: string }>();
  const [punto, setPunto] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [chartDataNiveles, setChartDataNiveles] = useState<any>(null);
  const [tiwaterData, setTiwaterData] = useState<any>(null);
  const [metricsConfig, setMetricsConfig] = useState<any[]>([]);
  const [latestSensorTimestamp, setLatestSensorTimestamp] = useState<Date | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [customSensorKey, setCustomSensorKey] = useState<string>('');
  const [customSensorValue, setCustomSensorValue] = useState<string>('');
  const [generatingCustom, setGeneratingCustom] = useState<boolean>(false);

  useEffect(() => {
    const fetchTiwaterData = async (codigoTienda: string) => {
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL_V2}/sensors/tiwater?codigoTienda=${codigoTienda}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setTiwaterData(result.data);
            // Update latest sensor timestamp if available
            if (result.data.timestamp) {
              setLatestSensorTimestamp(new Date(result.data.timestamp));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching tiwater data:', error);
      }
    };

    const fetchLatestSensorData = async (codigoTienda: string) => {
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/sensor-data/latest?codigo_tienda=${codigoTienda}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.timestamp) {
            setLatestSensorTimestamp(new Date(result.data.timestamp));
          }
        }
      } catch (error) {
        console.error('Error fetching latest sensor data:', error);
      }
    };

    const fetchMetricsConfig = async (puntoVentaId: string, clienteId?: string) => {
      try {
        // Fetch metrics for this punto venta or cliente
        let url = `${CONFIG.API_BASE_URL_V2}/metrics`;
        const params = new URLSearchParams();
        if (puntoVentaId) {
          params.append('punto_venta_id', puntoVentaId);
        }
        if (clienteId) {
          params.append('clientId', clienteId);
        }
        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          // API may return array directly or wrapped in { data } / { success, data }
          const list = Array.isArray(result) ? result : (result?.data ?? []);
          if (Array.isArray(list) && list.length > 0) {
            setMetricsConfig(list);
          }
        }
      } catch (error) {
        console.error('Error fetching metrics config:', error);
      }
    };

    const fetchPuntoVentaDetails = async (bustCache = false) => {
      try {
        // Use v2.0 endpoint for PostgreSQL data (supports both id and codigo_tienda)
        const url = `${CONFIG.API_BASE_URL_V2}/puntoVentas/${id}${bustCache ? `?_t=${Date.now()}` : ''}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const puntoData = result.data || result;
        setPunto(puntoData);
        
        // Preparar datos de gráficas para niveles
        prepareChartDataNiveles(puntoData, setChartDataNiveles);
        
        // Debug: Verificar datos históricos
        const tiwaterProd = puntoData?.productos?.find((p: any) => p.product_type === 'TIWater');
        if (tiwaterProd) {
          console.log('[PuntoVentaDetalleV2] Producto TIWater encontrado:', {
            id: tiwaterProd.id,
            hasHistorico: !!tiwaterProd.historico,
            hasHistoricoDiario: !!tiwaterProd.historico_diario,
            historicoHours: tiwaterProd.historico?.hours_with_data?.length || 0
          });
        }
        
        // Fetch tiwater sensor data if we have codigo_tienda
        const codigoTienda = puntoData.codigo_tienda || id;
        if (codigoTienda) {
          fetchTiwaterData(codigoTienda);
          fetchLatestSensorData(codigoTienda);
        }
        
        // Fetch metrics configuration for this punto venta
        const puntoVentaId = puntoData.id || puntoData._id;
        const clienteId = puntoData.cliente?.id || puntoData.cliente?._id || puntoData.cliente;
        if (puntoVentaId || clienteId) {
          fetchMetricsConfig(puntoVentaId, clienteId);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching punto venta details:', error);
        setLoading(false);
      }
    };

    if (id) {
      fetchPuntoVentaDetails();
      // Refresh every 30 seconds
      const interval = setInterval(() => {
        fetchPuntoVentaDetails();
      }, 30000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [id]);

  if (loading || !punto) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  const osmosis = punto.productos?.filter((p: any) => p.product_type === 'Osmosis') || [];
  const niveles = punto.productos?.filter((p: any) => p.product_type === 'Nivel') || [];
  const metricas = punto.productos?.filter((p: any) => p.product_type === 'Metrica') || [];
  const tiwaterProduct = punto.productos?.find((p: any) => p.product_type === 'TIWater') || null;
  
  // Debug: Verificar que el producto TIWater se encontró
  if (tiwaterProduct) {
    console.log('[PuntoVentaDetalleV2] Producto TIWater encontrado:', tiwaterProduct);
    console.log('[PuntoVentaDetalleV2] Status del producto:', tiwaterProduct.status);
  }

  // Dev mode: from API (dev_mode column) or fallback to localStorage
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role?.name === 'admin' || user?.role === 'admin';
  const devModeKey = `devMode_${id}`;
  const showDev = punto?.dev_mode === true || localStorage.getItem(devModeKey) === 'true';
  const showDevDropdown = showDev && isAdmin;

  const handleGenerateScenario = async () => {
    if (!selectedScenario) {
      console.warn('[Dev] No scenario selected');
      return;
    }

    if (selectedScenario === 'generate-daily-data') {
      setGenerating(true);
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/puntoVentas/${id}/generate-daily-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        const result = await response.json();
        
        if (result.success) {
          console.log('[Dev] Datos diarios generados:', result);
          alert(`✅ ${result.message}\n\nPublicados: ${result.data.published}/24 mensajes\nTopic: ${result.data.topic}`);
          window.location.reload();
        } else {
          console.error('[Dev] Error generando datos:', result);
          alert(`❌ Error: ${result.message}`);
        }
      } catch (error) {
        console.error('[Dev] Error en la petición:', error);
        alert('❌ Error al generar datos diarios. Verifica la consola para más detalles.');
      } finally {
        setGenerating(false);
      }
      return;
    }

    if (selectedScenario === 'simulate-low-cruda') {
      setGenerating(true);
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/puntoVentas/${id}/simulate-bajo-nivel-cruda`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        const result = await response.json();

        if (result.success) {
          console.log('[Dev] Bajo nivel cruda simulado:', result);
          alert(`✅ ${result.message}\n\nNivel agua cruda: ${result.data?.nivelCrudaPercent ?? 65}%`);
          try {
            const res = await fetch(`${CONFIG.API_BASE_URL_V2}/puntoVentas/${id}?_t=${Date.now()}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
              const json = await res.json();
              const puntoData = json.data || json;
              setPunto(puntoData);
              prepareChartDataNiveles(puntoData, setChartDataNiveles);
            }
          } catch (_) { /* ignore */ }
        } else {
          console.error('[Dev] Error simulando bajo nivel:', result);
          alert(`❌ Error: ${result.message}`);
        }
      } catch (error) {
        console.error('[Dev] Error en la petición:', error);
        alert('❌ Error al simular bajo nivel de agua cruda. Verifica la consola.');
      } finally {
        setGenerating(false);
      }
      return;
    }

    if (selectedScenario === 'simulate-nivel-cruda-normalizado') {
      setGenerating(true);
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/puntoVentas/${id}/simulate-nivel-cruda-normalizado`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        const result = await response.json();

        if (result.success) {
          console.log('[Dev] Nivel cruda normalizado simulado:', result);
          alert(`✅ ${result.message}\n\nNivel agua cruda: ${result.data?.nivelCrudaPercent ?? 85}%`);
          try {
            const res = await fetch(`${CONFIG.API_BASE_URL_V2}/puntoVentas/${id}?_t=${Date.now()}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
              const json = await res.json();
              const puntoData = json.data || json;
              setPunto(puntoData);
              prepareChartDataNiveles(puntoData, setChartDataNiveles);
            }
          } catch (_) { /* ignore */ }
        } else {
          console.error('[Dev] Error simulando nivel cruda normalizado:', result);
          alert(`❌ Error: ${result.message}`);
        }
      } catch (error) {
        console.error('[Dev] Error en la petición:', error);
        alert('❌ Error al simular nivel agua cruda normalizado. Verifica la consola.');
      } finally {
        setGenerating(false);
      }
      return;
    }

    console.log('[Dev] Generating scenario:', selectedScenario);
  };

  /** Sensor options for custom simulate (same keys as API / dev scenarios MQTT) */
  const CUSTOM_SENSOR_OPTIONS: { value: string; label: string }[] = [
    { value: 'CAUDAL PURIFICADA', label: 'Caudal Purificada' },
    { value: 'CAUDAL RECUPERACION', label: 'Caudal Recuperación' },
    { value: 'CAUDAL RECHAZO', label: 'Caudal Rechazo' },
    { value: 'NIVEL PURIFICADA', label: 'Nivel Purificada' },
    { value: 'NIVEL CRUDA', label: 'Nivel Cruda' },
    { value: 'PORCENTAJE NIVEL PURIFICADA', label: 'Porcentaje Nivel Purificada' },
    { value: 'PORCENTAJE NIVEL CRUDA', label: 'Porcentaje Nivel Cruda' },
    { value: 'CAUDAL CRUDA', label: 'Caudal Cruda' },
    { value: 'ACUMULADO CRUDA', label: 'Acumulado Cruda' },
    { value: 'CAUDAL CRUDA L/min', label: 'Caudal Cruda (L/min)' },
    { value: 'vida', label: 'Vida' },
    { value: 'PRESION CO2', label: 'Presión CO2' },
    { value: 'ch1', label: 'Corriente ch1' },
    { value: 'ch2', label: 'Corriente ch2' },
    { value: 'ch3', label: 'Corriente ch3' },
    { value: 'ch4', label: 'Corriente ch4' },
    { value: 'EFICIENCIA', label: 'Eficiencia' }
  ];

  const handleCustomSensorGenerate = async () => {
    if (!customSensorKey) {
      console.warn('[Dev] No custom sensor selected');
      return;
    }
    const numValue = Number(customSensorValue);
    if (customSensorValue === '' || Number.isNaN(numValue)) {
      alert('Ingresa un valor numérico para el sensor.');
      return;
    }
    setGeneratingCustom(true);
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/puntoVentas/${id}/simulate-sensor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ sensorKey: customSensorKey, value: numValue })
      });
      const result = await response.json();
      if (result.success) {
        alert(`✅ ${result.message}\n\nSensor: ${result.data?.sensorKey}\nValor: ${result.data?.value}`);
        window.location.reload();
      } else {
        alert(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      console.error('[Dev] Error simulating custom sensor:', error);
      alert('❌ Error al enviar valor. Verifica la consola.');
    } finally {
      setGeneratingCustom(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{`Detalle Punto de Venta V2 - ${CONFIG.appName}`}</title>
      </Helmet>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            component="a"
            href={getDashboardVersion() === 'v1' ? '/v1/PuntoVenta' : '/PuntoVenta'}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              padding: '8px 16px',
              borderRadius: '4px',
              textDecoration: 'none',
              '&:hover': {
                backgroundColor: 'primary.light',
                color: 'white',
              },
            }}
          >
            Volver a Puntos de Venta
          </Button>
          
          {/* Dev Dropdown - Only visible for admin && showDev */}
          {showDevDropdown && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 300 }}>
                  <InputLabel>Dev Scenarios</InputLabel>
                  <Select
                    value={selectedScenario}
                    label="Dev Scenarios"
                    onChange={(e) => {
                      setSelectedScenario(e.target.value);
                    }}
                  >
                    <MenuItem value="generate-daily-data">
                      Generar datos diarios (24 horas)
                    </MenuItem>
                    <MenuItem value="simulate-low-cruda">
                      Simular bajo nivel de agua cruda
                    </MenuItem>
                    <MenuItem value="simulate-nivel-cruda-normalizado">
                      Simular nivel agua cruda normalizado
                    </MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleGenerateScenario}
                  disabled={!selectedScenario || generating}
                >
                  {generating ? 'Generando...' : 'Generar'}
                </Button>
              </Box>
              {/* Custom sensor value - same validation as dev scenarios, same MQTT format */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 260 }}>
                  <InputLabel>Sensor</InputLabel>
                  <Select
                    value={customSensorKey}
                    label="Sensor"
                    onChange={(e) => setCustomSensorKey(e.target.value)}
                  >
                    {CUSTOM_SENSOR_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  label="Valor"
                  type="number"
                  value={customSensorValue}
                  onChange={(e) => setCustomSensorValue(e.target.value)}
                  placeholder="Ej. 65"
                  sx={{ width: 120 }}
                  inputProps={{ inputMode: 'decimal', step: 'any' }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleCustomSensorGenerate}
                  disabled={!customSensorKey || customSensorValue === '' || generatingCustom}
                >
                  {generatingCustom ? 'Enviando...' : 'Generar'}
                </Button>
              </Box>
            </Box>
          )}
        </Box>
        <Divider sx={{ borderStyle: 'dashed', my: 2 }} />

        {/* Título de la tienda */}
        <Typography variant="h4" align="center" fontWeight="bold" sx={{ mb: 3 }}>
          {punto.name || 'NOMBRE TIENDA'}
        </Typography>

        {/* Grid Principal Reorganizado */}
        <Grid container spacing={3}>
          {/* Top: Unified Overview Card (Estado + Osmosis + Map) */}
          <Grid item xs={12}>
            <UnifiedOverviewCard 
              punto={punto}
              latestSensorTimestamp={latestSensorTimestamp}
              osmosis={osmosis}
              metricas={metricas}
              tiwaterData={tiwaterData}
              tiwaterProduct={tiwaterProduct}
              metricsConfig={metricsConfig}
            />
          </Grid>

          {/* Middle: Máquinas */}
          <Grid item xs={12}>
            <MaquinasCard 
              tiwaterData={tiwaterData}
              tiwaterProduct={tiwaterProduct}
              metricsConfig={metricsConfig}
            />
          </Grid>

          {/* Bottom: Almacenamiento (Layout horizontal) */}
          <Grid item xs={12}>
            <AlmacenamientoCard 
              niveles={niveles} 
              chartDataNiveles={chartDataNiveles}
              tiwaterData={tiwaterData}
              tiwaterProduct={tiwaterProduct}
              metricsConfig={metricsConfig}
            />
          </Grid>
        </Grid>
      </Box>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Función para preparar datos de gráficas de niveles */
/* -------------------------------------------------------------------------- */

function prepareChartDataNiveles(puntoData: any, setChartDataNiveles: any) {
  // Incluir tanto productos Nivel como TIWater
  const niveles = puntoData?.productos?.filter((p: any) => p.product_type === 'Nivel') || [];
  const tiwaterProducts = puntoData?.productos?.filter((p: any) => p.product_type === 'TIWater') || [];
  const allProducts = [...niveles, ...tiwaterProducts];
  
  console.log('[prepareChartDataNiveles] Productos encontrados:', {
    nivelesCount: niveles.length,
    tiwaterCount: tiwaterProducts.length,
    totalCount: allProducts.length
  });
  
  if (allProducts.length === 0) {
    setChartDataNiveles(null);
    return;
  }

  // Procesar productos que tengan histórico (purificada, recuperada o cruda)
  const chartDataArray: any[] = [];
  
  allProducts.forEach((product: any) => {
    const hasHistoricoPurificada = product.historico?.hours_with_data && Array.isArray(product.historico.hours_with_data) && product.historico.hours_with_data.length > 0;
    const hasHistoricoRecuperada = product.historico_recuperada?.hours_with_data && Array.isArray(product.historico_recuperada.hours_with_data) && product.historico_recuperada.hours_with_data.length > 0;
    const hasHistoricoCruda = product.historico_cruda?.hours_with_data && Array.isArray(product.historico_cruda.hours_with_data) && product.historico_cruda.hours_with_data.length > 0;
    
    console.log(`[prepareChartDataNiveles] Producto ${product.id} (${product.product_type}):`, {
      hasHistoricoPurificada: !!product.historico,
      hasHistoricoRecuperada: !!product.historico_recuperada,
      hasHistoricoCruda: !!product.historico_cruda,
      hoursWithDataPurificada: product.historico?.hours_with_data?.length || 0,
      hoursWithDataRecuperada: product.historico_recuperada?.hours_with_data?.length || 0,
      hoursWithDataCruda: product.historico_cruda?.hours_with_data?.length || 0
    });
    
    if (hasHistoricoPurificada) {
      const chartDataPurificada = processHistorico(product, product.historico, true, false, false);
      if (chartDataPurificada) chartDataArray.push(chartDataPurificada);
    }
    if (hasHistoricoRecuperada) {
      const chartDataRecuperada = processHistorico(product, product.historico_recuperada, false, true, false);
      if (chartDataRecuperada) chartDataArray.push(chartDataRecuperada);
    }
    if (hasHistoricoCruda) {
      const chartDataCruda = processHistorico(product, product.historico_cruda, false, true, true);
      if (chartDataCruda) chartDataArray.push(chartDataCruda);
    }
  });
  
  function processHistorico(product: any, historico: any, isPurificada: boolean, isCruda: boolean, isHistoricoCruda: boolean) {
    try {
      const hoursWithData = historico.hours_with_data || [];
      
      // Sort hours chronologically (handles both 24h format and 12h AM/PM format)
      const horasOrdenadas = [...hoursWithData].sort((a: any, b: any) => {
        const timeA = a.hora || '00:00';
        const timeB = b.hora || '00:00';
        
        // Convert to 24-hour format for proper sorting
        const to24Hour = (time: string): number => {
          const match = time.match(/(\d{1,2}):(\d{2})(?:\s*)?(a\.?m\.?|p\.?m\.?)?/i);
          if (!match) return 0;
          
          let hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const period = match[3]?.toLowerCase().replace(/\./g, '');
          
          if (period) {
            // 12-hour format with AM/PM
            if (period.includes('p') && hours !== 12) {
              hours += 12;
            } else if (period.includes('a') && hours === 12) {
              hours = 0;
            }
          }
          
          return hours * 60 + minutes; // Return total minutes for comparison
        };
        
        return to24Hour(timeA) - to24Hour(timeB);
      });
      
      const horas = horasOrdenadas.map((h: any) => h.hora || '');
      const nivelPercentData = horasOrdenadas.map((h: any) => {
        const value = Number(h.estadisticas?.liquid_level_percent_promedio) || 0;
        return Math.max(0, Math.min(100, value));
      });

      let valorActual: number | null = null;
      if (product.product_type === 'TIWater') {
        if (isPurificada) {
          const s = product.status?.find((x: any) => x.code === 'level_purificada' || x.code === 'electronivel_purificada');
          valorActual = s?.value != null ? Number(s.value) : null;
        } else if (isHistoricoCruda) {
          const s = product.status?.find((x: any) => x.code === 'level_cruda' || x.code === 'electronivel_cruda');
          valorActual = s?.value != null ? Number(s.value) : null;
        } else if (isCruda) {
          const s = product.status?.find((x: any) => x.code === 'level_recuperada' || x.code === 'electronivel_recuperada');
          valorActual = s?.value != null ? Number(s.value) : null;
        }
      } else {
        const s = product.status?.find((x: any) => x.code === 'liquid_level_percent');
        valorActual = s?.value != null ? Number(s.value) : null;
      }

      const nivelName = isPurificada ? 'Nivel Purificada' : (isHistoricoCruda ? 'Nivel Cruda' : (isCruda ? 'Nivel Recuperada' : product.name));
      return {
        nivelId: product._id || product.id,
        nivelName,
        productType: product.product_type,
        isPurificada,
        isCruda,
        isHistoricoCruda: !!isHistoricoCruda,
        categories: horas,
        series: [{ name: 'Nivel (%)', data: nivelPercentData }],
        estadisticas: { valorActual },
      };
    } catch (error) {
      console.error(`[prepareChartDataNiveles] Error procesando histórico para ${product.id}:`, error);
      return null;
    }
  }

  const result = chartDataArray.length > 0 ? chartDataArray : null;
  console.log('[prepareChartDataNiveles] Resultado final:', {
    chartDataArrayLength: chartDataArray.length,
    result: result ? result.map((r: any) => ({
      nivelId: r.nivelId,
      nivelName: r.nivelName,
      isPurificada: r.isPurificada,
      isCruda: r.isCruda,
      isHistoricoCruda: r.isHistoricoCruda,
      categoriesCount: r.categories?.length || 0
    })) : null
  });
  setChartDataNiveles(result);
}

/* -------------------------------------------------------------------------- */
/* 🧱 Card: Almacenamiento (Bottom-Left) */
/* -------------------------------------------------------------------------- */

/** Find metric that applies to nivel agua cruda (dynamic per punto de venta). Uses first enabled match. */
function findNivelAguaCrudaMetric(metricsConfig: any[]): any {
  if (!metricsConfig || !Array.isArray(metricsConfig)) return null;
  const isNivelCruda = (m: any) =>
    (m.metric_type && String(m.metric_type).toLowerCase() === 'nivel_agua_cruda') ||
    (m.sensor_type && String(m.sensor_type).toLowerCase() === 'nivel_cruda') ||
    (m.metric_name && String(m.metric_name).toUpperCase().includes('NIVEL') && String(m.metric_name).toUpperCase().includes('CRUDA'));
  // Prefer enabled metrics; fallback to any match if none enabled
  const enabled = metricsConfig.find((m: any) => isNivelCruda(m) && m.enabled !== false);
  if (enabled) return enabled;
  return metricsConfig.find((m: any) => isNivelCruda(m)) || null;
}

function findNivelAguaPurificadaMetric(metricsConfig: any[]): any {
  if (!metricsConfig || !Array.isArray(metricsConfig)) return null;
  const isNivelPurificada = (m: any) =>
    (m.metric_type && String(m.metric_type).toLowerCase() === 'nivel_agua_purificada') ||
    (m.sensor_type && String(m.sensor_type).toLowerCase() === 'nivel_purificada') ||
    (m.metric_name && String(m.metric_name).toUpperCase().includes('NIVEL') && String(m.metric_name).toUpperCase().includes('PURIFICADA'));
  // Prefer enabled metrics; fallback to any match if none enabled
  const enabled = metricsConfig.find((m: any) => isNivelPurificada(m) && m.enabled !== false);
  if (enabled) return enabled;
  return metricsConfig.find((m: any) => isNivelPurificada(m)) || null;
}

/** Whether a rule indicates a "normal/good" state (no alert). Uses severity when present, else label. */
function isRuleNormal(rule: any): boolean {
  const s = (rule.severity || '').toLowerCase();
  if (s === 'normal') return true;
  if (s === 'preventivo' || s === 'critico') return false;
  const label = (rule.label || '').trim().replace(/\s+/g, ' ').toLowerCase();
  return (
    label.includes('normal') ||
    label.includes('buen estado') ||
    label.includes('en buen estado') ||
    label.includes('bueno') ||
    label.includes('ok') ||
    label.includes('correcto') ||
    label.includes('adecuado') ||
    label.includes('óptimo') ||
    label.includes('optimo')
  );
}

/** Order for picking worst matching rule when multiple match. */
function ruleSeverityOrder(rule: any): number {
  const s = (rule.severity || '').toLowerCase();
  if (s === 'critico') return 3;
  if (s === 'preventivo') return 2;
  if (s === 'normal') return 1;
  const l = (rule.label || '').toLowerCase();
  if (l.includes('critico') || l.includes('correctivo')) return 3;
  if (l.includes('preventivo')) return 2;
  return 1;
}

/** Get the rule that matches the current value (rules have min/max). Prefer normal rule when multiple match; otherwise worst. */
function getMatchingRule(value: number | null, rules: any[]): { rule: any; isNormal: boolean } | null {
  if (value == null || Number.isNaN(Number(value)) || !rules || rules.length === 0) return null;
  const v = Number(value);
  const matchingRules = rules.filter((rule) => {
    const min = rule.min != null ? Number(rule.min) : null;
    const max = rule.max != null ? Number(rule.max) : null;
    return (min === null || v >= min) && (max === null || v <= max);
  });
  if (matchingRules.length === 0) return null;
  // Prefer a "normal" rule when value falls in a good-state range so we don't show alert
  const normalRule = matchingRules.find((r) => isRuleNormal(r));
  const matched = normalRule ?? matchingRules.reduce((best, rule) => (ruleSeverityOrder(rule) >= ruleSeverityOrder(best) ? rule : best), matchingRules[0]);
  const isNormal = isRuleNormal(matched);
  return { rule: matched, isNormal };
}

function AlmacenamientoCard({ niveles, chartDataNiveles, tiwaterData, tiwaterProduct, metricsConfig }: any) {
  // Procesar datos de TIWater de la misma manera que TiwaterDashboard
  let processedTiwaterData: any = null;
  if (tiwaterData || tiwaterProduct) {
    const hasProductData = tiwaterProduct && tiwaterProduct.status && Array.isArray(tiwaterProduct.status) && tiwaterProduct.status.length > 0;
    const hasRawData = tiwaterData && tiwaterData.raw && Object.keys(tiwaterData.raw).length > 0;
    
    const findStatusValue = (codes: string[], status: any[]) => {
      const found = status?.find((s: any) => 
        codes.some(code => 
          s.code === code || s.label === code ||
          s.code?.toLowerCase() === code.toLowerCase() || 
          s.label?.toLowerCase() === code.toLowerCase()
        )
      );
      return found?.value !== null && found?.value !== undefined ? Number(found.value) : null;
    };

    if (hasProductData) {
      const { status } = tiwaterProduct;
      processedTiwaterData = {
        caudales: {
          purificada: findStatusValue(['Flujo Producción', 'flowrate_speed_1', 'flujo_produccion'], status),
          recuperacion: findStatusValue(['Flujo Recuperación', 'flowrate_recuperacion', 'flujo_recuperacion'], status),
          rechazo: findStatusValue(['Flujo Rechazo', 'flowrate_speed_2', 'flujo_rechazo'], status),
          cruda: findStatusValue(['Caudal Cruda', 'caudal_cruda'], status),
          cruda_lmin: findStatusValue(['Caudal Cruda (L/min)', 'Caudal Cruda L/min', 'caudal_cruda_lmin'], status)
        },
        niveles: {
          purificada_porcentaje: findStatusValue(['Nivel Purificada', 'level_purificada', 'electronivel_purificada'], status),
          cruda_porcentaje: findStatusValue(['Nivel Cruda', 'level_cruda', 'electronivel_cruda'], status) ?? findStatusValue(['Nivel Recuperada', 'level_recuperada', 'electronivel_recuperada'], status)
        }
      };
    } else if (hasRawData && tiwaterData.raw) {
      const { raw } = tiwaterData;
      processedTiwaterData = {
        caudales: {
          purificada: raw['Flujo Producción'] !== undefined ? parseFloat(String(raw['Flujo Producción'])) : null,
          recuperacion: raw['Flujo Recuperación'] !== undefined ? parseFloat(String(raw['Flujo Recuperación'])) : null,
          rechazo: raw['Flujo Rechazo'] !== undefined ? parseFloat(String(raw['Flujo Rechazo'])) : null,
          cruda: raw['Caudal Cruda'] !== undefined ? parseFloat(String(raw['Caudal Cruda'])) : null,
          cruda_lmin: raw['Caudal Cruda (L/min)'] !== undefined ? parseFloat(String(raw['Caudal Cruda (L/min)'])) : null
        },
        niveles: {
          purificada_porcentaje: raw['Nivel Purificada'] !== undefined ? parseFloat(String(raw['Nivel Purificada'])) : null,
          cruda_porcentaje: raw['Nivel Recuperada'] !== undefined ? parseFloat(String(raw['Nivel Recuperada'])) : null
        }
      };
    } else if (tiwaterData) {
      processedTiwaterData = tiwaterData;
    }
  }
  
  // Extraer datos de agua cruda y purificada desde niveles o tiwater
  let aguaCrudaData: any = null;
  let aguaPurificadaData: any = null;

  // Buscar niveles desde productos
  if (niveles && niveles.length > 0) {
    niveles.forEach((nivel: any) => {
      const nivelName = (nivel.name || '').toLowerCase();
      const valorActual = nivel.status?.find((s: any) => s.code === 'liquid_level_percent')?.value;
      
      if (nivelName.includes('cruda') || nivelName.includes('recuperada')) {
        aguaCrudaData = {
          nivel: valorActual,
          chartData: chartDataNiveles?.find((cd: any) => cd.nivelId === nivel._id || cd.nivelId === nivel.id),
          name: nivel.name
        };
      } else if (nivelName.includes('purificada')) {
        aguaPurificadaData = {
          nivel: valorActual,
          chartData: chartDataNiveles?.find((cd: any) => cd.nivelId === nivel._id || cd.nivelId === nivel.id),
          name: nivel.name
        };
      }
    });
  }

  // Buscar datos históricos de TIWater desde chartDataNiveles
  if (tiwaterProduct && chartDataNiveles) {
    console.log('[AlmacenamientoCard] Buscando chartData para TIWater:', {
      tiwaterProductId: tiwaterProduct.id,
      tiwaterProduct_id: tiwaterProduct._id,
      chartDataNivelesLength: Array.isArray(chartDataNiveles) ? chartDataNiveles.length : 0,
      chartDataNiveles
    });
    
    // Obtener valores de nivel desde el status de TIWater (Nivel Cruda % y Nivel Recuperada)
    const nivelPurificada = tiwaterProduct.status?.find((s: any) => 
      s.code === 'level_purificada' || s.code === 'electronivel_purificada'
    );
    const nivelCruda = tiwaterProduct.status?.find((s: any) => 
      s.code === 'level_cruda' || s.label === 'Nivel Cruda'
    );
    const nivelRecuperada = tiwaterProduct.status?.find((s: any) => 
      s.code === 'level_recuperada' || s.code === 'electronivel_recuperada'
    );

    // Obtener el último valor del histórico si está disponible
    const getUltimoValorHistorico = (chartData: any) => {
      if (chartData?.series && chartData.series.length > 0 && chartData.series[0]?.data) {
        const dataArray = chartData.series[0].data;
        if (Array.isArray(dataArray) && dataArray.length > 0) {
          const ultimoValor = dataArray[dataArray.length - 1];
          return ultimoValor !== null && ultimoValor !== undefined ? Number(ultimoValor) : null;
        }
      }
      return null;
    };

    // Buscar chartData de purificada
    if (Array.isArray(chartDataNiveles)) {
      const chartDataPurificada = chartDataNiveles.find((cd: any) => {
        const matchesId = cd.nivelId === tiwaterProduct._id || cd.nivelId === tiwaterProduct.id;
        const matchesType = cd.productType === 'TIWater';
        return (matchesId || matchesType) && cd.isPurificada;
      });

      if (chartDataPurificada && nivelPurificada) {
        const statusPurificada = Number(nivelPurificada.value) || null;
        const ultimoValorHistorico = getUltimoValorHistorico(chartDataPurificada);
        aguaPurificadaData = {
          nivel: statusPurificada ?? ultimoValorHistorico,
          chartData: chartDataPurificada,
          name: 'Nivel Purificada'
        };
        console.log('[AlmacenamientoCard] Asignado chartData a aguaPurificadaData (isPurificada=true)', {
          statusValue: statusPurificada,
          ultimoValorHistorico,
          nivelFinal: aguaPurificadaData.nivel
        });
      }

      // Prefer chart from historico_cruda (Nivel Cruda %); fallback to historico_recuperada
      const matchesProduct = (cd: any) => (cd.nivelId === tiwaterProduct._id || cd.nivelId === tiwaterProduct.id) || cd.productType === 'TIWater';
      const chartDataCruda = chartDataNiveles.find((cd: any) => matchesProduct(cd) && cd.isHistoricoCruda);
      const chartDataRecuperada = chartDataCruda ?? chartDataNiveles.find((cd: any) => matchesProduct(cd) && cd.isCruda);
      const chartDataForCruda = chartDataCruda ?? chartDataRecuperada;

      const nivelCrudaValue = nivelCruda != null ? Number(nivelCruda.value) : null;
      const nivelRecuperadaValue = nivelRecuperada != null ? Number(nivelRecuperada.value) : null;
      const statusValueForCruda = nivelCrudaValue ?? nivelRecuperadaValue;

      if (chartDataForCruda && statusValueForCruda != null) {
        const ultimoValorHistorico = getUltimoValorHistorico(chartDataForCruda);
        aguaCrudaData = {
          nivel: statusValueForCruda ?? ultimoValorHistorico,
          chartData: chartDataForCruda,
          name: chartDataCruda ? 'Nivel Cruda' : (nivelCruda ? 'Nivel Cruda' : 'Nivel Recuperada')
        };
        console.log('[AlmacenamientoCard] Asignado chartData a aguaCrudaData', {
          fromHistoricoCruda: !!chartDataCruda,
          statusValue: statusValueForCruda,
          ultimoValorHistorico,
          nivelFinal: aguaCrudaData.nivel
        });
      } else if (statusValueForCruda != null && !aguaCrudaData?.chartData) {
        aguaCrudaData = {
          nivel: statusValueForCruda,
          chartData: null,
          name: nivelCruda ? 'Nivel Cruda' : 'Nivel Recuperada'
        };
        console.log('[AlmacenamientoCard] Asignado nivel (cruda o recuperada) a aguaCrudaData (sin chartData)');
      }
    }
  }

  // Si hay datos de TIWater procesados, usarlos como fallback o complemento
  if (processedTiwaterData) {
    if (!aguaCrudaData && processedTiwaterData.niveles?.cruda_porcentaje !== null && processedTiwaterData.niveles?.cruda_porcentaje !== undefined) {
      aguaCrudaData = { 
        nivel: processedTiwaterData.niveles.cruda_porcentaje,
        chartData: null // No hay chartData desde processedTiwaterData
      };
    }

    if (!aguaPurificadaData && processedTiwaterData.niveles?.purificada_porcentaje !== null && processedTiwaterData.niveles?.purificada_porcentaje !== undefined) {
      aguaPurificadaData = { 
        nivel: processedTiwaterData.niveles.purificada_porcentaje,
        chartData: null // No hay chartData desde processedTiwaterData
      };
    }
  }

  // Calcular litros (asumiendo tanques de 1000L)
  const calcularLitros = (porcentaje: number) => {
    if (!porcentaje) return 0;
    return Math.round((porcentaje / 100) * 1000);
  };

  // Debug: Verificar datos finales
  console.log('[AlmacenamientoCard] Datos finales:', {
    aguaCrudaData: {
      nivel: aguaCrudaData?.nivel,
      hasChartData: !!aguaCrudaData?.chartData,
      chartDataCategories: aguaCrudaData?.chartData?.categories?.length || 0
    },
    aguaPurificadaData: {
      nivel: aguaPurificadaData?.nivel,
      hasChartData: !!aguaPurificadaData?.chartData,
      chartDataCategories: aguaPurificadaData?.chartData?.categories?.length || 0
    }
  });

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        p: 3, 
        height: '100%', 
        border: '2px solid', 
        borderColor: 'primary.main',
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'box-shadow 0.3s ease',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(250,250,250,0.95) 100%)',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }
      }}
    >
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: 'primary.main' }}>
        Almacenamiento
      </Typography>
      <Divider sx={{ mb: 3, borderWidth: 1 }} />

      {/* Layout horizontal: Agua Cruda | Agua Purificada */}
      <Grid container spacing={3}>
        {/* AGUA CRUDA - Mitad izquierda */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ color: 'primary.dark', mb: 1 }}>
            Agua Cruda
          </Typography>

          {(() => {
            const nivelMetric = findNivelAguaCrudaMetric(metricsConfig || []);
            const value = aguaCrudaData?.nivel != null ? Number(aguaCrudaData.nivel) : null;
            
            // No metric defined → sin metricas definidas
            if (!nivelMetric) {
              return (
                <Alert 
                  severity="success"
                  icon={false}
                  sx={{ 
                    mb: 2,
                    py: 0.5,
                    fontSize: '0.875rem',
                    bgcolor: 'success.lighter',
                    borderLeft: `4px solid`,
                    borderColor: 'success.main'
                  }}
                >
                  valores normales (sin metricas definidas)
                </Alert>
              );
            }
            // Metric defined but no value
            if (value == null) {
              return (
                <Alert 
                  severity="info"
                  icon={false}
                  sx={{ 
                    mb: 2,
                    py: 0.5,
                    fontSize: '0.875rem',
                    bgcolor: 'grey.100',
                    borderLeft: `4px solid`,
                    borderColor: 'grey.400'
                  }}
                >
                  Valor no disponible
                </Alert>
              );
            }
            
            const match = getMatchingRule(value, nivelMetric.rules || []);
            
            console.log('[AlmacenamientoCard] Agua Cruda Alert Check:', {
              nivelMetric,
              value,
              match,
              aguaCrudaData,
              metricsConfig
            });
            
            // Metric defined but value doesn't match any rule → valores normales (metric IS defined)
            if (!match) {
              return (
                <Alert 
                  severity="success"
                  icon={false}
                  sx={{ 
                    mb: 2,
                    py: 0.5,
                    fontSize: '0.875rem',
                    bgcolor: 'success.lighter',
                    borderLeft: `4px solid`,
                    borderColor: 'success.main'
                  }}
                >
                  valores normales ({value.toFixed(1)}${nivelMetric.sensor_unit || '%'})
                </Alert>
              );
            }
            
            const colorUpper = (match.rule.color || '').toUpperCase().replace(/\s/g, '');
            
            // Determine severity based on hex color (most reliable)
            let severity: 'error' | 'warning' | 'success' = 'success';
            let bgColor = 'success.lighter';
            let borderColor = 'success.main';
            
            // Parse hex color to determine severity
            if (colorUpper.startsWith('#') && colorUpper.length >= 7) {
              const r = parseInt(colorUpper.substring(1, 3), 16);
              const g = parseInt(colorUpper.substring(3, 5), 16);
              const b = parseInt(colorUpper.substring(5, 7), 16);
              
              // Error: High red, low green/blue (e.g., #FF5630, #EE0000, #FF0000)
              if (r > 200 && g < 120 && b < 120) {
                severity = 'error';
                bgColor = 'error.lighter';
                borderColor = 'error.main';
              }
              // Warning: High red and green, low blue (e.g., #FFAB00, #FFFF00)
              else if (r > 180 && g > 100 && b < 100) {
                severity = 'warning';
                bgColor = 'warning.lighter';
                borderColor = 'warning.main';
              }
              // Success: High green, lower red (e.g., #00A76F, #00B050)
              else if (g > 100 && r < 150) {
                severity = 'success';
                bgColor = 'success.lighter';
                borderColor = 'success.main';
              }
            }
            
            const alertMessage = (match.rule.message || '').trim() || null;
            const messageLine = alertMessage
              ? `${match.rule.label} (${value.toFixed(1)}${nivelMetric.sensor_unit || '%'}) - ${alertMessage}`
              : `${match.rule.label} (${value.toFixed(1)}${nivelMetric.sensor_unit || '%'})`;
            
            return (
              <Alert 
                severity={severity} 
                icon={false}
                sx={{ 
                  mb: 2,
                  py: 0.5,
                  fontSize: '0.875rem',
                  bgcolor: bgColor,
                  borderLeft: `4px solid`,
                  borderColor
                }}
              >
                {messageLine}
              </Alert>
            );
          })()}

          <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'primary.lighter', border: '1px solid', borderColor: 'primary.main', height: '100%' }}>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  ENTRADA: {processedTiwaterData?.caudales?.cruda_lmin || processedTiwaterData?.caudales?.cruda || '3.0'} L/MIN
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  RECUPERACIÓN: {processedTiwaterData?.caudales?.recuperacion || '2.0'} L/MIN
                </Typography>
              </Grid>
            </Grid>

            {/* Tanque visual SVG */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
              <WaterTankSVG
                percentage={aguaCrudaData?.nivel || 80}
                liters={calcularLitros(aguaCrudaData?.nivel || 80)}
                color="primary"
              />
            </Box>

            {/* Gráfica histórica - siempre visible */}
            <Box sx={{ mt: 2, height: 200 }}>
              {aguaCrudaData?.chartData ? (
                <NivelMiniChart
                  chart={aguaCrudaData.chartData}
                  title="Histórico de Nivel del tanque Agua cruda"
                  metricRules={findNivelAguaCrudaMetric(metricsConfig || [])?.rules}
                />
              ) : (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                  <Typography variant="caption" color="text.secondary" align="center">
                    No hay datos históricos disponibles
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>

        {/* AGUA PURIFICADA - Mitad derecha */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ color: 'info.dark', mb: 1 }}>
            Agua Purificada
          </Typography>

          {(() => {
            const nivelMetric = findNivelAguaPurificadaMetric(metricsConfig || []);
            const value = aguaPurificadaData?.nivel != null ? Number(aguaPurificadaData.nivel) : null;
            
            // No metric defined → sin metricas definidas
            if (!nivelMetric) {
              return (
                <Alert 
                  severity="success"
                  icon={false}
                  sx={{ 
                    mb: 2,
                    py: 0.5,
                    fontSize: '0.875rem',
                    bgcolor: 'success.lighter',
                    borderLeft: `4px solid`,
                    borderColor: 'success.main'
                  }}
                >
                  valores normales (sin metricas definidas)
                </Alert>
              );
            }
            // Metric defined but no value
            if (value == null) {
              return (
                <Alert 
                  severity="info"
                  icon={false}
                  sx={{ 
                    mb: 2,
                    py: 0.5,
                    fontSize: '0.875rem',
                    bgcolor: 'grey.100',
                    borderLeft: `4px solid`,
                    borderColor: 'grey.400'
                  }}
                >
                  Valor no disponible
                </Alert>
              );
            }
            
            const match = getMatchingRule(value, nivelMetric.rules || []);
            
            console.log('[AlmacenamientoCard] Agua Purificada Alert Check:', {
              nivelMetric,
              value,
              match,
              aguaPurificadaData,
              metricsConfig
            });
            
            // Metric defined but value doesn't match any rule → valores normales (metric IS defined)
            if (!match) {
              return (
                <Alert 
                  severity="success"
                  icon={false}
                  sx={{ 
                    mb: 2,
                    py: 0.5,
                    fontSize: '0.875rem',
                    bgcolor: 'success.lighter',
                    borderLeft: `4px solid`,
                    borderColor: 'success.main'
                  }}
                >
                  valores normales ({value.toFixed(1)}${nivelMetric.sensor_unit || '%'})
                </Alert>
              );
            }
            
            const colorUpper = (match.rule.color || '').toUpperCase().replace(/\s/g, '');
            
            // Determine severity based on hex color (most reliable)
            let severity: 'error' | 'warning' | 'success' = 'success';
            let bgColor = 'success.lighter';
            let borderColor = 'success.main';
            
            // Parse hex color to determine severity
            if (colorUpper.startsWith('#') && colorUpper.length >= 7) {
              const r = parseInt(colorUpper.substring(1, 3), 16);
              const g = parseInt(colorUpper.substring(3, 5), 16);
              const b = parseInt(colorUpper.substring(5, 7), 16);
              
              // Error: High red, low green/blue (e.g., #FF5630, #EE0000, #FF0000)
              if (r > 200 && g < 120 && b < 120) {
                severity = 'error';
                bgColor = 'error.lighter';
                borderColor = 'error.main';
              }
              // Warning: High red and green, low blue (e.g., #FFAB00, #FFFF00)
              else if (r > 180 && g > 100 && b < 100) {
                severity = 'warning';
                bgColor = 'warning.lighter';
                borderColor = 'warning.main';
              }
              // Success: High green, lower red (e.g., #00A76F, #00B050)
              else if (g > 100 && r < 150) {
                severity = 'success';
                bgColor = 'success.lighter';
                borderColor = 'success.main';
              }
            }
            
            const alertMessage = (match.rule.message || '').trim() || null;
            const messageLine = alertMessage
              ? `${match.rule.label} (${value.toFixed(1)}${nivelMetric.sensor_unit || '%'}) - ${alertMessage}`
              : `${match.rule.label} (${value.toFixed(1)}${nivelMetric.sensor_unit || '%'})`;
            
            return (
              <Alert 
                severity={severity} 
                icon={false}
                sx={{ 
                  mb: 2,
                  py: 0.5,
                  fontSize: '0.875rem',
                  bgcolor: bgColor,
                  borderLeft: `4px solid`,
                  borderColor
                }}
              >
                {messageLine}
              </Alert>
            );
          })()}

          <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'info.lighter', border: '1px solid', borderColor: 'info.main', height: '100%' }}>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  ENTRADA: {processedTiwaterData?.caudales?.purificada || '2.5'} L/MIN
                </Typography>
              </Grid>
            </Grid>

            {/* Tanque visual SVG */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
              <WaterTankSVG
                percentage={aguaPurificadaData?.nivel || 90}
                liters={calcularLitros(aguaPurificadaData?.nivel || 90)}
                color="info"
              />
            </Box>

            {/* Gráfica histórica - siempre visible */}
            <Box sx={{ mt: 2, height: 200 }}>
              {aguaPurificadaData?.chartData ? (
                <NivelMiniChart
                  chart={aguaPurificadaData.chartData}
                  title="Histórico de Nivel del tanque Agua purificada"
                  metricRules={findNivelAguaPurificadaMetric(metricsConfig || [])?.rules}
                />
              ) : (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                  <Typography variant="caption" color="text.secondary" align="center">
                    No hay datos históricos disponibles
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Card: Unified Overview (Estado + Osmosis in one card) */
/* -------------------------------------------------------------------------- */

function UnifiedOverviewCard({ punto, latestSensorTimestamp, osmosis, metricas, tiwaterData, tiwaterProduct, metricsConfig }: any) {
  // State to force re-render every minute
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);
  
  // Calculate online status
  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  let isOnline = false;
  let timeSinceLastData: string | null = null;
  
  if (punto.online !== undefined && punto.online !== null) {
    isOnline = punto.online;
  } else if (latestSensorTimestamp || punto.latestSensorTimestamp) {
    const timestamp = latestSensorTimestamp || punto.latestSensorTimestamp;
    const timestampMs = new Date(timestamp).getTime();
    const diffMs = currentTime - timestampMs;
    isOnline = diffMs <= FIVE_MINUTES_MS;
  }
  
  const displayTimestamp = punto.latestSensorTimestamp || latestSensorTimestamp;
  if (displayTimestamp) {
    const timestampMs = new Date(displayTimestamp).getTime();
    const diffMs = currentTime - timestampMs;
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      timeSinceLastData = `${hours}h`;
    } else if (minutes > 0) {
      timeSinceLastData = `${minutes}min`;
    } else {
      timeSinceLastData = 'ahora';
    }
  }
  
  // Get osmosis data
  let osmosisData: any = null;
  if (osmosis && osmosis.length > 0) {
    const p = osmosis[0];
    const flowRate1 = p.status?.find((s: any) => s.code === 'flowrate_speed_1')?.value;
    const flowRate2 = p.status?.find((s: any) => s.code === 'flowrate_speed_2')?.value;
    const totalFlujo = (flowRate1 || 0) + (flowRate2 || 0);
    const eficiencia = totalFlujo > 0 ? ((flowRate1 || 0) / totalFlujo * 100).toFixed(1) : null;
    osmosisData = { produccion: flowRate1, rechazo: flowRate2, eficiencia };
  }
  
  if (!osmosisData && (tiwaterData || tiwaterProduct)) {
    const findStatusValue = (codes: string[], status: any[]) => {
      const found = status?.find((s: any) => 
        codes.some(code => s.code === code || s.label === code || s.code?.toLowerCase() === code.toLowerCase() || s.label?.toLowerCase() === code.toLowerCase())
      );
      return found?.value !== null && found?.value !== undefined ? Number(found.value) : null;
    };
    const status = tiwaterProduct?.status || [];
    const produccion = findStatusValue(['Flujo Producción', 'flowrate_speed_1', 'flujo_produccion'], status) || tiwaterData?.caudales?.purificada;
    const rechazo = findStatusValue(['Flujo Rechazo', 'flowrate_speed_2', 'flujo_rechazo'], status) || tiwaterData?.caudales?.rechazo;
    const total = (produccion || 0) + (rechazo || 0);
    const eficiencia = total > 0 ? ((produccion || 0) / total * 100).toFixed(1) : null;
    osmosisData = { produccion, rechazo, eficiencia };
  }
  
  // Helper to get metric alert info
  const getMetricAlertInfo = (value: number | null | undefined, metricName: string) => {
    const metricTypeMap: { [key: string]: string } = {
      'PRODUCCION': 'produccion',
      'RECHAZO': 'rechazo',
      'EFICIENCIA': 'eficiencia'
    };
    
    const metricConfig = metricsConfig?.find((m: any) => {
      const metricType = metricTypeMap[metricName] || metricName.toLowerCase();
      return (
        m.metric_name?.toLowerCase() === metricName.toLowerCase() ||
        m.sensor_type?.toLowerCase() === metricName.toLowerCase() ||
        m.metric_type?.toLowerCase() === metricType ||
        (metricName === 'PRODUCCION' && (m.metric_type === 'produccion' || m.sensor_type === 'flujo_produccion')) ||
        (metricName === 'RECHAZO' && (m.metric_type === 'rechazo' || m.sensor_type === 'flujo_rechazo')) ||
        (metricName === 'EFICIENCIA' && m.metric_type === 'eficiencia')
      );
    });
    
    // No metric defined
    if (!metricConfig || !metricConfig.rules || metricConfig.rules.length === 0) {
      return {
        label: 'valores normales (sin metricas definidas)',
        message: '',
        severity: 'success' as const,
        bgColor: 'success.lighter',
        borderColor: 'success.main'
      };
    }
    
    // Metric defined but no value
    if (value === null || value === undefined) {
      return {
        label: 'Valor no disponible',
        message: '',
        severity: 'info' as const,
        bgColor: 'grey.100',
        borderColor: 'grey.400'
      };
    }
    
    const match = metricConfig.rules.find((rule: any) => {
      const min = rule.min !== null && rule.min !== undefined ? rule.min : -Infinity;
      const max = rule.max !== null && rule.max !== undefined ? rule.max : Infinity;
      return value >= min && value <= max;
    });
    
    // Metric defined but value doesn't match any rule → valores normales (metric IS defined)
    if (!match) {
      return {
        label: 'valores normales',
        message: '',
        severity: 'success' as const,
        bgColor: 'success.lighter',
        borderColor: 'success.main'
      };
    }
    
    const colorUpper = (match.color || '').toUpperCase().replace(/\s/g, '');
    let severity: 'error' | 'warning' | 'success' = 'success';
    let bgColor = 'success.lighter';
    let borderColor = 'success.main';
    
    if (colorUpper.startsWith('#')) {
      const r = parseInt(colorUpper.substring(1, 3), 16);
      const g = parseInt(colorUpper.substring(3, 5), 16);
      const b = parseInt(colorUpper.substring(5, 7), 16);
      
      if (r > 200 && g < 100 && b < 100) {
        severity = 'error';
        bgColor = 'error.lighter';
        borderColor = 'error.main';
      } else if (r > 200 && g > 200 && b < 100) {
        severity = 'warning';
        bgColor = 'warning.lighter';
        borderColor = 'warning.main';
      } else if (g > 100 && r < 100) {
        severity = 'success';
        bgColor = 'success.lighter';
        borderColor = 'success.main';
      }
    }
    
    return {
      label: match.label,
      message: match.message,
      severity,
      bgColor,
      borderColor
    };
  };
  
  const produccionAlert = getMetricAlertInfo(osmosisData?.produccion, 'PRODUCCION');
  const rechazoAlert = getMetricAlertInfo(osmosisData?.rechazo, 'RECHAZO');
  const eficienciaAlert = getMetricAlertInfo(parseFloat(osmosisData?.eficiencia), 'EFICIENCIA');
  
  return (
    <Card variant="outlined" sx={{ p: 3, border: '2px solid', borderColor: 'divider', borderRadius: 2 }}>
      {/* Header with store name, location, client and status */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
            {punto.name || 'Tienda'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {punto.city?.city || 'Hermosillo'}, {punto.city?.state || 'Sonora'}
            {punto.cliente?.name && ` • ${punto.cliente.name}`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderRadius: 1, bgcolor: isOnline ? 'success.lighter' : 'error.lighter' }}>
          <Box sx={{ 
            width: 8, 
            height: 8, 
            borderRadius: '50%', 
            bgcolor: isOnline ? 'success.main' : 'error.main',
            animation: isOnline ? 'pulse 2s infinite' : 'none',
            '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.7 } }
          }} />
          <Typography variant="body2" fontWeight="600" color={isOnline ? 'success.dark' : 'error.dark'}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Typography>
          {timeSinceLastData && (
            <Typography variant="caption" color="text.secondary">
              ({timeSinceLastData})
            </Typography>
          )}
        </Box>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      <Grid container spacing={3}>
        {/* Left: Osmosis Metrics with Alerts - EXPANDED */}
        <Grid item xs={12} md={9}>
          <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            💧 Osmosis Inversa
          </Typography>
          
          {/* Metrics Summary with Alerts Below Each */}
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'grey.100', textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Producción
                </Typography>
                <Typography variant="h5" fontWeight="600">
                  {osmosisData?.produccion !== null && osmosisData?.produccion !== undefined ? osmosisData.produccion.toFixed(1) : '--'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  L/MIN
                </Typography>
              </Box>
              {produccionAlert && (
                <Alert 
                  severity={produccionAlert.severity}
                  icon={false}
                  sx={{ 
                    mt: 1,
                    py: 0.5,
                    fontSize: '0.875rem',
                    bgcolor: produccionAlert.bgColor,
                    borderLeft: `4px solid`,
                    borderColor: produccionAlert.borderColor
                  }}
                >
                  <strong>{produccionAlert.label}</strong>
                  {osmosisData?.produccion !== null && osmosisData?.produccion !== undefined && ` (${osmosisData.produccion.toFixed(1)} L/MIN)`}
                  {produccionAlert.message && ` - ${produccionAlert.message}`}
                </Alert>
              )}
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'grey.100', textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Rechazo
                </Typography>
                <Typography variant="h5" fontWeight="600">
                  {osmosisData?.rechazo !== null && osmosisData?.rechazo !== undefined ? osmosisData.rechazo.toFixed(1) : '--'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  L/MIN
                </Typography>
              </Box>
              {rechazoAlert && (
                <Alert 
                  severity={rechazoAlert.severity}
                  icon={false}
                  sx={{ 
                    mt: 1,
                    py: 0.5,
                    fontSize: '0.875rem',
                    bgcolor: rechazoAlert.bgColor,
                    borderLeft: `4px solid`,
                    borderColor: rechazoAlert.borderColor
                  }}
                >
                  <strong>{rechazoAlert.label}</strong>
                  {osmosisData?.rechazo !== null && osmosisData?.rechazo !== undefined && ` (${osmosisData.rechazo.toFixed(1)} L/MIN)`}
                  {rechazoAlert.message && ` - ${rechazoAlert.message}`}
                </Alert>
              )}
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'grey.100', textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Eficiencia
                </Typography>
                <Typography variant="h5" fontWeight="600">
                  {osmosisData?.eficiencia !== null && osmosisData?.eficiencia !== undefined ? osmosisData.eficiencia : '--'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  %
                </Typography>
              </Box>
              {eficienciaAlert && (
                <Alert 
                  severity={eficienciaAlert.severity}
                  icon={false}
                  sx={{ 
                    mt: 1,
                    py: 0.5,
                    fontSize: '0.875rem',
                    bgcolor: eficienciaAlert.bgColor,
                    borderLeft: `4px solid`,
                    borderColor: eficienciaAlert.borderColor
                  }}
                >
                  <strong>{eficienciaAlert.label}</strong>
                  {osmosisData?.eficiencia !== null && osmosisData?.eficiencia !== undefined && ` (${osmosisData.eficiencia}%)`}
                  {eficienciaAlert.message && ` - ${eficienciaAlert.message}`}
                </Alert>
              )}
            </Grid>
          </Grid>
        </Grid>
        
        {/* Right: Map - FULL HEIGHT */}
        <Grid item xs={12} md={3}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Ubicación
          </Typography>
          <Box sx={{ width: '100%', height: 'calc(100% - 28px)', minHeight: 200, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
            <iframe
              title="Ubicación en Google Maps"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              src={`https://www.google.com/maps?q=${punto.city?.lat || 29.0729},${punto.city?.lon || -110.9559}&z=14&output=embed`}
            />
          </Box>
        </Grid>
      </Grid>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Card: Máquinas (separate card below Osmosis) */
/* -------------------------------------------------------------------------- */

function MaquinasCard({ tiwaterData, tiwaterProduct, metricsConfig }: any) {
  // Extraer corrientes para las máquinas
  const getCorriente = (ch: string) => {
    if (tiwaterData?.corrientes) {
      return tiwaterData.corrientes[ch] || null;
    }
    if (tiwaterProduct?.status) {
      const found = tiwaterProduct.status.find((s: any) => 
        s.code?.toLowerCase().includes(ch.toLowerCase()) || 
        s.label?.toLowerCase().includes(ch.toLowerCase())
      );
      return found?.value ? Number(found.value) : null;
    }
    return null;
  };

  // Extraer presión CO2
  const getPresionCO2 = () => {
    if (tiwaterData?.presiones?.co2) return tiwaterData.presiones.co2;
    if (tiwaterProduct?.status) {
      const found = tiwaterProduct.status.find((s: any) => 
        s.code?.toLowerCase().includes('presion') || 
        s.code?.toLowerCase().includes('co2') ||
        s.label?.toLowerCase().includes('presion') ||
        s.label?.toLowerCase().includes('co2')
      );
      return found?.value ? Number(found.value) : null;
    }
    return null;
  };

  const ch1 = getCorriente('ch1') || 3.32;
  const ch2 = getCorriente('ch2') || 2.32;
  const ch3 = getCorriente('ch3') || 3.32;
  const ch4 = getCorriente('ch4') || 2.32;
  const presionCO2 = getPresionCO2() || 320.79;
  
  // Calculate average for each machine
  const nieveAvg = ((ch1 + ch2) / 2);
  const frappeAvg = ((ch3 + ch4) / 2);

  // Helper to get metric alert for machines
  const getMachineAlert = (value: number | null | undefined, metricType: string) => {
    if (!metricsConfig) {
      return {
        label: 'valores normales (sin metricas definidas)',
        message: '',
        severity: 'success' as const,
        bgColor: 'success.lighter',
        borderColor: 'success.main'
      };
    }
    
    const metricConfig = metricsConfig.find((m: any) => {
      const metricTypeLower = (m.metric_type || '').toLowerCase();
      
      // Match specific machine metric types
      if (metricType === 'amperaje_nieve') {
        return metricTypeLower === 'amperaje_nieve' || metricTypeLower === 'amperaje_maquina_nieve';
      }
      if (metricType === 'amperaje_frappe') {
        return metricTypeLower === 'amperaje_frappe' || metricTypeLower === 'amperaje_maquina_frapee';
      }
      if (metricType === 'co2') {
        return metricTypeLower === 'co2' || metricTypeLower === 'presion_co2';
      }
      return false;
    });
    
    // No metric defined
    if (!metricConfig || !metricConfig.rules || metricConfig.rules.length === 0) {
      return {
        label: 'valores normales (sin metricas definidas)',
        message: '',
        severity: 'success' as const,
        bgColor: 'success.lighter',
        borderColor: 'success.main'
      };
    }
    
    // Metric defined but no value
    if (value === null || value === undefined) {
      return {
        label: 'Valor no disponible',
        message: '',
        severity: 'info' as const,
        bgColor: 'grey.100',
        borderColor: 'grey.400'
      };
    }
    
    const match = metricConfig.rules.find((rule: any) => {
      const min = rule.min !== null && rule.min !== undefined ? rule.min : -Infinity;
      const max = rule.max !== null && rule.max !== undefined ? rule.max : Infinity;
      return value >= min && value <= max;
    });
    
    // Metric defined but value doesn't match any rule → valores normales (metric IS defined)
    if (!match) {
      return {
        label: 'valores normales',
        message: '',
        severity: 'success' as const,
        bgColor: 'success.lighter',
        borderColor: 'success.main'
      };
    }
    
    const colorUpper = (match.color || '').toUpperCase().replace(/\s/g, '');
    let severity: 'error' | 'warning' | 'success' = 'success';
    let bgColor = 'success.lighter';
    let borderColor = 'success.main';
    
    if (colorUpper.startsWith('#') && colorUpper.length >= 7) {
      const r = parseInt(colorUpper.substring(1, 3), 16);
      const g = parseInt(colorUpper.substring(3, 5), 16);
      const b = parseInt(colorUpper.substring(5, 7), 16);
      
      // Error: High red, low green/blue (e.g., #FF5630, #EE0000, #FF0000)
      if (r > 200 && g < 120 && b < 120) {
        severity = 'error';
        bgColor = 'error.lighter';
        borderColor = 'error.main';
      }
      // Warning: High red and green, low blue (e.g., #FFAB00, #FFFF00)
      else if (r > 180 && g > 100 && b < 100) {
        severity = 'warning';
        bgColor = 'warning.lighter';
        borderColor = 'warning.main';
      }
      // Success: High green, lower red (e.g., #00A76F, #00B050)
      else if (g > 100 && r < 150) {
        severity = 'success';
        bgColor = 'success.lighter';
        borderColor = 'success.main';
      }
    }
    
    return {
      label: match.label,
      message: match.message,
      severity,
      bgColor,
      borderColor
    };
  };
  
  const nieveAlert = getMachineAlert(nieveAvg, 'amperaje_nieve');
  const frappeAlert = getMachineAlert(frappeAvg, 'amperaje_frappe');
  const co2Alert = getMachineAlert(presionCO2, 'co2');

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        p: 3, 
        border: '2px solid', 
        borderColor: 'divider',
        borderRadius: 2
      }}
    >
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
        ⚙️ Máquinas
      </Typography>

      <Grid container spacing={3}>
        {/* Máquina Nieve */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 2, borderRadius: 2, bgcolor: 'background.neutral' }}>
            <Box 
              sx={{ 
                width: 56, 
                height: 56, 
                borderRadius: '50%', 
                bgcolor: 'warning.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.5rem'
              }}
            >
              🍦
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Máquina Nieve
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {nieveAvg.toFixed(2)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Izq: {ch1.toFixed(1)}A • Der: {ch2.toFixed(1)}A
                </Typography>
              </Box>
            </Box>
          </Box>
          {nieveAlert && (
            <Alert 
              severity={nieveAlert.severity}
              icon={false}
              sx={{ 
                mt: 1,
                py: 0.5,
                fontSize: '0.875rem',
                bgcolor: nieveAlert.bgColor,
                borderLeft: `4px solid`,
                borderColor: nieveAlert.borderColor
              }}
            >
              <strong>{nieveAlert.label}</strong>
              {nieveAvg !== null && nieveAvg !== undefined && ` (${nieveAvg.toFixed(2)}A)`}
              {nieveAlert.message && ` - ${nieveAlert.message}`}
            </Alert>
          )}
        </Grid>

        {/* Máquina Frappe */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 2, borderRadius: 2, bgcolor: 'background.neutral' }}>
            <Box 
              sx={{ 
                width: 56, 
                height: 56, 
                borderRadius: '50%', 
                bgcolor: 'info.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.5rem'
              }}
            >
              🥤
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Máquina Frappe
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {frappeAvg.toFixed(2)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Izq: {ch3.toFixed(1)}A • Der: {ch4.toFixed(1)}A
                </Typography>
              </Box>
            </Box>
          </Box>
          {frappeAlert && (
            <Alert 
              severity={frappeAlert.severity}
              icon={false}
              sx={{ 
                mt: 1,
                py: 0.5,
                fontSize: '0.875rem',
                bgcolor: frappeAlert.bgColor,
                borderLeft: `4px solid`,
                borderColor: frappeAlert.borderColor
              }}
            >
              <strong>{frappeAlert.label}</strong>
              {frappeAvg !== null && frappeAvg !== undefined && ` (${frappeAvg.toFixed(2)}A)`}
              {frappeAlert.message && ` - ${frappeAlert.message}`}
            </Alert>
          )}
        </Grid>

        {/* Máquina Carbonatada */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 2, borderRadius: 2, bgcolor: 'background.neutral' }}>
            <Box 
              sx={{ 
                width: 56, 
                height: 56, 
                borderRadius: '50%', 
                bgcolor: 'success.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.5rem'
              }}
            >
              💨
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Carbonatada (CO₂)
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {presionCO2.toFixed(0)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  PSI
                </Typography>
              </Box>
            </Box>
          </Box>
          {co2Alert && (
            <Alert 
              severity={co2Alert.severity}
              icon={false}
              sx={{ 
                mt: 1,
                py: 0.5,
                fontSize: '0.875rem',
                bgcolor: co2Alert.bgColor,
                borderLeft: `4px solid`,
                borderColor: co2Alert.borderColor
              }}
            >
              <strong>{co2Alert.label}</strong>
              {presionCO2 !== null && presionCO2 !== undefined && ` (${presionCO2.toFixed(0)} PSI)`}
              {co2Alert.message && ` - ${co2Alert.message}`}
            </Alert>
          )}
        </Grid>
      </Grid>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Componente: Gráfica Mini de Niveles (para card de almacenamiento) */
/* -------------------------------------------------------------------------- */

function getThemeColorFromRule(theme: any, ruleColor: string): string {
  const colorUpper = (ruleColor || '').toUpperCase().replace(/\s/g, '');
  if (colorUpper.includes('#EE0000') || colorUpper.includes('#FF0000') || colorUpper.includes('#FF5630') || colorUpper.includes('#F00')) {
    return theme.palette.error.main;
  }
  if (colorUpper.includes('#FFFF00') || colorUpper.includes('#FFAB00') || colorUpper.includes('#FF0')) {
    return theme.palette.warning.main;
  }
  if (colorUpper.includes('#00B050') || colorUpper.includes('#00A76F') || colorUpper.includes('#0F0')) {
    return theme.palette.success.main;
  }
  return theme.palette.primary.main;
}

function getColorForValueFromRules(theme: any, value: number, metricRules: Array<{ min?: number | null; max?: number | null; color?: string; severity?: string }>): string {
  if (!metricRules || metricRules.length === 0) return theme.palette.success.main;
  const matchingRule = metricRules.find((rule) => {
    const min = rule.min != null ? Number(rule.min) : null;
    const max = rule.max != null ? Number(rule.max) : null;
    return (min === null || value >= min) && (max === null || value <= max);
  });
  if (matchingRule) {
    if (matchingRule.severity === 'critico') return theme.palette.error.main;
    if (matchingRule.severity === 'preventivo') return theme.palette.warning.main;
    if (matchingRule.severity === 'normal') return theme.palette.success.main;
    if (matchingRule.color) return getThemeColorFromRule(theme, matchingRule.color);
    return theme.palette.success.main;
  }
  return theme.palette.success.main;
}

function NivelMiniChart({ chart, title, metricRules }: { chart: any; title: string; metricRules?: Array<{ min?: number | null; max?: number | null; color?: string; label?: string; severity?: string }> }) {
  const theme = useTheme();

  const hasData = chart && chart.categories && chart.categories.length > 0 && chart.series && chart.series.length > 0;
  const dataValues = hasData && chart.series[0]?.data ? chart.series[0].data : [];
  const hasRules = Array.isArray(metricRules) && metricRules.length > 0;

  const chartOptions = useChart({
    chart: {
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: false },
      sparkline: { enabled: false },
    },
    colors: [theme.palette.primary.main],
    stroke: {
      width: 3,
      curve: 'smooth',
    },
    markers: {
      size: 4,
      strokeWidth: 2,
      hover: {
        size: 6,
      },
      ...(hasRules && dataValues.length > 0
        ? {
            discrete: dataValues.map((value: number, index: number) => ({
              seriesIndex: 0,
              dataPointIndex: index,
              fillColor: getColorForValueFromRules(theme, value, metricRules!),
              strokeColor: getColorForValueFromRules(theme, value, metricRules!),
              size: 4,
            })),
          }
        : {}),
    },
    xaxis: {
      categories: chart?.categories || [],
      labels: {
        show: true,
        rotate: -45,
        rotateAlways: false,
        style: {
          fontSize: '10px',
        },
        maxHeight: 60,
      },
      axisTicks: {
        show: true,
      },
    },
    yaxis: {
      labels: {
        show: true,
        style: {
          fontSize: '11px',
        },
        formatter: (value: number) => `${value.toFixed(0)}%`,
      },
      min: 0,
      max: 100,
    },
    tooltip: {
      enabled: true,
      shared: true,
      intersect: false,
      y: {
        formatter: (value: number) => {
          if (!hasRules) return `${value.toFixed(1)}%`;
          const rule = metricRules!.find((r) => {
            const min = r.min != null ? Number(r.min) : null;
            const max = r.max != null ? Number(r.max) : null;
            return (min === null || value >= min) && (max === null || value <= max);
          });
          return rule?.label ? `${value.toFixed(1)}% — ${rule.label}` : `${value.toFixed(1)}%`;
        },
      },
    },
    legend: {
      show: false,
    },
    grid: {
      show: true,
      strokeDashArray: 3,
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
  });

  const seriesWithYaxis = chart?.series || [];

  if (!hasData) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          No hay datos históricos
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%' }}>
      <Typography variant="subtitle2" fontWeight="600" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
        {title}
      </Typography>
      <Chart
        type="line"
        series={seriesWithYaxis}
        options={chartOptions}
        height={180}
      />
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Componente: Gráfica Histórica de Niveles */
/* -------------------------------------------------------------------------- */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function NivelHistoricoChart({ nivelName, chart }: { nivelName: string; chart: any }) {
  const theme = useTheme();

  const hasData = chart && chart.categories && chart.categories.length > 0 && chart.series && chart.series.length > 0;
  
  const chartOptions = useChart({
    chart: {
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: [theme.palette.primary.main],
    stroke: {
      width: 2,
      curve: 'smooth',
    },
    markers: {
      size: 4,
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    xaxis: {
      categories: chart?.categories || [],
      labels: {
        rotate: -45,
        rotateAlways: false,
        style: {
          fontSize: '11px',
        },
      },
    },
    yaxis: {
      title: {
        text: 'Nivel (%)',
      },
      min: 0,
      max: 100,
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value: number) => fNumber(value),
        title: {
          formatter: (seriesName: string) => `${seriesName}: `,
        },
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
    },
    grid: {
      strokeDashArray: 3,
    },
  });

  const seriesWithYaxis = chart?.series || [];

  if (!hasData) {
    return (
      <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
        <CardHeader
          title={`Histórico de ${nivelName}`}
          subheader="No hay datos históricos disponibles"
        />
      </Card>
    );
  }

  const valorActual = chart?.estadisticas?.valorActual;

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        mb: 3, 
        p: 3,
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'box-shadow 0.3s ease',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(250,250,250,0.95) 100%)',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }
      }}
    >
      <CardHeader
        title={
          <Typography variant="h6" fontWeight="600" sx={{ color: 'primary.main' }}>
            Histórico de {nivelName}
          </Typography>
        }
        subheader={
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {valorActual !== null && valorActual !== undefined 
              ? `Valor actual: ${valorActual.toFixed(1)}%`
              : 'Valor actual: N/A'}
          </Typography>
        }
      />
      <Divider sx={{ mb: 3, borderWidth: 1 }} />
      <Chart
        type="line"
        series={seriesWithYaxis}
        options={chartOptions}
        height={450}
        sx={{ py: 2 }}
      />
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Sección 3: Métricas */
/* -------------------------------------------------------------------------- */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function MetricasSection({ metricas }: any) {
  if (metricas.length === 0) {
    return (
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Métricas
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          No hay métricas disponibles
        </Typography>
      </Card>
    );
  }

  return (
    <Box>
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Métricas
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {metricas.map((metrica: any) => {
            const nivel = metrica.status?.find((s: any) => s.code === 'liquid_level_percent')?.value;
            const nombre = metrica.name || 'Métrica';

            return (
              <Grid item xs={12} sm={6} key={metrica._id || metrica.id}>
                <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {nombre}
                  </Typography>
                  <Typography variant="h3" color="primary" fontWeight="bold">
                    {nivel !== undefined && nivel !== null 
                      ? `${Number(nivel).toFixed(1)}%` 
                      : 'N/A'}
                  </Typography>
                  <Chip 
                    label={metrica.online ? 'Online' : 'Offline'} 
                    color={metrica.online ? 'success' : 'error'} 
                    size="small" 
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Card>
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Card: Estado de la Tienda (Top-Left) */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* 🧱 Dashboard TIWater - Datos de Sensores en Tiempo Real */
/* -------------------------------------------------------------------------- */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TiwaterDashboard({ data, product, loading }: { data: any; product?: any; loading: boolean }) {
  const theme = useTheme();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  // Debug: Log de lo que recibimos
  console.log('[TiwaterDashboard] data recibido:', data);
  console.log('[TiwaterDashboard] product recibido:', product);

  // Priorizar product.status si está disponible (tiene los datos más confiables)
  // Si no, usar data.raw como fallback
  const hasProductData = product && product.status && Array.isArray(product.status) && product.status.length > 0;
  const hasRawData = data && data.raw && Object.keys(data.raw).length > 0;
  const hasStructuredData = data && (
    (data.caudales?.purificada !== null && data.caudales?.purificada !== undefined) ||
    (data.niveles?.purificada_porcentaje !== null && data.niveles?.purificada_porcentaje !== undefined) ||
    (data.sistema?.eficiencia !== null && data.sistema?.eficiencia !== undefined)
  );

  // Guardar referencia al data original con raw para usar como fallback
  const originalDataWithRaw = hasRawData ? data : null;

  // Priorizar product.status sobre todo lo demás
  if (hasProductData) {
    console.log('[TiwaterDashboard] Extrayendo datos de product...');
    // Convertir datos del producto al formato esperado
    const status = product.status || [];
    
    // Buscar valores en el status array por code o label
    // Nota: En el JSON del backend, el campo 'code' contiene el label directamente
    const findStatusValue = (codes: string[]) => {
      // Buscar en el array de códigos proporcionados
      const foundItem = status.find((s: any) => {
        // Verificar si el code o label del status coincide con alguno de los códigos buscados
        const matches = codes.some((code) => {
          // Coincidencia exacta
          if (s.code === code || s.label === code) return true;
          // Coincidencia case-insensitive
          const codeLower = code.toLowerCase();
          const sCodeLower = s.code?.toLowerCase() || '';
          const sLabelLower = s.label?.toLowerCase() || '';
          if (sCodeLower === codeLower || sLabelLower === codeLower) return true;
          return false;
        });
        return matches;
      });
      
      if (foundItem && foundItem.value !== null && foundItem.value !== undefined) {
        const numValue = parseFloat(String(foundItem.value));
        if (!Number.isNaN(numValue)) {
          return numValue;
        }
      }
      return null;
    };
    
    console.log('[TiwaterDashboard] Status array:', status);
    console.log('[TiwaterDashboard] Total items en status:', status.length);
    
    // Test directo de búsqueda
    const testFlujo = status.find((s: any) => s.code === 'Flujo Producción' || s.label === 'Flujo Producción');
    console.log('[TiwaterDashboard] Test directo "Flujo Producción":', testFlujo);
    
    const testEficiencia = status.find((s: any) => s.code === 'Eficiencia' || s.label === 'Eficiencia');
    console.log('[TiwaterDashboard] Test directo "Eficiencia":', testEficiencia);
    
    console.log('[TiwaterDashboard] Buscando "Flujo Producción":', findStatusValue(['Flujo Producción']));
    console.log('[TiwaterDashboard] Buscando "Eficiencia":', findStatusValue(['Eficiencia']));
    
    // Debug: Buscar corrientes específicamente
    const testCh1 = status.find((s: any) => 
      s.code === 'ch1' || s.code === 'corriente_ch1' || s.code === 'Corriente Canal 1' ||
      s.label === 'ch1' || s.label === 'corriente_ch1' || s.label === 'Corriente Canal 1'
    );
    console.log('[TiwaterDashboard] Test directo "ch1":', testCh1);
    console.log('[TiwaterDashboard] Buscando "ch1":', findStatusValue(['ch1', 'corriente_ch1', 'Corriente Canal 1']));

    // Mapear usando los códigos exactos que vienen en el JSON
    data = {
      caudales: {
        purificada: findStatusValue(['Flujo Producción', 'flowrate_speed_1', 'flujo_produccion']) || null,
        recuperacion: findStatusValue(['Flujo Recuperación', 'flowrate_recuperacion', 'flujo_recuperacion']) || null,
        rechazo: findStatusValue(['Flujo Rechazo', 'flowrate_speed_2', 'flujo_rechazo']) || null,
        cruda: findStatusValue(['Caudal Cruda', 'caudal_cruda']) || null,
        cruda_lmin: findStatusValue(['Caudal Cruda (L/min)', 'Caudal Cruda L/min', 'caudal_cruda_lmin']) || null
      },
      niveles: {
        purificada_porcentaje: findStatusValue(['Nivel Purificada', 'level_purificada', 'electronivel_purificada']) || null,
        purificada_absoluto: findStatusValue(['Nivel Purificada (absoluto)', 'nivel_purificada_absoluto', 'nivel_purificada']) || null,
        // Nota: "Nivel Recuperada" es el porcentaje del nivel de agua recuperada
        cruda_porcentaje: findStatusValue(['Nivel Recuperada', 'level_recuperada', 'electronivel_recuperada']) || null,
        // "Nivel Cruda" es el nivel absoluto de agua cruda
        cruda_absoluto: findStatusValue(['Nivel Cruda', 'nivel_cruda_absoluto', 'nivel_cruda']) || null
      },
      presiones: {
        co2: findStatusValue(['Presión CO2', 'presion_co2']) || null
      },
      sistema: {
        eficiencia: findStatusValue(['Eficiencia', 'eficiencia']) || null,
        vida: findStatusValue(['Vida', 'Vida del Sistema', 'vida']) || null
      },
      corrientes: {
        ch1: findStatusValue(['Corriente Canal 1', 'corriente_ch1', 'ch1', 'Corriente CH1']) || null,
        ch2: findStatusValue(['Corriente Canal 2', 'corriente_ch2', 'ch2', 'Corriente CH2']) || null,
        ch3: findStatusValue(['Corriente Canal 3', 'corriente_ch3', 'ch3', 'Corriente CH3']) || null,
        ch4: findStatusValue(['Corriente Canal 4', 'corriente_ch4', 'ch4', 'Corriente CH4']) || null,
        total: findStatusValue(['Corriente Total', 'corriente_total', 'total_corriente', 'Total Corriente']) || null
      },
      acumulados: {
        cruda: findStatusValue(['Acumulado Cruda', 'acumulado_cruda']) || null
      },
      online: product.online || false,
      timestamp: product.lastUpdate || null
    };
    
    // Debug: Log para verificar que los datos se están mapeando
    console.log('[TiwaterDashboard] Datos mapeados desde product.status:', data);
    console.log('[TiwaterDashboard] Caudales mapeados:', data.caudales);
    console.log('[TiwaterDashboard] Niveles mapeados:', data.niveles);
    console.log('[TiwaterDashboard] Sistema mapeado:', data.sistema);
    console.log('[TiwaterDashboard] Corrientes mapeadas desde product:', data.corrientes);
    
    // Si las corrientes no se encontraron en product.status, intentar desde originalDataWithRaw.raw si está disponible
    if ((!data.corrientes.ch1 && !data.corrientes.ch2 && !data.corrientes.ch3 && !data.corrientes.ch4) && originalDataWithRaw && originalDataWithRaw.raw) {
      console.log('[TiwaterDashboard] Corrientes no encontradas en product.status, intentando desde data.raw...');
      const { raw } = originalDataWithRaw;
      data.corrientes = {
        ch1: raw.ch1 !== undefined ? parseFloat(String(raw.ch1)) : data.corrientes.ch1,
        ch2: raw.ch2 !== undefined ? parseFloat(String(raw.ch2)) : data.corrientes.ch2,
        ch3: raw.ch3 !== undefined ? parseFloat(String(raw.ch3)) : data.corrientes.ch3,
        ch4: raw.ch4 !== undefined ? parseFloat(String(raw.ch4)) : data.corrientes.ch4,
        total: raw.total_corriente !== undefined ? parseFloat(String(raw.total_corriente)) : data.corrientes.total
      };
      console.log('[TiwaterDashboard] Corrientes mapeadas desde data.raw:', data.corrientes);
    }
  } else if (!hasStructuredData && hasRawData && data && data.raw) {
    // Si no hay datos estructurados válidos pero hay raw, mapear desde raw
    console.log('[TiwaterDashboard] Mapeando desde data.raw como fallback...');
    const { raw, online: dataOnline, timestamp: dataTimestamp } = data;
    
    data = {
      caudales: {
        purificada: raw['Flujo Producción'] !== undefined ? parseFloat(String(raw['Flujo Producción'])) : null,
        recuperacion: raw['Flujo Recuperación'] !== undefined ? parseFloat(String(raw['Flujo Recuperación'])) : null,
        rechazo: raw['Flujo Rechazo'] !== undefined ? parseFloat(String(raw['Flujo Rechazo'])) : null,
        cruda: raw['Caudal Cruda'] !== undefined ? parseFloat(String(raw['Caudal Cruda'])) : null,
        cruda_lmin: raw['Caudal Cruda (L/min)'] !== undefined ? parseFloat(String(raw['Caudal Cruda (L/min)'])) : null
      },
      niveles: {
        purificada_porcentaje: raw['Nivel Purificada'] !== undefined ? parseFloat(String(raw['Nivel Purificada'])) : null,
        purificada_absoluto: raw['Nivel Purificada (absoluto)'] !== undefined ? parseFloat(String(raw['Nivel Purificada (absoluto)'])) : null,
        cruda_porcentaje: raw['Nivel Recuperada'] !== undefined ? parseFloat(String(raw['Nivel Recuperada'])) : null,
        cruda_absoluto: raw['Nivel Cruda'] !== undefined ? parseFloat(String(raw['Nivel Cruda'])) : null
      },
      presiones: {
        co2: raw['Presión CO2'] !== undefined ? parseFloat(String(raw['Presión CO2'])) : null
      },
      sistema: {
        eficiencia: raw.Eficiencia !== undefined ? parseFloat(String(raw.Eficiencia)) : null,
        vida: raw.Vida !== undefined ? parseFloat(String(raw.Vida)) : null
      },
      corrientes: {
        ch1: raw.ch1 !== undefined ? parseFloat(String(raw.ch1)) : null,
        ch2: raw.ch2 !== undefined ? parseFloat(String(raw.ch2)) : null,
        ch3: raw.ch3 !== undefined ? parseFloat(String(raw.ch3)) : null,
        ch4: raw.ch4 !== undefined ? parseFloat(String(raw.ch4)) : null,
        total: raw.total_corriente !== undefined ? parseFloat(String(raw.total_corriente)) : null
      },
      acumulados: {
        cruda: raw['Acumulado Cruda'] !== undefined ? parseFloat(String(raw['Acumulado Cruda'])) : null
      },
      online: dataOnline || false,
      timestamp: dataTimestamp || null
    };
    
    console.log('[TiwaterDashboard] Datos mapeados desde data.raw:', data);
  }

  if (!data) {
    console.log('[TiwaterDashboard] No hay datos disponibles, retornando null');
    return null;
  }

  const { caudales, niveles, presiones, sistema, corrientes, acumulados, online, timestamp } = data;

  // Debug: Verificar los valores extraídos
  console.log('[TiwaterDashboard] Valores extraídos:', {
    caudales,
    niveles,
    presiones,
    sistema,
    corrientes,
    acumulados
  });

  // Calcular eficiencia si no está disponible
  const eficienciaCalculada = sistema?.eficiencia !== null && sistema?.eficiencia !== undefined
    ? Number(sistema.eficiencia)
    : (caudales?.purificada !== null && caudales?.purificada !== undefined && 
       caudales?.rechazo !== null && caudales?.rechazo !== undefined
      ? Number(((caudales.purificada / (caudales.purificada + caudales.rechazo)) * 100).toFixed(1))
      : null);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Dashboard TIWater
        </Typography>
        <Chip
          label={online ? 'En Línea' : 'Offline'}
          color={online ? 'success' : 'error'}
          size="medium"
          sx={{ fontWeight: 'bold' }}
        />
      </Box>

      {/* Métricas Principales */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Eficiencia */}
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Eficiencia"
            value={eficienciaCalculada}
            unit="%"
            icon="📈"
            color={theme.palette.primary.main}
            subtitle="Rendimiento del sistema"
          />
        </Grid>

        {/* Caudal Purificada */}
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Caudal Purificada"
            value={caudales?.purificada}
            unit="L/min"
            icon="💧"
            color={theme.palette.info.main}
            subtitle="Producción de agua"
          />
        </Grid>

        {/* Nivel Purificada */}
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Nivel Purificada"
            value={niveles?.purificada_porcentaje || niveles?.purificada_absoluto}
            unit={niveles?.purificada_porcentaje ? '%' : 'mm'}
            icon="💧"
            color={theme.palette.success.main}
            subtitle={niveles?.purificada_absoluto ? `${niveles.purificada_absoluto?.toFixed(1)} mm absoluto` : undefined}
          />
        </Grid>

        {/* Presión CO2 */}
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Presión CO2"
            value={presiones?.co2}
            unit="PSI"
            icon="⚡"
            color={theme.palette.warning.main}
            subtitle="Presión del sistema"
          />
        </Grid>
      </Grid>

      {/* Sección de Caudales */}
      <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Caudales del Sistema
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Purificada
              </Typography>
              <Typography variant="h5" color="primary" fontWeight="bold">
                {caudales?.purificada !== null && caudales?.purificada !== undefined
                  ? `${caudales.purificada.toFixed(2)} L/min`
                  : 'N/A'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Recuperación
              </Typography>
              <Typography variant="h5" color="info.main" fontWeight="bold">
                {caudales?.recuperacion !== null && caudales?.recuperacion !== undefined
                  ? `${caudales.recuperacion.toFixed(2)} L/min`
                  : 'N/A'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Rechazo
              </Typography>
              <Typography variant="h5" color="error.main" fontWeight="bold">
                {caudales?.rechazo !== null && caudales?.rechazo !== undefined
                  ? `${caudales.rechazo.toFixed(2)} L/min`
                  : 'N/A'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Cruda
              </Typography>
              <Typography variant="h5" color="secondary.main" fontWeight="bold">
                {caudales?.cruda !== null && caudales?.cruda !== undefined
                  ? `${caudales.cruda.toFixed(2)} L/min`
                  : 'N/A'}
              </Typography>
              {caudales?.cruda_lmin && (
                <Typography variant="caption" color="text.secondary">
                  ({caudales.cruda_lmin.toFixed(2)} L/min)
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </Card>

      {/* Sección de Niveles */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Nivel Tanque Purificada
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.lighter', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Porcentaje
                  </Typography>
                  <Typography variant="h4" color="primary.main" fontWeight="bold">
                    {niveles?.purificada_porcentaje !== null && niveles?.purificada_porcentaje !== undefined
                      ? `${niveles.purificada_porcentaje.toFixed(1)}%`
                      : 'N/A'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Absoluto
                  </Typography>
                  <Typography variant="h4" color="info.main" fontWeight="bold">
                    {niveles?.purificada_absoluto !== null && niveles?.purificada_absoluto !== undefined
                      ? `${niveles.purificada_absoluto.toFixed(1)} mm`
                      : 'N/A'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Nivel Tanque Cruda
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.lighter', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Porcentaje
                  </Typography>
                  <Typography variant="h4" color="warning.main" fontWeight="bold">
                    {niveles?.cruda_porcentaje !== null && niveles?.cruda_porcentaje !== undefined
                      ? `${niveles.cruda_porcentaje.toFixed(1)}%`
                      : 'N/A'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'secondary.lighter', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Absoluto
                  </Typography>
                  <Typography variant="h4" color="secondary.main" fontWeight="bold">
                    {niveles?.cruda_absoluto !== null && niveles?.cruda_absoluto !== undefined
                      ? `${niveles.cruda_absoluto.toFixed(1)} mm`
                      : 'N/A'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Card>
        </Grid>
      </Grid>

      {/* Sección de Corrientes y Sistema */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              ⚡ Corrientes del Sistema
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Canal 1
                  </Typography>
                  <Typography variant="h6">
                    {corrientes?.ch1 !== null && corrientes?.ch1 !== undefined
                      ? `${corrientes.ch1.toFixed(2)} A`
                      : 'N/A'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Canal 2
                  </Typography>
                  <Typography variant="h6">
                    {corrientes?.ch2 !== null && corrientes?.ch2 !== undefined
                      ? `${corrientes.ch2.toFixed(2)} A`
                      : 'N/A'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Canal 3
                  </Typography>
                  <Typography variant="h6">
                    {corrientes?.ch3 !== null && corrientes?.ch3 !== undefined
                      ? `${corrientes.ch3.toFixed(2)} A`
                      : 'N/A'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Canal 4
                  </Typography>
                  <Typography variant="h6">
                    {corrientes?.ch4 !== null && corrientes?.ch4 !== undefined
                      ? `${corrientes.ch4.toFixed(2)} A`
                      : 'N/A'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Corriente Total
                  </Typography>
                  <Typography variant="h5" color="primary.main" fontWeight="bold">
                    {corrientes?.total !== null && corrientes?.total !== undefined
                      ? `${corrientes.total.toFixed(2)} A`
                      : 'N/A'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              🔧 Estado del Sistema
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Eficiencia
                  </Typography>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {eficienciaCalculada !== null && eficienciaCalculada !== undefined
                      ? `${eficienciaCalculada}%`
                      : 'N/A'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Vida del Sistema
                  </Typography>
                  <Typography variant="h6">
                    {sistema?.vida !== null && sistema?.vida !== undefined
                      ? `${sistema.vida} días`
                      : 'N/A'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Acumulado Cruda
                  </Typography>
                  <Typography variant="h6">
                    {acumulados?.cruda !== null && acumulados?.cruda !== undefined
                      ? `${acumulados.cruda.toFixed(2)} L`
                      : 'N/A'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Card>
        </Grid>
      </Grid>

      {/* Información de última actualización */}
      {timestamp && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Última actualización: {new Date(timestamp).toLocaleString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Alert>
      )}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Componente: Tarjeta de Métrica */
/* -------------------------------------------------------------------------- */

function MetricCard({ title, value, unit, icon, color, subtitle }: {
  title: string;
  value: any;
  unit: string;
  icon: string | React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box sx={{ mr: 1, fontSize: '1.5rem' }}>{icon}</Box>
        <Typography variant="subtitle2" color="text.secondary">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" fontWeight="bold" sx={{ color, mb: 0.5 }}>
        {value !== null && value !== undefined && value !== '' 
          ? `${Number(value).toFixed(2)} ${unit}` 
          : 'N/A'}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Componente: Tanque de Agua SVG */
/* -------------------------------------------------------------------------- */

function WaterTankSVG({ 
  percentage, 
  liters, 
  color = 'primary' 
}: { 
  percentage: number; 
  liters: number;
  color?: 'primary' | 'info' | 'success' | 'warning';
}) {
  const theme = useTheme();
  const colorMap: Record<string, string> = {
    primary: theme.palette.primary.main,
    info: theme.palette.info.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
  };
  
  const fillColor = colorMap[color] || theme.palette.primary.main;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  const fillHeight = (clampedPercentage / 100) * 140; // Altura del cuerpo del tanque (140px)
  const yPosition = 180 - fillHeight; // Posición Y desde abajo (180 es la base del tanque)

  // Generar ID único para evitar conflictos con múltiples instancias
  const gradientId = `waterGradient-${color}-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <svg
        width="120"
        height="200"
        viewBox="0 0 120 200"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        {/* Definiciones para gradiente */}
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.7" />
            <stop offset="50%" stopColor={fillColor} stopOpacity="0.9" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Cuerpo del tanque (rectángulo principal) */}
        <rect
          x="20"
          y="40"
          width="80"
          height="140"
          rx="5"
          fill="#f5f5f5"
          stroke="#bdbdbd"
          strokeWidth="2"
        />

        {/* Agua dentro del tanque - se llena desde abajo */}
        {clampedPercentage > 0 && (
          <rect
            x="22"
            y={yPosition}
            width="76"
            height={fillHeight}
            rx="4"
            fill={`url(#${gradientId})`}
            style={{ 
              transition: 'y 0.5s ease, height 0.5s ease',
            }}
          />
        )}

        {/* Tapa superior del tanque (elipse) */}
        <ellipse
          cx="60"
          cy="40"
          rx="40"
          ry="8"
          fill="#d0d0d0"
          stroke="#999"
          strokeWidth="2"
        />

        {/* Líneas de nivel decorativas en el tanque */}
        <line x1="25" y1="70" x2="95" y2="70" stroke="#ccc" strokeWidth="1" opacity="0.4" />
        <line x1="25" y1="110" x2="95" y2="110" stroke="#ccc" strokeWidth="1" opacity="0.4" />
        <line x1="25" y1="150" x2="95" y2="150" stroke="#ccc" strokeWidth="1" opacity="0.4" />

        {/* Válvula o salida en la parte inferior */}
        <rect x="55" y="180" width="10" height="15" rx="2" fill="#666" />
        <circle cx="60" cy="195" r="3" fill="#666" />
      </svg>

      {/* Información del tanque */}
      <Box sx={{ textAlign: 'center', mt: 1 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ color: fillColor }}>
          {clampedPercentage.toFixed(0)}%
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {liters} LITROS
        </Typography>
      </Box>
    </Box>
  );
}

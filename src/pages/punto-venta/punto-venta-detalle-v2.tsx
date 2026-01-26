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
  InputLabel,
  Typography,
  FormControl,
  CircularProgress
} from '@mui/material';

import { fNumber } from 'src/utils/format-number';

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
          if (Array.isArray(result)) {
            setMetricsConfig(result);
          }
        }
      } catch (error) {
        console.error('Error fetching metrics config:', error);
      }
    };

    const fetchPuntoVentaDetails = async () => {
      try {
        // Use v2.0 endpoint for PostgreSQL data (supports both id and codigo_tienda)
        const response = await fetch(`${CONFIG.API_BASE_URL_V2}/puntoVentas/${id}`, {
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

  // Dev mode: Check if user is admin and showDev flag is enabled from localStorage
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role?.name === 'admin' || user?.role === 'admin';
  
  // Get dev mode preference from localStorage for this puntoVenta
  const devModeKey = `devMode_${id}`;
  const showDev = localStorage.getItem(devModeKey) === 'true';
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
          // Recargar datos después de generar
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
    } else {
      console.log('[Dev] Generating scenario:', selectedScenario);
      // TODO: Implement other scenario handlers
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
            href="/PuntoVenta"
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
          )}
        </Box>
        <Divider sx={{ borderStyle: 'dashed', my: 2 }} />

        {/* Título de la tienda */}
        <Typography variant="h4" align="center" fontWeight="bold" sx={{ mb: 3 }}>
          {punto.name || 'NOMBRE TIENDA'}
        </Typography>

        {/* Grid Principal Reorganizado */}
        <Grid container spacing={3}>
          {/* Top-Left: Estado de la Tienda (con mapa integrado) */}
          <Grid item xs={12} md={6}>
            <EstadoTiendaCard 
              punto={punto} 
              latestSensorTimestamp={latestSensorTimestamp}
            />
          </Grid>

          {/* Top-Right: Osmosis Inversa */}
          <Grid item xs={12} md={6}>
            <OsmosisInversaCard 
              osmosis={osmosis}
              metricas={metricas}
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

  // Procesar productos que tengan histórico (purificada o recuperada)
  const chartDataArray: any[] = [];
  
  allProducts.forEach((product: any) => {
    // Procesar histórico de purificada si existe
    const hasHistoricoPurificada = product.historico && 
                          product.historico.hours_with_data && 
                          Array.isArray(product.historico.hours_with_data) &&
                          product.historico.hours_with_data.length > 0;
    
    // Procesar histórico de recuperada si existe
    const hasHistoricoRecuperada = product.historico_recuperada && 
                          product.historico_recuperada.hours_with_data && 
                          Array.isArray(product.historico_recuperada.hours_with_data) &&
                          product.historico_recuperada.hours_with_data.length > 0;
    
    console.log(`[prepareChartDataNiveles] Producto ${product.id} (${product.product_type}):`, {
      hasHistoricoPurificada: !!product.historico,
      hasHistoricoRecuperada: !!product.historico_recuperada,
      hoursWithDataPurificada: product.historico?.hours_with_data?.length || 0,
      hoursWithDataRecuperada: product.historico_recuperada?.hours_with_data?.length || 0
    });
    
    // Procesar histórico de purificada
    if (hasHistoricoPurificada) {
      const chartDataPurificada = processHistorico(product, product.historico, true, false);
      if (chartDataPurificada) {
        chartDataArray.push(chartDataPurificada);
      }
    }
    
    // Procesar histórico de recuperada
    if (hasHistoricoRecuperada) {
      const chartDataRecuperada = processHistorico(product, product.historico_recuperada, false, true);
      if (chartDataRecuperada) {
        chartDataArray.push(chartDataRecuperada);
      }
    }
  });
  
  // Función auxiliar para procesar histórico
  function processHistorico(product: any, historico: any, isPurificada: boolean, isCruda: boolean) {
    try {
      console.log(`[prepareChartDataNiveles] Procesando histórico para ${product.id} (${product.product_type}):`, {
        isPurificada,
        isCruda,
        historicoType: historico.product || 'unknown'
      });
      
      const hoursWithData = historico.hours_with_data || [];
      
      // Ordenar por hora
      const horasOrdenadas = [...hoursWithData].sort((a: any, b: any) => {
        const horaA = a.hora || '00:00';
        const horaB = b.hora || '00:00';
        return horaA.localeCompare(horaB);
      });
      
      // Extraer horas y datos de nivel
      const horas = horasOrdenadas.map((h: any) => h.hora || '');
      const nivelPercentData = horasOrdenadas.map((h: any) => {
        const value = Number(h.estadisticas?.liquid_level_percent_promedio) || 0;
        return Math.max(0, Math.min(100, value));
      });

      // Obtener el valor actual del producto desde el status
      let valorActual = null;
      if (product.product_type === 'TIWater') {
        if (isPurificada) {
          const nivelPurificada = product.status?.find((s: any) => s.code === 'level_purificada' || s.code === 'electronivel_purificada');
          valorActual = nivelPurificada?.value ?? null;
        } else if (isCruda) {
          const nivelRecuperada = product.status?.find((s: any) => s.code === 'level_recuperada' || s.code === 'electronivel_recuperada');
          valorActual = nivelRecuperada?.value ?? null;
        }
      } else {
        valorActual = product.status?.find((s: any) => s.code === 'liquid_level_percent')?.value || null;
      }

      return {
        nivelId: product._id || product.id,
        nivelName: isPurificada ? 'Nivel Purificada' : (isCruda ? 'Nivel Recuperada' : product.name),
        productType: product.product_type,
        isPurificada,
        isCruda,
        categories: horas,
        series: [
          {
            name: 'Nivel (%)',
            data: nivelPercentData,
          },
        ],
        estadisticas: {
          valorActual: valorActual !== null ? Number(valorActual) : null,
        },
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
      productType: r.productType,
      isPurificada: r.isPurificada,
      isCruda: r.isCruda,
      categoriesCount: r.categories?.length || 0
    })) : null
  });
  setChartDataNiveles(result);
}

/* -------------------------------------------------------------------------- */
/* 🧱 Card: Almacenamiento (Bottom-Left) */
/* -------------------------------------------------------------------------- */

function AlmacenamientoCard({ niveles, chartDataNiveles, tiwaterData, tiwaterProduct }: any) {
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
          cruda_porcentaje: findStatusValue(['Nivel Recuperada', 'level_recuperada', 'electronivel_recuperada'], status)
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
    
    // Obtener valores de nivel desde el status de TIWater
    const nivelPurificada = tiwaterProduct.status?.find((s: any) => 
      s.code === 'level_purificada' || s.code === 'electronivel_purificada'
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
        const ultimoValorHistorico = getUltimoValorHistorico(chartDataPurificada);
        aguaPurificadaData = {
          nivel: ultimoValorHistorico !== null ? ultimoValorHistorico : (Number(nivelPurificada.value) || null),
          chartData: chartDataPurificada,
          name: 'Nivel Purificada'
        };
        console.log('[AlmacenamientoCard] Asignado chartData a aguaPurificadaData (isPurificada=true)', {
          ultimoValorHistorico,
          statusValue: nivelPurificada.value,
          nivelFinal: aguaPurificadaData.nivel
        });
      }

      // Buscar chartData de recuperada (cruda)
      const chartDataRecuperada = chartDataNiveles.find((cd: any) => {
        const matchesId = cd.nivelId === tiwaterProduct._id || cd.nivelId === tiwaterProduct.id;
        const matchesType = cd.productType === 'TIWater';
        return (matchesId || matchesType) && cd.isCruda;
      });

      if (chartDataRecuperada && nivelRecuperada) {
        const ultimoValorHistorico = getUltimoValorHistorico(chartDataRecuperada);
        aguaCrudaData = {
          nivel: ultimoValorHistorico !== null ? ultimoValorHistorico : (Number(nivelRecuperada.value) || null),
          chartData: chartDataRecuperada,
          name: 'Nivel Recuperada'
        };
        console.log('[AlmacenamientoCard] Asignado chartData a aguaCrudaData (isCruda=true)', {
          ultimoValorHistorico,
          statusValue: nivelRecuperada.value,
          nivelFinal: aguaCrudaData.nivel
        });
      } else if (nivelRecuperada && !aguaCrudaData?.chartData) {
        // Si no hay chartData pero hay nivel recuperada, usar el valor del status
        aguaCrudaData = {
          nivel: Number(nivelRecuperada.value) || null,
          chartData: null,
          name: 'Nivel Recuperada'
        };
        console.log('[AlmacenamientoCard] Asignado nivel recuperada a aguaCrudaData (sin chartData)');
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
          <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'primary.lighter', border: '1px solid', borderColor: 'primary.main', height: '100%' }}>
            <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ color: 'primary.dark', mb: 2 }}>
              Agua Cruda
            </Typography>
            
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
                <NivelMiniChart chart={aguaCrudaData.chartData} title="Histórico de Nivel del tanque Agua cruda" />
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
          <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'info.lighter', border: '1px solid', borderColor: 'info.main', height: '100%' }}>
            <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ color: 'info.dark', mb: 2 }}>
              Agua Purificada
            </Typography>
            
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
                <NivelMiniChart chart={aguaPurificadaData.chartData} title="Histórico de Nivel del tanque Agua purificada" />
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
/* 🧱 Card: Osmosis Inversa (Bottom-Right) */
/* -------------------------------------------------------------------------- */

// Helper function to evaluate metric status based on rules
const evaluateMetricStatus = (value: number | null | undefined, metricName: string, metricsConfig: any[]): 'success' | 'warning' | 'error' => {
  if (value === null || value === undefined) {
    return 'success'; // Default to green if no value
  }

  // Map metric display names to metric_type values
  const metricTypeMap: { [key: string]: string } = {
    'PRODUCCION': 'produccion',
    'RECHAZO': 'recuperacion', // RECHAZO maps to recuperacion metric type
    'EFICIENCIA': 'eficiencia'
  };

  // Find metric configuration for this metric
  // Try multiple matching strategies
  const metricConfig = metricsConfig.find((m: any) => {
    const metricType = metricTypeMap[metricName] || metricName.toLowerCase();
    return (
      m.metric_name?.toLowerCase() === metricName.toLowerCase() ||
      m.sensor_type?.toLowerCase() === metricName.toLowerCase() ||
      m.metric_type?.toLowerCase() === metricType ||
      (metricName === 'PRODUCCION' && (m.metric_type === 'produccion' || m.sensor_type === 'flujo_produccion')) ||
      (metricName === 'RECHAZO' && (m.metric_type === 'recuperacion' || m.sensor_type === 'flujo_rechazo')) ||
      (metricName === 'EFICIENCIA' && m.metric_type === 'eficiencia')
    );
  });

  if (!metricConfig || !metricConfig.rules || !Array.isArray(metricConfig.rules) || metricConfig.rules.length === 0) {
    return 'success'; // Default to green if no rules configured
  }

  // Evaluate rules (rules are typically ordered: normal, preventivo, correctivo)
  const matchingRule = metricConfig.rules.find((rule: any) => {
    const min = rule.min !== null && rule.min !== undefined ? rule.min : -Infinity;
    const max = rule.max !== null && rule.max !== undefined ? rule.max : Infinity;
    return value >= min && value <= max;
  });

  if (matchingRule) {
    // Determine color based on rule label or color
    const color = matchingRule.color?.toLowerCase() || matchingRule.label?.toLowerCase() || '';
    if (color.includes('rojo') || color.includes('red') || color.includes('correctivo') || color === '#ee0000' || color === '#ee0000') {
      return 'error'; // Red
    }
    if (color.includes('amarillo') || color.includes('yellow') || color.includes('preventivo') || color === '#ffff00' || color === '#ffff00') {
      return 'warning'; // Yellow
    }
    return 'success'; // Green (normal)
  }

  return 'success'; // Default to green if no rule matches
};

function OsmosisInversaCard({ osmosis, metricas, tiwaterData, tiwaterProduct, metricsConfig }: any) {
  // Extraer datos de osmosis
  let osmosisData: any = null;
  if (osmosis && osmosis.length > 0) {
    const p = osmosis[0];
    const flowRate1 = p.status?.find((s: any) => s.code === 'flowrate_speed_1')?.value;
    const flowRate2 = p.status?.find((s: any) => s.code === 'flowrate_speed_2')?.value;
    const totalFlujo = (flowRate1 || 0) + (flowRate2 || 0);
    const eficiencia = totalFlujo > 0 
      ? ((flowRate1 || 0) / totalFlujo * 100).toFixed(1)
      : null;

    osmosisData = {
      produccion: flowRate1,
      rechazo: flowRate2,
      eficiencia
    };
  }

  // Si hay datos de TIWater, usarlos como fallback
  if (!osmosisData && (tiwaterData || tiwaterProduct)) {
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

    const status = tiwaterProduct?.status || [];
    const produccion = findStatusValue(['Flujo Producción', 'flowrate_speed_1', 'flujo_produccion'], status) || tiwaterData?.caudales?.purificada;
    const rechazo = findStatusValue(['Flujo Rechazo', 'flowrate_speed_2', 'flujo_rechazo'], status) || tiwaterData?.caudales?.rechazo;
    const total = (produccion || 0) + (rechazo || 0);
    const eficiencia = total > 0 ? ((produccion || 0) / total * 100).toFixed(1) : null;

    osmosisData = {
      produccion,
      rechazo,
      eficiencia
    };
  }

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
        💧 Osmosis Inversa
      </Typography>
      <Divider sx={{ mb: 3, borderWidth: 1 }} />

      {/* Métricas de Osmosis */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2">
                PRODUCCION: {osmosisData?.produccion !== null && osmosisData?.produccion !== undefined 
                  ? `${osmosisData.produccion.toFixed(1)} L/MIN` 
                  : 'N/A'}
              </Typography>
              <Box sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: `${evaluateMetricStatus(osmosisData?.produccion, 'PRODUCCION', metricsConfig || [])}.main` 
              }} />
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2">
                RECHAZO: {osmosisData?.rechazo !== null && osmosisData?.rechazo !== undefined 
                  ? `${osmosisData.rechazo.toFixed(1)} L/MIN` 
                  : 'N/A'}
              </Typography>
              <Box sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: `${evaluateMetricStatus(osmosisData?.rechazo, 'RECHAZO', metricsConfig || [])}.main` 
              }} />
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2">
                EFICIENCIA: {osmosisData?.eficiencia !== null && osmosisData?.eficiencia !== undefined 
                  ? `${osmosisData.eficiencia}%` 
                  : 'N/A'}
              </Typography>
              <Box sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: `${evaluateMetricStatus(parseFloat(osmosisData?.eficiencia), 'EFICIENCIA', metricsConfig || [])}.main` 
              }} />
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Máquinas */}
      <Grid container spacing={2}>
        {/* Máquina Nieve */}
        <Grid item xs={12}>
          <Card 
            variant="outlined" 
            sx={{ 
              p: 2, 
              bgcolor: 'primary.lighter', 
              border: '1px solid', 
              borderColor: 'primary.main',
              borderRadius: 2,
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Typography variant="body2" fontWeight="600" sx={{ color: 'primary.dark' }}>
                🍦 Máquina Nieve
              </Typography>
            </Box>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  IZQ.: {ch1.toFixed(2)} A
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  DER.: {ch2.toFixed(2)} A
                </Typography>
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Máquina Frappe */}
        <Grid item xs={12}>
          <Card 
            variant="outlined" 
            sx={{ 
              p: 2, 
              bgcolor: 'primary.lighter', 
              border: '1px solid', 
              borderColor: 'primary.main',
              borderRadius: 2,
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Typography variant="body2" fontWeight="600" sx={{ color: 'primary.dark' }}>
                🥤 Máquina Frappe
              </Typography>
            </Box>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  IZQ.: {ch3.toFixed(2)} A
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  DER.: {ch4.toFixed(2)} A
                </Typography>
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Máquina Carbonatada */}
        <Grid item xs={12}>
          <Card 
            variant="outlined" 
            sx={{ 
              p: 2, 
              bgcolor: 'primary.lighter', 
              border: '1px solid', 
              borderColor: 'primary.main',
              borderRadius: 2,
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Typography variant="body2" fontWeight="600" sx={{ color: 'primary.dark' }}>
                🥤 Máquina Carbonatada
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {presionCO2.toFixed(2)} PSI
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Componente: Gráfica Mini de Niveles (para card de almacenamiento) */
/* -------------------------------------------------------------------------- */

function NivelMiniChart({ chart, title }: { chart: any; title: string }) {
  const theme = useTheme();

  const hasData = chart && chart.categories && chart.categories.length > 0 && chart.series && chart.series.length > 0;
  
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
        formatter: (value: number) => `${value.toFixed(1)}%`,
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

function EstadoTiendaCard({ punto, latestSensorTimestamp }: any) {
  // Determinar si está online: GREEN si recibimos datos MQTT en los últimos 5 minutos, RED si no
  const FIVE_MINUTES_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
  const now = new Date().getTime();
  
  let isOnline = false;
  if (latestSensorTimestamp) {
    const timestampMs = new Date(latestSensorTimestamp).getTime();
    isOnline = (now - timestampMs) <= FIVE_MINUTES_MS;
  } else {
    // Fallback to punto.online if no timestamp available
    isOnline = punto.online || false;
  }
  
  // Obtener ubicación por defecto (la misma que se usa en el mapa)
  const defaultCity = 'Hermosillo';
  const defaultState = 'Sonora';
  
  // Usar ubicación del punto si existe, sino usar la ubicación por defecto del mapa
  // Verificar si tiene datos de ubicación válidos
  const hasCityData = punto.city?.city && punto.city?.state;
  
  const ciudad = hasCityData ? punto.city.city : defaultCity;
  const estado = hasCityData ? punto.city.state : defaultState;
  
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
      <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 600, color: 'primary.main' }}>
        Estado de la Tienda
      </Typography>

      {/* Información de estado */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, p: 1.5, borderRadius: 1, bgcolor: isOnline ? 'success.lighter' : 'error.lighter' }}>
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              bgcolor: isOnline ? 'success.main' : 'error.main',
              boxShadow: `0 0 8px ${isOnline ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)'}`,
              animation: isOnline ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.7 },
              }
            }}
          />
          <Typography variant="body1" fontWeight="600" sx={{ color: isOnline ? 'success.dark' : 'error.dark' }}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Typography>
        </Box>

        <Box sx={{ mb: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'grey.50' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Ubicación
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {ciudad}, {estado}
          </Typography>
        </Box>

        {punto.cliente?.name && (
          <Box sx={{ mb: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'grey.50' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Cliente
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {punto.cliente.name}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'grey.50' }}>
          <Typography variant="caption" color="text.secondary">
            Funcionamiento:
          </Typography>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: isOnline ? 'success.main' : 'error.main',
            }}
          />
          <Typography variant="body2" fontWeight="medium" sx={{ color: isOnline ? 'success.dark' : 'error.dark' }}>
            {isOnline ? 'Operativo' : 'Inactivo'}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2.5, borderWidth: 1 }} />

      {/* Mapa integrado - más compacto */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
          Ubicación en el mapa
        </Typography>
        <Box sx={{ borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider', height: 250 }}>
          <MapComponent 
            lat={punto.lat || punto.city?.lat || 29.149162901939928}
            long={punto.long || punto.city?.lon || -110.96483231003234}
          />
        </Box>
      </Box>
    </Card>
  );
}

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

/* -------------------------------------------------------------------------- */
/* 🧱 Componente: Mapa */
/* -------------------------------------------------------------------------- */

function MapComponent({ lat, long }: { lat: number; long: number }) {
  // Coordenadas por defecto si no se proporcionan (CAFFENIO Nuevo Progreso)
  // Coordenadas del lugar: 29.1452327, -110.9648541
  const defaultLat = 29.1452327;
  const defaultLon = -110.9648541;
  
  const mapLat = lat || defaultLat;
  const mapLon = long || defaultLon;
  
  // URL de Google Maps embed con las coordenadas (sin API key)
  const mapUrl = `https://www.google.com/maps?q=${mapLat},${mapLon}&z=15&output=embed&hl=es`;
  
  return (
    <Box sx={{ width: '100%', height: '400px', position: 'relative', overflow: 'hidden', borderRadius: 1 }}>
      <iframe
        width="100%"
        height="100%"
        style={{ border: 0 }}
        src={mapUrl}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Ubicación del Punto de Venta"
      />
    </Box>
  );
}

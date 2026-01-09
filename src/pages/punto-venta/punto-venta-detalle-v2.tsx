import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import { Box, Card, Chip, Grid, Alert, Paper, Button, Divider, Typography, CircularProgress } from '@mui/material';

import { fNumber } from 'src/utils/format-number';

import { CONFIG } from 'src/config-global';

import { Chart, useChart } from 'src/components/chart';

export default function PuntoVentaDetalleV2() {
  const { id } = useParams<{ id: string }>();
  const [punto, setPunto] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [chartDataNiveles, setChartDataNiveles] = useState<any>(null);
  const [tiwaterData, setTiwaterData] = useState<any>(null);
  const [tiwaterLoading, setTiwaterLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchTiwaterData = async (codigoTienda: string) => {
      try {
        setTiwaterLoading(true);
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
          }
        }
      } catch (error) {
        console.error('Error fetching tiwater data:', error);
      } finally {
        setTiwaterLoading(false);
      }
    };

    const fetchPuntoVentaDetails = async () => {
      try {
        // Use v2.0 endpoint for PostgreSQL data
        const response = await fetch(`${CONFIG.API_BASE_URL_V2}/puntoVentas/${id}/detalle`, {
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
        
        // Fetch tiwater sensor data if we have codigo_tienda
        const codigoTienda = puntoData.codigo_tienda || id;
        if (codigoTienda) {
          fetchTiwaterData(codigoTienda);
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

  return (
    <>
      <Helmet>
        <title>{`Detalle Punto de Venta V2 - ${CONFIG.appName}`}</title>
      </Helmet>
      <Box sx={{ p: 3 }}>
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
        <Divider sx={{ borderStyle: 'dashed', my: 2 }} />

        {/* Sección: Datos generales */}
        <DatosGenerales punto={punto} />

        <Divider sx={{ borderStyle: 'dashed', my: 3 }} />

        {/* Dashboard TIWater - Mostrar primero si hay datos */}
        {(tiwaterData || tiwaterProduct) && (
          <>
            <TiwaterDashboard 
              data={tiwaterData} 
              product={tiwaterProduct}
              loading={tiwaterLoading} 
            />
            <Divider sx={{ borderStyle: 'dashed', my: 3 }} />
          </>
        )}

        <Grid container spacing={2}>
          {/* Sección Izquierda: Osmosis + Niveles con Gráficas */}
          <Grid item xs={12} md={12} lg={5}>
            <OsmosisSection osmosis={osmosis} />
            <NivelesSection niveles={niveles} chartDataNiveles={chartDataNiveles} />
          </Grid>

          {/* Sección Derecha: Métricas */}
          <Grid item xs={12} md={12} lg={7}>
            <MetricasSection metricas={metricas} />
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
  const niveles = puntoData?.productos?.filter((p: any) => p.product_type === 'Nivel') || [];
  
  if (niveles.length === 0) {
    setChartDataNiveles(null);
    return;
  }

  const chartDataArray = niveles
    .filter((nivel: any) => {
      const hasHistorico = nivel.historico && 
                          nivel.historico.hours_with_data && 
                          Array.isArray(nivel.historico.hours_with_data) &&
                          nivel.historico.hours_with_data.length > 0;
      return hasHistorico;
    })
    .map((nivel: any) => {
      const historico = nivel.historico || {};
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
      const valorActual = nivel.status?.find((s: any) => s.code === 'liquid_level_percent')?.value || null;

      return {
        nivelId: nivel._id || nivel.id,
        nivelName: nivel.name,
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
    });

  const result = chartDataArray.length > 0 ? chartDataArray : null;
  setChartDataNiveles(result);
}

/* -------------------------------------------------------------------------- */
/* 🧱 Sección 1: Osmosis */
/* -------------------------------------------------------------------------- */

function OsmosisSection({ osmosis }: any) {
  if (osmosis.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 3 }}>
      {osmosis.map((p: any) => {
        // Extract values from status array (v2.0 format)
        const flowRate1 = p.status?.find((s: any) => s.code === 'flowrate_speed_1')?.value; // Flujo Producción
        const flowRate2 = p.status?.find((s: any) => s.code === 'flowrate_speed_2')?.value; // Flujo Rechazo
        const tds = p.status?.find((s: any) => s.code === 'tds_out')?.value;
        const levelPurificada = p.status?.find((s: any) => s.code === 'level_purificada')?.value;
        const levelRecuperada = p.status?.find((s: any) => s.code === 'level_recuperada')?.value;
        const presionIn = p.status?.find((s: any) => s.code === 'pressure_in')?.value;

        // Calcular eficiencia: (flujo_produccion / (flujo_produccion + flujo_rechazo)) * 100
        const totalFlujo = (flowRate1 || 0) + (flowRate2 || 0);
        const eficiencia = totalFlujo > 0 
          ? ((flowRate1 || 0) / totalFlujo * 100).toFixed(2)
          : 'N/A';

        // Calcular porcentajes de producción
        const porcentajeProd1 = totalFlujo > 0 
          ? ((flowRate1 || 0) / totalFlujo * 100).toFixed(2)
          : 'N/A';
        const porcentajeProd2 = totalFlujo > 0 
          ? ((flowRate2 || 0) / totalFlujo * 100).toFixed(2)
          : 'N/A';

        return (
          <Card key={p._id || p.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mb: 2 }}>
              <Typography variant="h6">{p.name || 'Sistema de Osmosis'}</Typography>
              <Chip 
                label={p.online ? 'Online' : 'Offline'} 
                color={p.online ? 'success' : 'error'} 
                size="small" 
              />
            </Box>
            <Divider sx={{ mb: 2 }} />

            {/* Producción: Flujo 1 y Porcentaje */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Producción
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Flujo 1
                  </Typography>
                  <Typography variant="h6">
                    {flowRate1 !== undefined ? `${flowRate1.toFixed(2)}` : 'N/A'} 
                    <Typography component="span" variant="caption"> L/min</Typography>
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Porcentaje
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {porcentajeProd1 !== 'N/A' ? `${porcentajeProd1}%` : 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Producción: Flujo 2 y Porcentaje */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Rechazo
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Flujo 2
                  </Typography>
                  <Typography variant="h6">
                    {flowRate2 !== undefined ? `${flowRate2.toFixed(2)}` : 'N/A'} 
                    <Typography component="span" variant="caption"> L/min</Typography>
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Porcentaje
                  </Typography>
                  <Typography variant="h6" color="secondary">
                    {porcentajeProd2 !== 'N/A' ? `${porcentajeProd2}%` : 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Eficiencia */}
            <Box sx={{ mb: 2, p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Eficiencia
              </Typography>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {eficiencia !== 'N/A' ? `${eficiencia}%` : 'N/A'}
              </Typography>
            </Box>

            {/* Otros datos adicionales */}
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  TDS
                </Typography>
                <Typography variant="body1">
                  {tds !== undefined ? `${tds.toFixed(1)}` : 'N/A'} 
                  <Typography component="span" variant="caption"> ppm</Typography>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Nivel Purificada
                </Typography>
                <Typography variant="body1">
                  {levelPurificada !== undefined ? `${levelPurificada.toFixed(1)}` : 'N/A'} 
                  <Typography component="span" variant="caption"> %</Typography>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Nivel Recuperada
                </Typography>
                <Typography variant="body1">
                  {levelRecuperada !== undefined ? `${levelRecuperada.toFixed(1)}` : 'N/A'} 
                  <Typography component="span" variant="caption"> %</Typography>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Presión Entrada
                </Typography>
                <Typography variant="body1">
                  {presionIn !== undefined ? `${presionIn.toFixed(1)}` : 'N/A'} 
                  <Typography component="span" variant="caption"> PSI</Typography>
                </Typography>
              </Grid>
            </Grid>
          </Card>
        );
      })}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Sección 2: Niveles con Gráficas */
/* -------------------------------------------------------------------------- */

function NivelesSection({ niveles, chartDataNiveles }: any) {
  if (niveles.length === 0) {
    return null;
  }

  return (
    <Box>
      {niveles.map((nivel: any) => {
        // Buscar el chartData correspondiente a este nivel
        const chartData = chartDataNiveles?.find((cd: any) => cd.nivelId === nivel._id || cd.nivelId === nivel.id);
        const valorActual = nivel.status?.find((s: any) => s.code === 'liquid_level_percent')?.value;

        return (
          <Box key={nivel._id || nivel.id} sx={{ mb: 3 }}>
            {/* Card con información del nivel */}
            <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">{nivel.name || 'Nivel'}</Typography>
                <Chip 
                  label={nivel.online ? 'Online' : 'Offline'} 
                  color={nivel.online ? 'success' : 'error'} 
                  size="small" 
                />
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Porcentaje de Nivel
                </Typography>
                <Typography variant="h3" color="primary" fontWeight="bold">
                  {valorActual !== undefined && valorActual !== null 
                    ? `${Number(valorActual).toFixed(1)}%` 
                    : 'N/A'}
                </Typography>
              </Box>
            </Card>

            {/* Gráfica histórica */}
            {chartData && (
              <NivelHistoricoChart nivelName={nivel.name} chart={chartData} />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Componente: Gráfica Histórica de Niveles */
/* -------------------------------------------------------------------------- */

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
    <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
      <CardHeader
        title={`Histórico de ${nivelName}`}
        subheader={valorActual !== null && valorActual !== undefined 
          ? `Valor actual: ${valorActual.toFixed(1)}%`
          : 'Valor actual: N/A'}
      />
      <Divider sx={{ mb: 2 }} />
      <Chart
        type="line"
        series={seriesWithYaxis}
        options={chartOptions}
        height={350}
        sx={{ py: 2 }}
      />
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Sección 3: Métricas */
/* -------------------------------------------------------------------------- */

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
/* 🧱 Sección: Datos Generales */
/* -------------------------------------------------------------------------- */

function DatosGenerales({ punto }: any) {
  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        {punto.name}
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={3}>
        {/* Información General - Lado Izquierdo */}
        <Grid item xs={12} md={6}>
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="overline" color="text.secondary" fontSize="0.75rem">
                Cliente
              </Typography>
              <Typography variant="h6" fontWeight="medium">
                {punto.cliente?.name || 'N/A'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="overline" color="text.secondary" fontSize="0.75rem">
                Ubicación
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {punto.city?.city || 'N/A'}, {punto.city?.state || 'N/A'}
              </Typography>
              {punto.city?.lat && punto.city?.lon && (
                <Typography variant="body2" color="text.secondary">
                  Lat: {punto.city.lat.toFixed(4)}, Lon: {punto.city.lon.toFixed(4)}
                </Typography>
              )}
            </Box>

            <Box>
              <Typography variant="overline" color="text.secondary" fontSize="0.75rem">
                Estado del Sistema
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip
                  label={punto.online ? 'En Línea' : 'Offline'}
                  color={punto.online ? 'success' : 'error'}
                  size="medium"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
            </Box>

            <Box>
              <Typography variant="overline" color="text.secondary" fontSize="0.75rem">
                Productos Instalados
              </Typography>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {punto.productos?.length || 0}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Mapa - Lado Derecho */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              bgcolor: 'background.neutral',
              borderRadius: 2,
              overflow: 'hidden',
              height: '350px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MapComponent 
              lat={punto.lat || punto.city?.lat || 29.149162901939928}
              long={punto.long || punto.city?.lon || -110.96483231003234}
            />
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Dashboard TIWater - Datos de Sensores en Tiempo Real */
/* -------------------------------------------------------------------------- */

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
    <Box sx={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', borderRadius: 2 }}>
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

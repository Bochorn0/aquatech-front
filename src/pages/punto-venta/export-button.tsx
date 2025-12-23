import type { Dayjs } from 'dayjs'; // Only import Dayjs as a type
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { useState } from 'react';
import { saveAs } from 'file-saver';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { Box, Grid, Switch, Button,  Divider, Typography, FormControlLabel } from '@mui/material';

import { get } from 'src/api/axiosHelper';

interface HourData {
  hora: string;
  tds_agrupado?: { tds: number; hora: string; timestamp: string }[];
  flujo_produccion_agrupado?: { flujo_produccion: number; hora: string; timestamp: string }[];
  flujo_rechazo_agrupado?: { flujo_rechazo: number; hora: string; timestamp: string }[];
  production_volume_agrupado?: { production_volume: number; hora: string; timestamp: string }[];
  rejected_volume_agrupado?: { rejected_volume: number; hora: string; timestamp: string }[];
  estadisticas?: {
    tds_promedio?: number;
    flujo_produccion_promedio?: number;
    flujo_rechazo_promedio?: number;
    production_volume_total?: number;
    rejected_volume_total?: number;
  };
}

interface ReportResponse {
  success: boolean;
  data?: {
    product?: { id: string; name: string };
    date?: string;
    total_logs?: number;
    hours_with_data?: HourData[];
  };
}

interface MonthlyReportResponse {
  success: boolean;
  data?: Array<{
    dia: string;
    inicio: {
      flowrate_total_1?: { hora: string; value: number } | null;
      flowrate_total_2?: { hora: string; value: number } | null;
      tds_out?: { hora: string; value: number } | null;
      flowrate_speed_1?: { hora: string; value: number } | null;
      flowrate_speed_2?: { hora: string; value: number } | null;
    };
    fin: {
      flowrate_total_1?: { hora: string; value: number } | null;
      flowrate_total_2?: { hora: string; value: number } | null;
      tds_out?: { hora: string; value: number } | null;
      flowrate_speed_1?: { hora: string; value: number } | null;
      flowrate_speed_2?: { hora: string; value: number } | null;
    };
    produccion: {
      flowrate_total_1?: { value: number; inicio: number; fin: number } | null;
      flowrate_total_2?: { value: number; inicio: number; fin: number } | null;
      tds_out?: { value: number; inicio: number; fin: number } | null;
      flowrate_speed_1?: { value: number; inicio: number; fin: number } | null;
      flowrate_speed_2?: { value: number; inicio: number; fin: number } | null;
    };
  }>;
  summary?: {
    producto: string;
    fechaInicio: string;
    fechaFin: string;
    totalDias: number;
    totalLogs: number;
  };
}

function ExportReportButton({ product }: { product: any }) {
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(1, 'month'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [useDateRange, setUseDateRange] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMonthly, setLoadingMonthly] = useState<boolean>(false);

  const fetchReportData = async () => {
    if (!product?.id) return null;

    const params: any = { product_id: product.id };

    if (useDateRange) {
      if (!startDate || !endDate) {
        alert('Por favor selecciona ambas fechas (inicio y fin)');
        return null;
      }
      if (startDate.isAfter(endDate)) {
        alert('La fecha de inicio debe ser anterior a la fecha de fin');
        return null;
      }
      params.start_date = startDate.format('YYYY-MM-DD');
      params.end_date = endDate.format('YYYY-MM-DD');
    } else {
      if (!selectedDate) {
        alert('Por favor selecciona una fecha');
        return null;
      }
      params.date = selectedDate.format('YYYY-MM-DD');
    }

    console.log('📡 Solicitando datos del backend:', params);

    const response = (await get(`/reportes/product-logs`, params)) as ReportResponse;

    console.log('✅ Respuesta cruda del backend:', response);
    return response?.data ?? null;
  };

  const handleExportExcel = async () => {
    setLoading(true);
    try {
      const data = await fetchReportData();
      if (!data || !data.hours_with_data || data.hours_with_data.length === 0) {
        alert('No se encontraron registros para esta fecha.');
        return;
      }

      const hours = data.hours_with_data;

      // ==========================
      // 1️⃣ Hoja: Resumen por hora
      // ==========================
      const resumen = hours.map((h) => ({
        Hora: h.hora,
        'Promedio TDS (ppm)': h.estadisticas?.tds_promedio ?? '',
        'Flujo Producción Promedio (L/min)': h.estadisticas?.flujo_produccion_promedio ?? '',
        'Flujo Rechazo Promedio (L/min)': h.estadisticas?.flujo_rechazo_promedio ?? '',
        'Volumen Producción Total (L)': h.estadisticas?.production_volume_total ?? '',
        'Volumen Rechazo Total (L)': h.estadisticas?.rejected_volume_total ?? '',
      }));

      const wsResumen = XLSX.utils.json_to_sheet(resumen);

      // ==========================
      // 2️⃣ Hojas: Datos brutos separados por tipo
      // ==========================
      
      // Datos brutos TDS
      const datosBrutosTDS: any[] = [];
      hours.forEach((h) => {
        const tdsData = h.tds_agrupado || [];
        tdsData.forEach((t) => {
          datosBrutosTDS.push({
            HoraBloque: h.hora,
            Valor: t.tds,
            HoraMedición: t.hora,
            Timestamp: t.timestamp,
          });
        });
      });
      const wsBrutosTDS = datosBrutosTDS.length > 0 ? XLSX.utils.json_to_sheet(datosBrutosTDS) : null;

      // Datos brutos Flujo Producción
      const datosBrutosFlujoProd: any[] = [];
      hours.forEach((h) => {
        const flujoProd = h.flujo_produccion_agrupado || [];
        flujoProd.forEach((f) => {
          datosBrutosFlujoProd.push({
            HoraBloque: h.hora,
            Valor: f.flujo_produccion,
            HoraMedición: f.hora,
            Timestamp: f.timestamp,
          });
        });
      });
      const wsBrutosFlujoProd = datosBrutosFlujoProd.length > 0 ? XLSX.utils.json_to_sheet(datosBrutosFlujoProd) : null;

      // Datos brutos Flujo Rechazo
      const datosBrutosFlujoRech: any[] = [];
      hours.forEach((h) => {
        const flujoRech = h.flujo_rechazo_agrupado || [];
        flujoRech.forEach((f) => {
          datosBrutosFlujoRech.push({
            HoraBloque: h.hora,
            Valor: f.flujo_rechazo,
            HoraMedición: f.hora,
            Timestamp: f.timestamp,
          });
        });
      });
      const wsBrutosFlujoRech = datosBrutosFlujoRech.length > 0 ? XLSX.utils.json_to_sheet(datosBrutosFlujoRech) : null;

      // Datos brutos Volumen Producción
      const datosBrutosVolProd: any[] = [];
      hours.forEach((h) => {
        const volProd = h.production_volume_agrupado || [];
        volProd.forEach((v) => {
          datosBrutosVolProd.push({
            HoraBloque: h.hora,
            Valor: v.production_volume,
            HoraMedición: v.hora,
            Timestamp: v.timestamp,
          });
        });
      });
      const wsBrutosVolProd = datosBrutosVolProd.length > 0 ? XLSX.utils.json_to_sheet(datosBrutosVolProd) : null;

      // Datos brutos Volumen Rechazo
      const datosBrutosVolRech: any[] = [];
      hours.forEach((h) => {
        const volRech = h.rejected_volume_agrupado || [];
        volRech.forEach((v) => {
          datosBrutosVolRech.push({
            HoraBloque: h.hora,
            Valor: v.rejected_volume,
            HoraMedición: v.hora,
            Timestamp: v.timestamp,
          });
        });
      });
      const wsBrutosVolRech = datosBrutosVolRech.length > 0 ? XLSX.utils.json_to_sheet(datosBrutosVolRech) : null;

      // ==========================
      // 3️⃣ Hoja: Mini gráfico (TDS)
      // ==========================
      const miniChart: (string | number)[][] = [];
      miniChart.push(['Hora', 'TDS Promedio', 'Gráfico']); // encabezado

      hours.forEach((h: any) => {
        const avg = h.estadisticas?.tds_promedio ?? 0;
        const bar = '█'.repeat(Math.min(20, Math.round(avg))); // mini gráfico ASCII
        miniChart.push([h.hora, avg, bar]);
      });

      const wsChart = XLSX.utils.aoa_to_sheet(miniChart);

      // ==========================
      // 🧾 Crear libro y guardar
      // ==========================
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen_por_Hora');
      
      // Agregar hojas de datos brutos solo si tienen datos
      if (wsBrutosTDS) XLSX.utils.book_append_sheet(wb, wsBrutosTDS, 'Datos_Brutos_TDS');
      if (wsBrutosFlujoProd) XLSX.utils.book_append_sheet(wb, wsBrutosFlujoProd, 'Datos_Brutos_Flujo_Prod');
      if (wsBrutosFlujoRech) XLSX.utils.book_append_sheet(wb, wsBrutosFlujoRech, 'Datos_Brutos_Flujo_Rech');
      if (wsBrutosVolProd) XLSX.utils.book_append_sheet(wb, wsBrutosVolProd, 'Datos_Brutos_Vol_Prod');
      if (wsBrutosVolRech) XLSX.utils.book_append_sheet(wb, wsBrutosVolRech, 'Datos_Brutos_Vol_Rech');
      
      XLSX.utils.book_append_sheet(wb, wsChart, 'Mini_Grafico_TDS');

      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      
      // Generar nombre de archivo según el tipo de reporte
      let fileName: string;
      if (useDateRange && startDate && endDate) {
        fileName = `Reporte_${product.name}_${startDate.format('DD-MM-YYYY')}_a_${endDate.format('DD-MM-YYYY')}.xlsx`;
      } else {
        fileName = `Reporte_${product.name}_${selectedDate?.format('DD-MM-YYYY')}.xlsx`;
      }

      saveAs(blob, fileName);
    } catch (error) {
      console.error('❌ Error al generar el Excel:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyReportData = async () => {
    if (!startDate || !endDate || !product?.id) return null;

    const startDateStr = startDate.format('YYYY-MM-DD');
    const endDateStr = endDate.format('YYYY-MM-DD');
    console.log('📡 Solicitando reporte mensual:', { product_id: product.id, startDate: startDateStr, endDate: endDateStr });

    // Enviar fechas como query params
    const response = (await get(`/reportes/mensual`, {
      dateStart: startDateStr,
      dateEnd: endDateStr,
    })) as MonthlyReportResponse;

    console.log('✅ Respuesta reporte mensual:', response);
    return response?.data ?? null;
  };

  const handleExportMonthlyExcel = async () => {
    setLoadingMonthly(true);
    try {
      const data = await fetchMonthlyReportData();
      if (!data || data.length === 0) {
        alert('No se encontraron registros para el rango de fechas seleccionado.');
        return;
      }

      // ==========================
      // 1️⃣ Hoja: Resumen de Producción Diaria
      // ==========================
      const resumenProduccion = data.map((dia) => ({
        Fecha: dia.dia,
        'Producción Total (L)': dia.produccion.flowrate_total_1?.value ?? '',
        'Inicio Producción': dia.produccion.flowrate_total_1?.inicio ?? '',
        'Fin Producción': dia.produccion.flowrate_total_1?.fin ?? '',
        'Rechazo Total (L)': dia.produccion.flowrate_total_2?.value ?? '',
        'Inicio Rechazo': dia.produccion.flowrate_total_2?.inicio ?? '',
        'Fin Rechazo': dia.produccion.flowrate_total_2?.fin ?? '',
        'Cambio TDS': dia.produccion.tds_out?.value ?? '',
        'TDS Inicial': dia.produccion.tds_out?.inicio ?? '',
        'TDS Final': dia.produccion.tds_out?.fin ?? '',
        'Velocidad Promedio Producción (L/s)': dia.produccion.flowrate_speed_1?.value ?? '',
        'Velocidad Promedio Rechazo (L/s)': dia.produccion.flowrate_speed_2?.value ?? '',
      }));

      const wsResumen = XLSX.utils.json_to_sheet(resumenProduccion);

      // ==========================
      // 2️⃣ Hoja: Valores Iniciales y Finales
      // ==========================
      const valoresInicioFin = data.map((dia) => ({
        Fecha: dia.dia,
        'Inicio - Producción Total': dia.inicio.flowrate_total_1?.value ?? '',
        'Inicio - Hora Producción': dia.inicio.flowrate_total_1?.hora ?? '',
        'Inicio - Rechazo Total': dia.inicio.flowrate_total_2?.value ?? '',
        'Inicio - Hora Rechazo': dia.inicio.flowrate_total_2?.hora ?? '',
        'Inicio - TDS': dia.inicio.tds_out?.value ?? '',
        'Inicio - Hora TDS': dia.inicio.tds_out?.hora ?? '',
        'Inicio - Velocidad Producción': dia.inicio.flowrate_speed_1?.value ?? '',
        'Inicio - Velocidad Rechazo': dia.inicio.flowrate_speed_2?.value ?? '',
        'Fin - Producción Total': dia.fin.flowrate_total_1?.value ?? '',
        'Fin - Hora Producción': dia.fin.flowrate_total_1?.hora ?? '',
        'Fin - Rechazo Total': dia.fin.flowrate_total_2?.value ?? '',
        'Fin - Hora Rechazo': dia.fin.flowrate_total_2?.hora ?? '',
        'Fin - TDS': dia.fin.tds_out?.value ?? '',
        'Fin - Hora TDS': dia.fin.tds_out?.hora ?? '',
        'Fin - Velocidad Producción': dia.fin.flowrate_speed_1?.value ?? '',
        'Fin - Velocidad Rechazo': dia.fin.flowrate_speed_2?.value ?? '',
      }));

      const wsInicioFin = XLSX.utils.json_to_sheet(valoresInicioFin);

      // ==========================
      // 3️⃣ Hoja: Estadísticas Resumen
      // ==========================
      const totalProduccion = data.reduce((sum, dia) => {
        const prod = dia.produccion.flowrate_total_1?.value ?? 0;
        return sum + (typeof prod === 'number' ? prod : 0);
      }, 0);

      const totalRechazo = data.reduce((sum, dia) => {
        const rech = dia.produccion.flowrate_total_2?.value ?? 0;
        return sum + (typeof rech === 'number' ? rech : 0);
      }, 0);

      const promedioVelocidadProd = data.reduce((sum, dia) => {
        const vel = dia.produccion.flowrate_speed_1?.value ?? 0;
        return sum + (typeof vel === 'number' ? vel : 0);
      }, 0) / data.length;

      const promedioVelocidadRech = data.reduce((sum, dia) => {
        const vel = dia.produccion.flowrate_speed_2?.value ?? 0;
        return sum + (typeof vel === 'number' ? vel : 0);
      }, 0) / data.length;

      const estadisticas = [
        { Métrica: 'Total Días', Valor: data.length },
        { Métrica: 'Producción Total Acumulada (L)', Valor: totalProduccion.toFixed(2) },
        { Métrica: 'Rechazo Total Acumulado (L)', Valor: totalRechazo.toFixed(2) },
        { Métrica: 'Promedio Velocidad Producción (L/s)', Valor: promedioVelocidadProd.toFixed(2) },
        { Métrica: 'Promedio Velocidad Rechazo (L/s)', Valor: promedioVelocidadRech.toFixed(2) },
        { Métrica: 'Fecha Inicio', Valor: startDate?.format('DD-MM-YYYY') ?? '' },
        { Métrica: 'Fecha Fin', Valor: endDate?.format('DD-MM-YYYY') ?? '' },
      ];

      const wsEstadisticas = XLSX.utils.json_to_sheet(estadisticas);

      // ==========================
      // 🧾 Crear libro y guardar
      // ==========================
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Producción_Diaria');
      XLSX.utils.book_append_sheet(wb, wsInicioFin, 'Valores_Inicio_Fin');
      XLSX.utils.book_append_sheet(wb, wsEstadisticas, 'Estadísticas');

      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const fileName = `Reporte_Mensual_${product.name}_${startDate?.format('DD-MM-YYYY')}_${endDate?.format('DD-MM-YYYY')}.xlsx`;

      saveAs(blob, fileName);
    } catch (error) {
      console.error('❌ Error al generar el Excel mensual:', error);
      alert('Error al generar el reporte mensual. Por favor, intente nuevamente.');
    } finally {
      setLoadingMonthly(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {/* Reporte Completo (con opción de fecha única o rango) */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
            Reporte Completo (por Fecha)
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={useDateRange}
                    onChange={(e) => setUseDateRange(e.target.checked)}
                    size="small"
                  />
                }
                label="Usar rango de fechas"
              />
            </Grid>
            
            {useDateRange ? (
              <>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Fecha de Inicio"
                    value={startDate}
                    format="DD-MM-YYYY"
                    onChange={(newValue) => setStartDate(newValue)}
                    slotProps={{
                      textField: { fullWidth: true, size: 'small' },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Fecha de Fin"
                    value={endDate}
                    format="DD-MM-YYYY"
                    onChange={(newValue) => setEndDate(newValue)}
                    slotProps={{
                      textField: { fullWidth: true, size: 'small' },
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={handleExportExcel}
                    disabled={loading || !startDate || !endDate}
                  >
                    {loading ? 'Generando...' : 'Exportar Reporte Completo'}
                  </Button>
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Fecha del Reporte"
                    value={selectedDate}
                    format="DD-MM-YYYY"
                    onChange={(newValue) => setSelectedDate(newValue)}
                    slotProps={{
                      textField: { fullWidth: true, size: 'small' },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={handleExportExcel}
                    disabled={loading || !selectedDate}
                  >
                    {loading ? 'Generando...' : 'Exportar Reporte Completo'}
                  </Button>
                </Grid>
              </>
            )}
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Reporte Mensual (siempre por rango de fechas) */}
        <Box>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
            Reporte Mensual (por Rango de Fechas)
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Fecha Inicio"
                value={startDate}
                format="DD-MM-YYYY"
                onChange={(newValue) => setStartDate(newValue)}
                slotProps={{
                  textField: { fullWidth: true, size: 'small' },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Fecha Fin"
                value={endDate}
                format="DD-MM-YYYY"
                onChange={(newValue) => setEndDate(newValue)}
                slotProps={{
                  textField: { fullWidth: true, size: 'small' },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                onClick={handleExportMonthlyExcel}
                disabled={loadingMonthly || !startDate || !endDate}
              >
                {loadingMonthly ? 'Generando...' : 'Generar Reporte Mensual'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </LocalizationProvider>
    </Box>
  );
}

export { ExportReportButton };

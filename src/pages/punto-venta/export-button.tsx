import type { Dayjs } from 'dayjs'; // Only import Dayjs as a type
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { useState } from 'react';
import { saveAs } from 'file-saver';

import { Box, Grid, Button } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';

import { get } from 'src/api/axiosHelper';

interface HourData {
  hora: string;
  tds_agrupado?: { tds: number; hora: string; timestamp: string }[];
  flujo_produccion_agrupado?: { flujo_produccion: number; hora: string; timestamp: string }[];
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

function ExportReportButton({ product }: { product: any }) {
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
  const [loading, setLoading] = useState<boolean>(false);

  const fetchReportData = async () => {
    if (!selectedDate || !product?.id) return null;

    const dateStr = selectedDate.format('YYYY-MM-DD');
    console.log('📡 Solicitando datos del backend:', { product_id: product.id, date: dateStr });

    const response = (await get(`/reportes/product-logs`, {
      product_id: product.id,
      date: dateStr,
    })) as ReportResponse;

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
      // 2️⃣ Hoja: Datos brutos
      // ==========================
      const datosBrutos: any[] = [];

      hours.forEach((h) => {
        const tdsData = h.tds_agrupado || [];
        const flujoProd = h.flujo_produccion_agrupado || [];

        tdsData.forEach((t) => {
          datosBrutos.push({
            HoraBloque: h.hora,
            Tipo: 'TDS',
            Valor: t.tds,
            HoraMedición: t.hora,
            Timestamp: t.timestamp,
          });
        });

        flujoProd.forEach((f) => {
          datosBrutos.push({
            HoraBloque: h.hora,
            Tipo: 'Flujo Producción',
            Valor: f.flujo_produccion,
            HoraMedición: f.hora,
            Timestamp: f.timestamp,
          });
        });
      });

      const wsBrutos = XLSX.utils.json_to_sheet(datosBrutos);

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
      XLSX.utils.book_append_sheet(wb, wsBrutos, 'Datos_Brutos');
      XLSX.utils.book_append_sheet(wb, wsChart, 'Mini_Grafico_TDS');

      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const fileName = `Reporte_${product.name}_${selectedDate?.format('DD-MM-YYYY')}.xlsx`;

      saveAs(blob, fileName);
    } catch (error) {
      console.error('❌ Error al generar el Excel:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Grid container spacing={2} alignItems="center">
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
              {loading ? 'Generando...' : 'Descargar Excel'}
            </Button>
          </Grid>
        </Grid>
      </LocalizationProvider>
    </Box>
  );
}

export { ExportReportButton };

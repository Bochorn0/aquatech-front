import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { Box, Alert, Stack, Button, Typography, CircularProgress } from '@mui/material';

import { normalizeProductTypeFromStatus } from 'src/utils/product-apagador';

import { get } from 'src/api/axiosHelper';
import { CONFIG } from 'src/config-global';

import ProductHistoricoLogs from './product-historico-logs';

import type { Product } from '../types';

/**
 * Ruta dedicada `/Equipos/:id/historico` para el mismo bloque que la pestaña en detalle del producto.
 */
export default function ProductHistoricoPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!id) {
        setLoading(false);
        setError('Falta el identificador del equipo.');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const raw = await get<Product>(`/products/${encodeURIComponent(id)}`);
        if (!cancelled) {
          setProduct(normalizeProductTypeFromStatus(raw));
        }
      } catch {
        if (!cancelled) {
          setError('No se pudo cargar el equipo.');
          setProduct(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading || id == null || id === '') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !product) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error ?? 'No se encontró el producto.'}</Alert>
        <Button sx={{ mt: 2 }} component="a" href="/Equipos/historico" variant="outlined">
          Lista histórico Tuya
        </Button>
      </Box>
    );
  }

  const isOsmosis = String(product.product_type ?? '').toLowerCase() === 'osmosis';

  return (
    <>
      <Helmet>
        <title>{`Histórico Tuya — ${product.name ?? product.id} - ${CONFIG.appName}`}</title>
      </Helmet>
      <Box sx={{ p: 3 }}>
        <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mb: 2 }}>
          <Button variant="outlined" component="a" href={`/Equipos/${encodeURIComponent(product.id)}`}>
            Volver al detalle
          </Button>
          <Button variant="outlined" component="a" href="/Equipos/historico">
            Lista histórico
          </Button>
          <Typography variant="h6" sx={{ alignSelf: 'center' }}>
            {product.name ?? product.id}
          </Typography>
        </Stack>

        {!isOsmosis ? (
          <Alert severity="info">
            El histórico Tuya por totales y TDS aplica sólo a equipos Osmosis. Este equipo es tipo{' '}
            <strong>{product.product_type ?? 'desconocido'}</strong>. Use los logs desde el detalle si aplica.
          </Alert>
        ) : !product.tuya_logs_routine_enabled ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Este equipo no tiene la rutina de logs Tuya habilitada; no está disponible en la vista de histórico.
            Actívela en Personalización → Productos rutina logs, o vuelva a la lista de equipos elegibles.
          </Alert>
        ) : (
          <ProductHistoricoLogs routineEnabled />
        )}
      </Box>
    </>
  );
}

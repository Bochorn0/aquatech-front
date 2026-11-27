import { useEffect, useRef, useState } from 'react';

import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';

import { get, patch } from 'src/api/axiosHelper';

import {
  ControllerRulesFields,
  rulesFromController,
  validateControllerRules,
} from '../controller-rules-dialog';

import type { Controller, Product } from '../types';

function sameProduct(controller: Controller, product: Product) {
  const ids = [product._id, product.id, product.product_id]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  const devices = [product.device_id, product.product_id]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  const linked = [controller.product, controller.product_id]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  const linkedDevice = String(controller.product_device_id || '').trim();
  return linked.some((id) => ids.includes(id)) || (linkedDevice !== '' && devices.includes(linkedDevice));
}

export function TodoEnUnoPanel({ product }: { product: Product }) {
  const [controller, setController] = useState<Controller | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');

  const productIdentity = [product._id, product.id, product.product_id, product.device_id].join('|');
  const productRef = useRef(product);
  productRef.current = product;

  useEffect(() => {
    let cancelled = false;
    const current = productRef.current;
    setLoading(true);
    get<Controller[]>('/controllers')
      .then(async (rows) => {
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : [];
        const match = list.find((item) => sameProduct(item, current));
        if (!match) {
          setController(null);
          return;
        }
        const deviceId = String(match.device_id || match.id || match._id || '').trim();
        const full = deviceId
          ? await get<Controller>(`/controllers/${encodeURIComponent(deviceId)}`)
          : match;
        if (!cancelled) setController(full);
      })
      .catch(() => {
        if (!cancelled) setNote('No se pudo cargar el controlador de este producto.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productIdentity]);

  const save = async () => {
    if (!controller) return;
    const rules = rulesFromController(controller.rules);
    const message = validateControllerRules(rules);
    if (message) {
      setNote(message);
      return;
    }
    const deviceId = String(controller.device_id || controller.id || controller._id || '').trim();
    setSaving(true);
    setNote('');
    try {
      const updated = await patch<Controller>(`/controllers/${encodeURIComponent(deviceId)}`, {
        name: controller.name,
        cliente: controller.cliente || null,
        time_zone: controller.time_zone || '-07:00',
        product: controller.product || null,
        product_name: controller.product_name || product.name || null,
        product_device_id: controller.product_device_id || null,
        rules,
      });
      setController({ ...controller, ...updated, rules: rulesFromController(updated.rules) });
      setNote('Reglas guardadas.');
    } catch (error) {
      console.error('Error guardando todo en uno:', error);
      setNote('No se pudieron guardar las reglas.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6">Todo en uno</Typography>
          <Typography variant="body2" color="text.secondary">
            Cinco presiones, cinco flujos y tres relevadores. Ósmosis, nivel y presión siguen en sus propias pantallas.
          </Typography>
        </Box>
        {note ? <Alert severity={note === 'Reglas guardadas.' ? 'success' : 'warning'}>{note}</Alert> : null}
        {controller ? (
          <>
            <Typography variant="body2">
              Controlador <strong>{controller.name}</strong>
            </Typography>
            <ControllerRulesFields
              rules={rulesFromController(controller.rules)}
              onChange={(rules) => setController((prev) => (prev ? { ...prev, rules } : prev))}
              active
            />
            <Box>
              <Button variant="contained" onClick={save} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar reglas'}
              </Button>
            </Box>
          </>
        ) : (
          <Alert severity="info">
            Este producto todavía no tiene un controlador ligado. En Controladores elige este producto para manejar las cinco presiones, los cinco flujos y los tres relevadores.
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}

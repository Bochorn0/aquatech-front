import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import Swal from 'sweetalert2';

import { get, post, remove } from 'src/api/axiosHelper';
import { Iconify } from 'src/components/iconify';
import { StyledTableCellHeader, StyledTableRow, StyledTableCell, StyledTableContainer } from 'src/utils/styles';

import type { MetricRule, Product } from './types';

const SENSOR_OPTIONS = [
  { value: 'tds_out', label: 'TDS salida (tds_out)' },
  { value: 'temperature', label: 'Temperatura' },
  { value: 'flowrate_speed_1', label: 'Flujo producción (L/min)' },
  { value: 'flowrate_speed_2', label: 'Flujo rechazo (L/min)' },
  { value: 'flowrate_total_1', label: 'Total producción' },
  { value: 'flowrate_total_2', label: 'Total rechazo' },
  { value: 'liquid_level_percent', label: 'Nivel %' },
  { value: 'presion_in', label: 'Presión entrada' },
  { value: 'presion_out', label: 'Presión salida' },
];

type TuyaAlertConfig = {
  id: string;
  device_id: string;
  client_id: string;
  sensor_code: string;
  display_name?: string;
  rules: MetricRule[];
  enabled: boolean;
};

type TuyaAlertContact = {
  id: string;
  config_id?: string;
  usuario: string;
  correo: string;
  celular?: string;
  dashboardAlert?: boolean;
  dashboard_alert?: boolean;
  emailAlert?: boolean;
  email_alert?: boolean;
  preventivo?: boolean;
  correctivo?: boolean;
  emailCooldownMinutes?: number;
  emailMaxPerDay?: number;
};

const defaultRules: MetricRule[] = [
  { min: 0, max: 50, color: '#00B050', label: 'Normal', severity: 'normal' },
  { min: 50, max: 120, color: '#FFFF00', label: 'Preventivo', severity: 'preventivo' },
  { min: 120, max: null, color: '#EE0000', label: 'Crítico', severity: 'critico' },
];

function getProductDeviceKey(p: Product & { device_id?: string }) {
  const id = p.device_id ?? p.id;
  if (id != null && String(id)) return String(id);
  return p._id != null ? String(p._id) : '';
}

export function PersonalizacionTuyaAlertsTab({ products }: { products: Product[] }) {
  const [deviceId, setDeviceId] = useState('');
  const [configs, setConfigs] = useState<TuyaAlertConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<TuyaAlertContact[]>([]);

  const [newSensor, setNewSensor] = useState('tds_out');
  const [newDisplay, setNewDisplay] = useState('');
  const [rulesJson, setRulesJson] = useState(JSON.stringify(defaultRules, null, 2));

  const [cUsuario, setCUsuario] = useState('');
  const [cCorreo, setCCorreo] = useState('');
  const [cCel, setCCel] = useState('');
  const [cDash, setCDash] = useState(true);
  const [cEmail, setCEmail] = useState(true);
  const [cPrev, setCPrev] = useState(true);
  const [cCorr, setCCorr] = useState(true);

  const selectedProduct = useMemo(
    () => products.find((p) => getProductDeviceKey(p as Product & { device_id?: string }) === deviceId),
    [products, deviceId]
  );

  const clientIdForDevice = useMemo(() => {
    const c = selectedProduct?.cliente ?? (selectedProduct as { client_id?: string })?.client_id;
    if (c != null && typeof c === 'object') return String((c as { id?: string; _id?: string }).id ?? (c as { _id?: string })._id ?? '');
    return c != null ? String(c) : '';
  }, [selectedProduct]);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const q = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
      const res = await get<TuyaAlertConfig[]>(`/tuya-product-alerts/configs${q}`);
      setConfigs(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No se pudieron cargar las alertas Tuya.', 'error');
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const openContacts = async (configId: string) => {
    setActiveConfigId(configId);
    setContactOpen(true);
    try {
      const res = await get<TuyaAlertContact[]>(`/tuya-product-alerts/configs/${configId}/contacts`);
      setContacts(Array.isArray(res) ? res : []);
    } catch {
      setContacts([]);
    }
  };

  const saveNewConfig = async () => {
    if (!deviceId || !clientIdForDevice) {
      Swal.fire('Atención', 'Seleccione un equipo con cliente asignado.', 'warning');
      return;
    }
    let rules: MetricRule[];
    try {
      rules = JSON.parse(rulesJson);
      if (!Array.isArray(rules)) throw new Error('rules debe ser un arreglo');
    } catch (err: unknown) {
      Swal.fire('JSON inválido', (err as Error).message, 'error');
      return;
    }
    setLoading(true);
    try {
      await post('/tuya-product-alerts/configs', {
        device_id: deviceId,
        client_id: clientIdForDevice,
        sensor_code: newSensor,
        display_name: newDisplay || newSensor,
        rules,
        enabled: true,
      });
      setCfgOpen(false);
      setRulesJson(JSON.stringify(defaultRules, null, 2));
      await loadConfigs();
      Swal.fire('Listo', 'Configuración creada.', 'success');
    } catch (e: unknown) {
      Swal.fire('Error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al guardar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleEnabled = async (cfg: TuyaAlertConfig) => {
    try {
      await patch(`/tuya-product-alerts/configs/${cfg.id}`, { enabled: !cfg.enabled });
      await loadConfigs();
    } catch {
      Swal.fire('Error', 'No se pudo actualizar.', 'error');
    }
  };

  const deleteCfg = async (id: string) => {
    const ok = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar?',
      showCancelButton: true,
      confirmButtonText: 'Sí',
    });
    if (!ok.isConfirmed) return;
    try {
      await remove(`/tuya-product-alerts/configs/${id}`);
      await loadConfigs();
    } catch {
      Swal.fire('Error', 'No se pudo eliminar.', 'error');
    }
  };

  const saveContact = async () => {
    if (!activeConfigId || !cUsuario.trim() || !cCorreo.trim()) {
      Swal.fire('Atención', 'Usuario y correo son obligatorios.', 'warning');
      return;
    }
    try {
      await post(`/tuya-product-alerts/configs/${activeConfigId}/contacts`, {
        usuario: cUsuario.trim(),
        correo: cCorreo.trim(),
        celular: cCel.trim() || undefined,
        dashboardAlert: cDash,
        emailAlert: cEmail,
        preventivo: cPrev,
        correctivo: cCorr,
      });
      setCUsuario('');
      setCCorreo('');
      setCCel('');
      const res = await get<TuyaAlertContact[]>(`/tuya-product-alerts/configs/${activeConfigId}/contacts`);
      setContacts(Array.isArray(res) ? res : []);
      Swal.fire('Listo', 'Contacto agregado.', 'success');
    } catch (e: unknown) {
      Swal.fire('Error', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error', 'error');
    }
  };

  const deleteContact = async (cid: string) => {
    try {
      await remove(`/tuya-product-alerts/contacts/${cid}`);
      if (activeConfigId) {
        const res = await get<TuyaAlertContact[]>(`/tuya-product-alerts/configs/${activeConfigId}/contacts`);
        setContacts(Array.isArray(res) ? res : []);
      }
    } catch {
      Swal.fire('Error', 'No se pudo eliminar el contacto.', 'error');
    }
  };

  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Alertas Tuya (equipos)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Reglas por código de estado Tuya (independiente de métricas MQTT v2). Al actualizar datos del equipo (Tuya o
        componentInput) se evalúan reglas y se notifica según contactos.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <TextField
          select
          label="Equipo (device_id)"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          sx={{ minWidth: 280 }}
        >
          <MenuItem value="">— Todos (lista) —</MenuItem>
          {products.map((p) => {
            const id = getProductDeviceKey(p as Product & { device_id?: string });
            return (
              <MenuItem key={id} value={id}>
                {p.name || id} ({id})
              </MenuItem>
            );
          })}
        </TextField>
        <Button variant="contained" disabled={!deviceId} onClick={() => setCfgOpen(true)}>
          Nueva regla
        </Button>
        <Button variant="outlined" onClick={loadConfigs} disabled={loading}>
          Actualizar
        </Button>
      </Box>

      <StyledTableContainer>
        <Paper elevation={2}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <StyledTableCellHeader>Equipo</StyledTableCellHeader>
                <StyledTableCellHeader>Sensor</StyledTableCellHeader>
                <StyledTableCellHeader>Nombre</StyledTableCellHeader>
                <StyledTableCellHeader>Activo</StyledTableCellHeader>
                <StyledTableCellHeader>Acciones</StyledTableCellHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {configs.map((c) => (
                <StyledTableRow key={c.id}>
                  <StyledTableCell>{c.device_id}</StyledTableCell>
                  <StyledTableCell>{c.sensor_code}</StyledTableCell>
                  <StyledTableCell>{c.display_name || '—'}</StyledTableCell>
                  <StyledTableCell>
                    <Switch checked={!!c.enabled} onChange={() => toggleEnabled(c)} />
                  </StyledTableCell>
                  <StyledTableCell>
                    <Button size="small" onClick={() => openContacts(c.id)}>
                      Contactos
                    </Button>
                    <IconButton size="small" color="error" onClick={() => deleteCfg(c.id)}>
                      <Iconify icon="solar:trash-bin-trash-bold-duotone" width={20} />
                    </IconButton>
                  </StyledTableCell>
                </StyledTableRow>
              ))}
              {!configs.length && (
                <TableRow>
                  <TableCell colSpan={5}>
                    {deviceId ? 'Sin configuraciones para este equipo.' : 'Seleccione un equipo o cree una regla.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      </StyledTableContainer>

      <Dialog open={cfgOpen} onClose={() => setCfgOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nueva alerta Tuya</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField select label="Sensor (código Tuya)" value={newSensor} onChange={(e) => setNewSensor(e.target.value)}>
            {SENSOR_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Nombre mostrado" value={newDisplay} onChange={(e) => setNewDisplay(e.target.value)} />
          <TextField
            label="Reglas (JSON, mismo formato que métricas v2: min, max, severity)"
            value={rulesJson}
            onChange={(e) => setRulesJson(e.target.value)}
            multiline
            minRows={8}
          />
          <Button size="small" onClick={() => setRulesJson(JSON.stringify(defaultRules, null, 2))}>
            Plantilla TDS (ejemplo)
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCfgOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={saveNewConfig} disabled={loading}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={contactOpen} onClose={() => setContactOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Contactos y permisos (Tuya)</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>
            Nuevo contacto
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <TextField size="small" label="Usuario" value={cUsuario} onChange={(e) => setCUsuario(e.target.value)} />
            <TextField size="small" label="Correo" value={cCorreo} onChange={(e) => setCCorreo(e.target.value)} sx={{ minWidth: 200 }} />
            <TextField size="small" label="Celular" value={cCel} onChange={(e) => setCCel(e.target.value)} />
            <FormControlLabel control={<Switch checked={cDash} onChange={(e) => setCDash(e.target.checked)} />} label="Dashboard" />
            <FormControlLabel control={<Switch checked={cEmail} onChange={(e) => setCEmail(e.target.checked)} />} label="Email" />
            <FormControlLabel control={<Switch checked={cPrev} onChange={(e) => setCPrev(e.target.checked)} />} label="Preventivo" />
            <FormControlLabel control={<Switch checked={cCorr} onChange={(e) => setCCorr(e.target.checked)} />} label="Correctivo" />
            <Button variant="contained" onClick={saveContact}>
              Agregar
            </Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <StyledTableCellHeader>Usuario</StyledTableCellHeader>
                <StyledTableCellHeader>Correo</StyledTableCellHeader>
                <StyledTableCellHeader>Dash</StyledTableCellHeader>
                <StyledTableCellHeader>Email</StyledTableCellHeader>
                <StyledTableCellHeader />
              </TableRow>
            </TableHead>
            <TableBody>
              {contacts.map((x) => (
                <TableRow key={x.id}>
                  <TableCell>{x.usuario}</TableCell>
                  <TableCell>{x.correo}</TableCell>
                  <TableCell>{x.dashboardAlert || x.dashboard_alert ? 'Sí' : 'No'}</TableCell>
                  <TableCell>{x.emailAlert || x.email_alert ? 'Sí' : 'No'}</TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" onClick={() => deleteContact(x.id)}>
                      <Iconify icon="solar:trash-bin-trash-bold-duotone" width={18} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContactOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

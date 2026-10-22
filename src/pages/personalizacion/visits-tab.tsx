import Swal from 'sweetalert2';
import { useMemo, useState, useEffect, useCallback } from 'react';

import {
  Box,
  Chip,
  Grid,
  Paper,
  Table,
  Button,
  Switch,
  Select,
  Divider,
  MenuItem,
  TableRow,
  TableBody,
  TableHead,
  TextField,
  Typography,
  InputLabel,
  FormControl,
  TablePagination,
  CircularProgress,
  FormControlLabel,
} from '@mui/material';

import { StyledTableRow, StyledTableCell, StyledTableContainer, StyledTableCellHeader } from 'src/utils/styles';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/iconify';

type EventType = 'visita_tecnica' | 'instalacion' | 'mantenimiento';

type VisitRule = {
  id: number;
  client_id?: number;
  event_type: EventType;
  interval_months: number | null;
  label: string;
  enabled: boolean;
  duration_minutes: number;
  notification_days_before: number;
  reminder_hour: number;
  start_time: string;
  horizon_months: number;
  guests: string[];
  notes: string | null;
};

type ClientOption = { id: string; name: string; email: string };

type ScheduledVisit = {
  id: number;
  series_id: string;
  event_type: EventType;
  interval_months: number | null;
  interval_weeks: number | null;
  title: string;
  client_name: string | null;
  punto_venta_name: string | null;
  codigo_tienda: string | null;
  starts_at: string;
  time_zone: string;
  guests: string[];
  notification_days_before: number;
  meet_link: string | null;
  calendar_link: string | null;
  reminder_sent_at: string | null;
};

type PuntoOption = {
  id: string;
  name: string;
  codigo: string;
  client: string;
  clientId: string;
};

type RuleDraft = VisitRule & { guestInput: string };

const TYPE_LABEL: Record<EventType, string> = {
  visita_tecnica: 'Visitas técnicas',
  instalacion: 'Instalación',
  mantenimiento: 'Mantenimiento',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function apiV2(endpoint: string, method = 'GET', data?: object) {
  const response = await fetch(`${CONFIG.API_BASE_URL_V2}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) {
    throw new Error(body?.message || `Error ${response.status}`);
  }
  return body;
}

function tomorrowYmd() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addMonthsYmd(ymd: string, months: number) {
  const [year, month, day] = ymd.split('-').map(Number);
  const cursor = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)).getUTCDate();
  const result = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), Math.min(day, lastDay)));
  return result.toISOString().slice(0, 10);
}

function addDaysYmd(ymd: string, days: number) {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function countOccurrences(date: string, every: number, horizon: number, unit: 'once' | 'weeks' | 'months') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || unit === 'once' || !every) return 1;
  const step = unit === 'weeks' ? every * 7 : 0;
  const end = unit === 'weeks' ? addDaysYmd(date, horizon * 7) : addMonthsYmd(date, horizon);
  let cursor = date;
  let count = 0;
  while (cursor < end && count < 40) {
    count += 1;
    cursor = unit === 'weeks' ? addDaysYmd(cursor, step) : addMonthsYmd(cursor, every);
  }
  return count;
}

function formatWhen(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: timeZone || 'America/Tijuana',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function GuestEditor({
  guests,
  input,
  onInput,
  onChange,
}: {
  guests: string[];
  input: string;
  onInput: (value: string) => void;
  onChange: (guests: string[]) => void;
}) {
  const add = () => {
    const email = input.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      Swal.fire({ icon: 'warning', title: 'Correo inválido', text: email });
      return;
    }
    if (!guests.includes(email)) onChange([...guests, email]);
    onInput('');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          fullWidth
          label="Invitado"
          placeholder="correo@ejemplo.com"
          value={input}
          onChange={(event) => onInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button variant="outlined" onClick={add}>Agregar</Button>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
        {guests.map((email) => (
          <Chip key={email} label={email} size="small" onDelete={() => onChange(guests.filter((item) => item !== email))} />
        ))}
        {guests.length === 0 && (
          <Typography variant="caption" color="text.secondary">Sin invitados. El Meet se crea igual en el calendario de mantenimiento.</Typography>
        )}
      </Box>
    </Box>
  );
}

function blankRule(): RuleDraft {
  return {
    id: 0,
    event_type: 'visita_tecnica',
    interval_months: 3,
    label: '',
    enabled: true,
    duration_minutes: 60,
    notification_days_before: 7,
    reminder_hour: 9,
    start_time: '10:00',
    horizon_months: 24,
    guests: [],
    notes: '',
    guestInput: '',
  };
}

export function VisitsTab() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [creating, setCreating] = useState(false);
  const [rules, setRules] = useState<VisitRule[]>([]);
  const [drafts, setDrafts] = useState<Record<number, RuleDraft>>({});
  const [visits, setVisits] = useState<ScheduledVisit[]>([]);
  const [puntos, setPuntos] = useState<PuntoOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState('');
  const [newRule, setNewRule] = useState<RuleDraft>(blankRule);
  const [page, setPage] = useState(0);
  const [guestInput, setGuestInput] = useState('');
  const [schedule, setSchedule] = useState({
    name: '',
    event_type: 'mantenimiento' as EventType,
    repeat: 'once' as 'once' | 'weeks' | 'months',
    interval_weeks: 1,
    horizon_weeks: 12,
    interval_months: 3,
    horizon_months: 12,
    client_id: '',
    punto_venta_id: '',
    date: tomorrowYmd(),
    start_time: '10:00',
    duration_minutes: 60,
    notification_days_before: 7,
    reminder_hour: 9,
    guests: [] as string[],
    notes: '',
  });

  const loadAgenda = useCallback(async () => {
    const body = await apiV2('/scheduled-visits');
    setVisits(body.data || []);
  }, []);

  const loadClient = useCallback(async (id: string) => {
    if (!id) {
      setRules([]);
      setDrafts({});
      return;
    }
    setRules([]);
    setDrafts({});
    setLoading(true);
    try {
      const rulesBody = await apiV2(`/visit-rules?client_id=${id}`);
      const nextRules: VisitRule[] = rulesBody.data || [];
      setRules(nextRules);
      setDrafts(Object.fromEntries(nextRules.map((rule) => [rule.id, { ...rule, guests: [...rule.guests], guestInput: '' }])));
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'No se pudieron cargar las reglas', text: error instanceof Error ? error.message : '' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [clientsBody, puntosBody] = await Promise.all([
          apiV2('/clients'),
          apiV2('/puntoVentas/all'),
        ]);
        if (cancelled) return;
        const clientList = Array.isArray(clientsBody) ? clientsBody : clientsBody.data || [];
        setClients(clientList.map((client: any) => ({
          id: String(client.id ?? client._id),
          name: client.name || 'Cliente',
          email: client.email || '',
        })).sort((a: ClientOption, b: ClientOption) => a.name.localeCompare(b.name, 'es')));
        const list = Array.isArray(puntosBody) ? puntosBody : puntosBody.data || [];
        setPuntos(list.map((pv: any) => ({
          id: String(pv.id ?? pv._id),
          name: pv.name || pv.codigo_tienda || pv.code || 'Punto de venta',
          codigo: pv.codigo_tienda || pv.code || '',
          client: pv.cliente?.name || pv.client_name || '',
          clientId: String(pv.cliente?.id || pv.cliente?._id || pv.clientId || ''),
        })));
      } catch (error) {
        if (!cancelled) {
          Swal.fire({ icon: 'error', title: 'No se pudo cargar los clientes', text: error instanceof Error ? error.message : '' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { loadClient(clientId); }, [clientId, loadClient]);

  useEffect(() => {
    loadAgenda().catch((error) => {
      Swal.fire({ icon: 'error', title: 'No se pudo cargar la agenda', text: error instanceof Error ? error.message : '' });
    });
  }, [loadAgenda]);

  const occurrenceCount = useMemo(() => countOccurrences(
    schedule.date,
    schedule.repeat === 'weeks' ? schedule.interval_weeks : schedule.interval_months,
    schedule.repeat === 'weeks' ? schedule.horizon_weeks : schedule.horizon_months,
    schedule.repeat,
  ), [schedule.repeat, schedule.date, schedule.interval_weeks, schedule.horizon_weeks, schedule.interval_months, schedule.horizon_months]);

  const updateDraft = (id: number, patch: Partial<RuleDraft>) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  };

  const saveRule = async (id: number) => {
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    try {
      await apiV2(`/visit-rules/${id}`, 'PATCH', {
        label: draft.label,
        interval_months: draft.event_type === 'visita_tecnica' ? Number(draft.interval_months) : null,
        enabled: draft.enabled,
        duration_minutes: Number(draft.duration_minutes),
        notification_days_before: Number(draft.notification_days_before),
        reminder_hour: Number(draft.reminder_hour),
        start_time: draft.start_time,
        horizon_months: Number(draft.horizon_months),
        guests: draft.guests,
        notes: draft.notes || '',
      });
      await loadClient(clientId);
      Swal.fire({ icon: 'success', title: 'Regla guardada', timer: 1400, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: error instanceof Error ? error.message : '' });
    } finally {
      setSavingId(null);
    }
  };

  const scheduleVisit = async () => {
    if (!schedule.name.trim() || !schedule.date) {
      Swal.fire({ icon: 'warning', title: 'Falta información', text: 'Escribe el nombre y la fecha de la cita.' });
      return;
    }
    const periodText = schedule.repeat === 'weeks'
      ? `cada ${schedule.interval_weeks} semana(s), durante ${schedule.horizon_weeks} semanas`
      : schedule.repeat === 'months'
        ? `cada ${schedule.interval_months} mes(es), durante ${schedule.horizon_months} meses`
        : 'una sola vez';
    const clientWithoutRules = Boolean(schedule.client_id) && schedule.client_id === clientId && rules.length === 0;
    const ruleText = clientWithoutRules
      ? 'Este cliente no tiene reglas guardadas. No se crean solas: esta cita usa el periodo que elegiste.'
      : 'No se busca una regla. Esta cita usa el periodo que elegiste.';
    const confirm = await Swal.fire({
      icon: 'question',
      title: occurrenceCount > 1 ? `Se crearán ${occurrenceCount} Google Meets` : 'Se creará un Google Meet',
      text: `${ruleText} Periodo: ${periodText}. ${schedule.guests.length
        ? 'Los invitados reciben la invitación ahora.'
        : 'El recordatorio sale los días configurados antes.'}`,
      showCancelButton: true,
      confirmButtonText: 'Agendar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirm.isConfirmed) return;

    setScheduling(true);
    try {
      const body = await apiV2('/scheduled-visits', 'POST', {
        name: schedule.name.trim(),
        event_type: schedule.event_type,
        repeat: schedule.repeat,
        interval_weeks: schedule.repeat === 'weeks' ? Number(schedule.interval_weeks) : null,
        horizon_weeks: schedule.repeat === 'weeks' ? Number(schedule.horizon_weeks) : null,
        interval_months: schedule.repeat === 'months' ? Number(schedule.interval_months) : null,
        horizon_months: schedule.repeat === 'months' ? Number(schedule.horizon_months) : 1,
        client_id: schedule.client_id ? Number(schedule.client_id) : null,
        punto_venta_id: schedule.punto_venta_id ? Number(schedule.punto_venta_id) : null,
        date: schedule.date,
        start_time: schedule.start_time,
        duration_minutes: Number(schedule.duration_minutes),
        notification_days_before: Number(schedule.notification_days_before),
        reminder_hour: Number(schedule.reminder_hour),
        guests: schedule.guests,
        notes: schedule.notes,
      });
      setSchedule((current) => ({ ...current, name: '', notes: '', guests: [] }));
      setGuestInput('');
      await loadAgenda();
      const first = body.data?.[0];
      Swal.fire({
        icon: 'success',
        title: body.message || 'Cita creada',
        html: first?.meet_link ? `<a href="${first.meet_link}" target="_blank" rel="noreferrer">${first.meet_link}</a>` : undefined,
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : '';
      Swal.fire({
        icon: /regla/i.test(text) ? 'info' : 'error',
        title: /regla/i.test(text) ? 'No hace falta una regla' : 'No se pudo agendar',
        text: /regla/i.test(text)
          ? 'Sin cliente, o sin reglas guardadas, la cita no busca una regla. Elige una sola vez, cada ciertas semanas o cada ciertos meses, y vuelve a agendar.'
          : text,
      });
    } finally {
      setScheduling(false);
    }
  };

  const createRule = async () => {
    if (!clientId) return;
    setCreating(true);
    try {
      await apiV2('/visit-rules', 'POST', {
        client_id: Number(clientId),
        event_type: newRule.event_type,
        interval_months: newRule.event_type === 'visita_tecnica' ? Number(newRule.interval_months) : null,
        label: newRule.label,
        enabled: newRule.enabled,
        duration_minutes: Number(newRule.duration_minutes),
        notification_days_before: Number(newRule.notification_days_before),
        reminder_hour: Number(newRule.reminder_hour),
        start_time: newRule.start_time,
        horizon_months: Number(newRule.horizon_months),
        guests: newRule.guests,
        notes: newRule.notes || '',
      });
      setNewRule(blankRule());
      await loadClient(clientId);
      Swal.fire({ icon: 'success', title: 'Regla creada', timer: 1400, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'No se pudo crear la regla', text: error instanceof Error ? error.message : '' });
    } finally {
      setCreating(false);
    }
  };

  const addUsualRules = async () => {
    if (!clientId) return;
    setCreating(true);
    try {
      const body = await apiV2('/visit-rules/defaults', 'POST', { client_id: Number(clientId) });
      await loadClient(clientId);
      Swal.fire({ icon: 'success', title: body.message || 'Reglas listas', timer: 1600, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'No se pudieron crear las reglas', text: error instanceof Error ? error.message : '' });
    } finally {
      setCreating(false);
    }
  };

  const deleteRule = async (rule: VisitRule) => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: 'Eliminar regla',
      text: rule.label,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#d33',
    });
    if (!confirm.isConfirmed) return;
    try {
      await apiV2(`/visit-rules/${rule.id}`, 'DELETE');
      await loadClient(clientId);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'No se pudo eliminar', text: error instanceof Error ? error.message : '' });
    }
  };

  const cancelVisit = async (visit: ScheduledVisit, scope: 'one' | 'series') => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: scope === 'series' ? 'Cancelar toda la serie' : 'Cancelar esta visita',
      text: 'También se borra el evento de Google Calendar y se avisa a los invitados.',
      showCancelButton: true,
      confirmButtonText: 'Cancelar visita',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#d33',
    });
    if (!confirm.isConfirmed) return;
    try {
      const body = await apiV2(`/scheduled-visits/${visit.id}?scope=${scope}`, 'DELETE');
      await loadAgenda();
      Swal.fire({ icon: 'success', title: body.message || 'Visita cancelada', timer: 1400, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'No se pudo cancelar', text: error instanceof Error ? error.message : '' });
    }
  };

  const selectedClient = clients.find((client) => client.id === clientId) || null;
  const formPuntos = schedule.client_id
    ? puntos.filter((punto) => punto.clientId === schedule.client_id)
    : puntos;
  const grouped = (['visita_tecnica', 'instalacion', 'mantenimiento'] as EventType[])
    .map((type) => ({ type, rules: rules.filter((rule) => rule.event_type === type) }))
    .filter((group) => group.rules.length > 0);

  const pageRows = visits.slice(page * 8, page * 8 + 8);

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h5" sx={{ px: 1, mb: 0.5 }}>Agenda de citas</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ px: 1, mb: 2 }}>
        Agenda una visita con un nombre libre. El cliente y el punto de venta son opcionales. Puede ser una sola vez, una instalación o un mantenimiento. Se crea el Google Meet y el correo de aviso sale los días que indiques antes.
      </Typography>

      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Nueva cita</Typography>
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={4}>
            <TextField
              size="small"
              fullWidth
              required
              label="Nombre"
              placeholder="Persona, sitio o visita"
              value={schedule.name}
              onChange={(event) => setSchedule((current) => ({ ...current, name: event.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo</InputLabel>
              <Select
                label="Tipo"
                value={schedule.event_type}
                onChange={(event) => setSchedule((current) => ({
                  ...current,
                  event_type: event.target.value as EventType,
                }))}
              >
                <MenuItem value="visita_tecnica">Visita técnica</MenuItem>
                <MenuItem value="instalacion">Instalación</MenuItem>
                <MenuItem value="mantenimiento">Mantenimiento</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Periodo</InputLabel>
              <Select
                label="Periodo"
                value={schedule.repeat}
                onChange={(event) => setSchedule((current) => ({ ...current, repeat: event.target.value as 'once' | 'weeks' | 'months' }))}
              >
                <MenuItem value="once">Una sola vez</MenuItem>
                <MenuItem value="weeks">Cada varias semanas</MenuItem>
                <MenuItem value="months">Cada varios meses</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {schedule.repeat === 'weeks' && (
            <>
              <Grid item xs={6} md={3}>
                <TextField size="small" fullWidth type="number" label="Cada cuántas semanas" value={schedule.interval_weeks} onChange={(event) => setSchedule((current) => ({ ...current, interval_weeks: Number(event.target.value) }))} inputProps={{ min: 1, max: 52 }} />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField size="small" fullWidth type="number" label="Semanas a agendar" value={schedule.horizon_weeks} onChange={(event) => setSchedule((current) => ({ ...current, horizon_weeks: Number(event.target.value) }))} inputProps={{ min: 1, max: 104 }} />
              </Grid>
            </>
          )}
          {schedule.repeat === 'months' && (
            <>
              <Grid item xs={6} md={3}>
                <TextField size="small" fullWidth type="number" label="Cada cuántos meses" value={schedule.interval_months} onChange={(event) => setSchedule((current) => ({ ...current, interval_months: Number(event.target.value) }))} inputProps={{ min: 1, max: 36 }} helperText="Por ejemplo 3, 6 o 12" />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField size="small" fullWidth type="number" label="Meses a agendar" value={schedule.horizon_months} onChange={(event) => setSchedule((current) => ({ ...current, horizon_months: Number(event.target.value) }))} inputProps={{ min: 1, max: 60 }} />
              </Grid>
            </>
          )}
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              {schedule.client_id
                ? 'La regla guardada es opcional. Si este cliente no tiene reglas, la cita usa el periodo de arriba y no se generan reglas por defecto. '
                : 'Sin cliente no hay regla que buscar. Elige una sola vez, cada ciertas semanas o cada ciertos meses. '}
              {schedule.repeat !== 'once' ? 'El día en que termina el periodo no se agenda: cada semana durante 2 semanas son 2 citas.' : ''}
            </Typography>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField size="small" fullWidth type="date" label="Fecha" value={schedule.date} onChange={(event) => setSchedule((current) => ({ ...current, date: event.target.value }))} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField size="small" fullWidth type="time" label="Hora" value={schedule.start_time} onChange={(event) => setSchedule((current) => ({ ...current, start_time: event.target.value }))} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField size="small" fullWidth type="number" label="Duración (min)" value={schedule.duration_minutes} onChange={(event) => setSchedule((current) => ({ ...current, duration_minutes: Number(event.target.value) }))} inputProps={{ min: 15, max: 480 }} />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField size="small" fullWidth type="number" label="Avisar días antes" value={schedule.notification_days_before} onChange={(event) => setSchedule((current) => ({ ...current, notification_days_before: Number(event.target.value) }))} inputProps={{ min: 0, max: 90 }} helperText="7 = una semana" />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField size="small" fullWidth type="number" label="Hora del correo" value={schedule.reminder_hour} onChange={(event) => setSchedule((current) => ({ ...current, reminder_hour: Number(event.target.value) }))} inputProps={{ min: 0, max: 23 }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Cliente (opcional)</InputLabel>
              <Select
                label="Cliente (opcional)"
                value={schedule.client_id}
                onChange={(event) => setSchedule((current) => ({ ...current, client_id: String(event.target.value), punto_venta_id: '' }))}
              >
                <MenuItem value="">Sin cliente</MenuItem>
                {clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>{client.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Punto de venta (opcional)</InputLabel>
              <Select
                label="Punto de venta (opcional)"
                value={schedule.punto_venta_id}
                onChange={(event) => setSchedule((current) => ({ ...current, punto_venta_id: String(event.target.value) }))}
              >
                <MenuItem value="">Sin punto de venta</MenuItem>
                {formPuntos.map((punto) => (
                  <MenuItem key={punto.id} value={punto.id}>
                    {punto.name}{punto.codigo ? ` · ${punto.codigo}` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <GuestEditor
              guests={schedule.guests}
              input={guestInput}
              onInput={setGuestInput}
              onChange={(guests) => setSchedule((current) => ({ ...current, guests }))}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={2}
              label="Notas"
              value={schedule.notes}
              onChange={(event) => setSchedule((current) => ({ ...current, notes: event.target.value }))}
            />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" disabled={scheduling} onClick={scheduleVisit} startIcon={<Iconify icon="mdi:calendar-plus" />}>
              {scheduling ? 'Creando Meet…' : occurrenceCount > 1 ? `Agendar ${occurrenceCount} visitas` : 'Agendar y crear Meet'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Divider sx={{ mb: 2 }} />
      <Typography variant="h6" sx={{ px: 1, mb: 1 }}>Próximas citas</Typography>
      <StyledTableContainer>
        <Paper elevation={3}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f4f6f8' }}>
                  <StyledTableCellHeader>Cuándo</StyledTableCellHeader>
                  <StyledTableCellHeader>Visita</StyledTableCellHeader>
                  <StyledTableCellHeader>Sitio</StyledTableCellHeader>
                  <StyledTableCellHeader>Aviso</StyledTableCellHeader>
                  <StyledTableCellHeader>Meet</StyledTableCellHeader>
                  <StyledTableCellHeader>Acciones</StyledTableCellHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {pageRows.length === 0 && (
                  <TableRow>
                    <StyledTableCell colSpan={6}>No hay visitas programadas.</StyledTableCell>
                  </TableRow>
                )}
                {pageRows.map((visit) => (
                  <StyledTableRow key={visit.id}>
                    <StyledTableCell>{formatWhen(visit.starts_at, visit.time_zone)}</StyledTableCell>
                    <StyledTableCell>
                      {visit.title}
                      {visit.interval_weeks ? ` · cada ${visit.interval_weeks} semana(s)` : ''}
                      {visit.interval_months ? ` · cada ${visit.interval_months} meses` : ''}
                    </StyledTableCell>
                    <StyledTableCell>
                      {visit.punto_venta_name || visit.client_name || '-'}
                      {visit.codigo_tienda ? ` (${visit.codigo_tienda})` : ''}
                    </StyledTableCell>
                    <StyledTableCell>
                      {visit.reminder_sent_at ? 'Correo enviado' : `${visit.notification_days_before} días antes`}
                      {visit.guests.length ? ` · ${visit.guests.length} invitado(s)` : ''}
                    </StyledTableCell>
                    <StyledTableCell>
                      {visit.meet_link ? (
                        <Button size="small" href={visit.meet_link} target="_blank" rel="noreferrer">Abrir Meet</Button>
                      ) : '-'}
                    </StyledTableCell>
                    <StyledTableCell>
                      <Button size="small" color="error" onClick={() => cancelVisit(visit, 'one')}>Cancelar</Button>
                      {visit.interval_months || visit.interval_weeks ? (
                        <Button size="small" color="error" onClick={() => cancelVisit(visit, 'series')}>Serie</Button>
                      ) : null}
                    </StyledTableCell>
                  </StyledTableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
          <TablePagination
            component="div"
            count={visits.length}
            page={page}
            onPageChange={(_, next) => setPage(next)}
            rowsPerPage={8}
            rowsPerPageOptions={[8]}
            labelRowsPerPage="Filas"
          />
        </Paper>
      </StyledTableContainer>

      <Divider sx={{ my: 3 }} />
      <Typography variant="h6" sx={{ px: 1, mb: 1 }}>Reglas por cliente</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ px: 1, mb: 2 }}>
        Opcional. Sirve si quieres guardar intervalos habituales de un cliente. No hace falta una regla para agendar.
      </Typography>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Cliente</InputLabel>
          <Select
            label="Cliente"
            value={clientId}
            onChange={(event) => {
              setClientId(String(event.target.value));
              setNewRule(blankRule());
            }}
          >
            {clients.map((client) => (
              <MenuItem key={client.id} value={client.id}>{client.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {!clientId && (
        <Typography variant="body2" color="text.secondary" sx={{ px: 1, mb: 2 }}>
          Elige un cliente si quieres guardar sus reglas.
        </Typography>
      )}

      {clientId && (
        <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1 }}>
            <Typography variant="h6">Nueva regla para {selectedClient?.name}</Typography>
            <Button variant="outlined" disabled={creating} onClick={addUsualRules}>
              Agregar 3, 6 y 12 meses, instalación y mantenimiento
            </Button>
          </Box>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo</InputLabel>
                <Select
                  label="Tipo"
                  value={newRule.event_type}
                  onChange={(event) => setNewRule((current) => ({ ...current, event_type: event.target.value as EventType }))}
                >
                  <MenuItem value="visita_tecnica">Visita técnica</MenuItem>
                  <MenuItem value="instalacion">Instalación</MenuItem>
                  <MenuItem value="mantenimiento">Mantenimiento</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                size="small"
                fullWidth
                label="Nombre"
                placeholder={newRule.event_type === 'visita_tecnica' ? `Visita técnica cada ${newRule.interval_months || 3} meses` : TYPE_LABEL[newRule.event_type]}
                value={newRule.label}
                onChange={(event) => setNewRule((current) => ({ ...current, label: event.target.value }))}
              />
            </Grid>
            {newRule.event_type === 'visita_tecnica' && (
              <Grid item xs={12} md={4}>
                <TextField
                  size="small"
                  fullWidth
                  type="number"
                  label="Cada cuántos meses"
                  value={newRule.interval_months ?? 3}
                  onChange={(event) => setNewRule((current) => ({ ...current, interval_months: Number(event.target.value) }))}
                  inputProps={{ min: 1, max: 36 }}
                  helperText="Lo habitual es 3, 6 o 12"
                />
              </Grid>
            )}
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="number" label="Avisar días antes" value={newRule.notification_days_before} onChange={(event) => setNewRule((current) => ({ ...current, notification_days_before: Number(event.target.value) }))} inputProps={{ min: 0, max: 90 }} helperText="7 = una semana" />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="number" label="Hora del correo" value={newRule.reminder_hour} onChange={(event) => setNewRule((current) => ({ ...current, reminder_hour: Number(event.target.value) }))} inputProps={{ min: 0, max: 23 }} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="time" label="Hora de la visita" value={newRule.start_time} onChange={(event) => setNewRule((current) => ({ ...current, start_time: event.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="number" label="Duración (min)" value={newRule.duration_minutes} onChange={(event) => setNewRule((current) => ({ ...current, duration_minutes: Number(event.target.value) }))} inputProps={{ min: 15, max: 480 }} />
            </Grid>
            {newRule.event_type === 'visita_tecnica' && (
              <Grid item xs={12} md={3}>
                <TextField size="small" fullWidth type="number" label="Meses a agendar" value={newRule.horizon_months} onChange={(event) => setNewRule((current) => ({ ...current, horizon_months: Number(event.target.value) }))} inputProps={{ min: 1, max: 60 }} />
              </Grid>
            )}
            <Grid item xs={12}>
              <GuestEditor
                guests={newRule.guests}
                input={newRule.guestInput}
                onInput={(value) => setNewRule((current) => ({ ...current, guestInput: value }))}
                onChange={(guests) => setNewRule((current) => ({ ...current, guests }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" disabled={creating} onClick={createRule}>
                {creating ? 'Guardando…' : 'Crear regla'}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {clientId && loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>}
      {clientId && !loading && rules.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ px: 1, mb: 2 }}>
          Este cliente todavía no tiene reglas. Crea una o agrega las habituales.
        </Typography>
      )}

      {grouped.map((group) => (
        <Box key={group.type} sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ px: 1, mb: 1 }}>{TYPE_LABEL[group.type]}</Typography>
          <Grid container spacing={2}>
            {group.rules.map((rule) => {
              const draft = drafts[rule.id];
              if (!draft) return null;
              return (
                <Grid item xs={12} md={group.type === 'visita_tecnica' ? 4 : 6} key={rule.id}>
                  <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, gap: 1 }}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Nombre"
                        value={draft.label}
                        onChange={(event) => updateDraft(rule.id, { label: event.target.value })}
                      />
                      <FormControlLabel
                        sx={{ mr: 0, whiteSpace: 'nowrap' }}
                        control={<Switch checked={draft.enabled} onChange={(event) => updateDraft(rule.id, { enabled: event.target.checked })} />}
                        label={draft.enabled ? 'Activa' : 'Inactiva'}
                      />
                    </Box>
                    <Grid container spacing={1.5}>
                      {rule.event_type === 'visita_tecnica' && (
                        <Grid item xs={12}>
                          <TextField
                            size="small"
                            fullWidth
                            type="number"
                            label="Cada cuántos meses"
                            value={draft.interval_months ?? ''}
                            onChange={(event) => updateDraft(rule.id, { interval_months: Number(event.target.value) })}
                            inputProps={{ min: 1, max: 36 }}
                            helperText="Lo habitual es 3, 6 o 12"
                          />
                        </Grid>
                      )}
                      <Grid item xs={6}>
                        <TextField
                          size="small"
                          fullWidth
                          type="number"
                          label="Duración (min)"
                          value={draft.duration_minutes}
                          onChange={(event) => updateDraft(rule.id, { duration_minutes: Number(event.target.value) })}
                          inputProps={{ min: 15, max: 480 }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          size="small"
                          fullWidth
                          type="time"
                          label="Hora de la visita"
                          value={draft.start_time}
                          onChange={(event) => updateDraft(rule.id, { start_time: event.target.value })}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          size="small"
                          fullWidth
                          type="number"
                          label="Avisar días antes"
                          value={draft.notification_days_before}
                          onChange={(event) => updateDraft(rule.id, { notification_days_before: Number(event.target.value) })}
                          inputProps={{ min: 0, max: 90 }}
                          helperText="7 = una semana"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          size="small"
                          fullWidth
                          type="number"
                          label="Hora del correo"
                          value={draft.reminder_hour}
                          onChange={(event) => updateDraft(rule.id, { reminder_hour: Number(event.target.value) })}
                          inputProps={{ min: 0, max: 23 }}
                        />
                      </Grid>
                      {rule.event_type === 'visita_tecnica' && (
                        <Grid item xs={12}>
                          <TextField
                            size="small"
                            fullWidth
                            type="number"
                            label="Meses a agendar"
                            value={draft.horizon_months}
                            onChange={(event) => updateDraft(rule.id, { horizon_months: Number(event.target.value) })}
                            inputProps={{ min: 1, max: 60 }}
                            helperText={`Cada ${draft.interval_months || rule.interval_months} meses, desde la primera fecha`}
                          />
                        </Grid>
                      )}
                      <Grid item xs={12}>
                        <GuestEditor
                          guests={draft.guests}
                          input={draft.guestInput}
                          onInput={(value) => updateDraft(rule.id, { guestInput: value })}
                          onChange={(guests) => updateDraft(rule.id, { guests })}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          size="small"
                          fullWidth
                          multiline
                          minRows={2}
                          label="Notas"
                          value={draft.notes || ''}
                          onChange={(event) => updateDraft(rule.id, { notes: event.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          variant="contained"
                          disabled={savingId === rule.id}
                          onClick={() => saveRule(rule.id)}
                        >
                          {savingId === rule.id ? 'Guardando…' : 'Guardar regla'}
                        </Button>
                        <Button color="error" sx={{ ml: 1 }} onClick={() => deleteRule(rule)}>
                          Eliminar
                        </Button>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}

import Swal from "sweetalert2";
import { useEffect, useState } from "react";

import {
  Box,
  Stack,
  Switch,
  Button,
  Dialog,
  Checkbox,
  TextField,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  CircularProgress,
} from "@mui/material";

import { patch } from "src/api/axiosHelper";
import { get as getV2 } from "src/api/axiosHelperV2";
import { fNumber } from "src/utils/format-number";

import { toLatinDisplay } from "./meter-platform/latin-display";
import { displayVolume } from "./meter-platform/meter-platform-demo";

import type { Controller, ControllerFlowRule, ControllerRelayRule, ControllerRules } from "./types";

const FLOW_PINS = [4, 5, 15, 18, 19, 21, 22, 23];

const RELAYS: Array<{ id: number; title: string; mode: ControllerRelayRule["mode"]; help: string }> = [
  { id: 1, title: "1 · Bomba de agua cruda", mode: "manual", help: "Se enciende al cerrar el GPIO 16 a GND. El portal también puede encenderla." },
  { id: 2, title: "2 · Válvula solenoide", mode: "and_inputs", help: "Se activa solo cuando las dos entradas digitales están cerradas a GND." },
  { id: 3, title: "3 · Sistema de flush", mode: "timer", help: "Corre solo, cada cierto número de horas, durante el tiempo indicado." },
  { id: 4, title: "4 · Bomba de cloro", mode: "flow", help: "Se enciende cuando el medidor elegido trae flujo por encima del mínimo." },
  { id: 5, title: "5 · Salida de presión", mode: "pressure", help: "Se enciende si todos los sensores elegidos están dentro del rango." },
  { id: 6, title: "6 · Bomba de agua purificada", mode: "pressure", help: "Se enciende si todos los sensores elegidos están dentro del rango." },
];

const SENSORS = [
  { index: 0, label: "S1" },
  { index: 1, label: "S2" },
  { index: 2, label: "S3" },
  { index: 3, label: "S4" },
];

export function defaultRules(): ControllerRules {
  return {
    input_active_low: true,
    flows: [
      { name: "Medidor 1", origin: "pin", pin: 19, liters_per_pulse: 0.1 },
      { name: "Medidor 2", origin: "pin", pin: 21, liters_per_pulse: 0.1 },
    ],
    relays: RELAYS.map((relay) => {
      const base: ControllerRelayRule = { id: relay.id, enabled: false, mode: relay.mode };
      if (relay.mode === "manual") base.on = false;
      if (relay.mode === "timer") {
        base.interval_ms = 4 * 60 * 60 * 1000;
        base.duration_ms = 30000;
      }
      if (relay.mode === "flow") {
        base.meter = 0;
        base.min_lpm = 0;
      }
      if (relay.mode === "pressure") {
        base.sensors = [];
        base.min_psi = relay.id === 6 ? 20 : 10;
        base.max_psi = relay.id === 6 ? 80 : 60;
      }
      return base;
    }),
  };
}

export function rulesFromController(rules?: ControllerRules | null): ControllerRules {
  const base = defaultRules();
  if (!rules) return base;
  base.input_active_low = rules.input_active_low !== false;
  rules.flows?.slice(0, 2).forEach((flow, index) => {
    const name = flow?.name || base.flows[index].name;
    if (flow?.origin === "platform" || flow?.device_code) {
      base.flows[index] = {
        name,
        origin: "platform",
        device_code: flow.device_code || "",
      };
      return;
    }
    if (flow?.origin === "pin" || flow?.pin) {
      base.flows[index] = {
        name,
        origin: "pin",
        pin: flow.pin,
        liters_per_pulse: flow.liters_per_pulse ?? 0.1,
      };
      return;
    }
    base.flows[index] = { name, origin: "pin", liters_per_pulse: 0.1 };
  });
  rules.relays?.forEach((relay) => {
    const current = base.relays.find((item) => item.id === relay.id);
    if (!current) return;
    current.enabled = Boolean(relay.enabled);
    if (current.mode === "manual") current.on = Boolean(relay.on);
    if (current.mode === "timer") {
      if (relay.interval_ms) current.interval_ms = relay.interval_ms;
      if (relay.duration_ms) current.duration_ms = relay.duration_ms;
    }
    if (current.mode === "flow") {
      current.meter = relay.meter === 1 ? 1 : 0;
      current.min_lpm = Number(relay.min_lpm) || 0;
    }
    if (current.mode === "pressure") {
      current.sensors = (relay.sensors || []).filter((index) => index >= 0 && index <= 3);
      if (relay.min_psi != null) current.min_psi = relay.min_psi;
      if (relay.max_psi != null) current.max_psi = relay.max_psi;
    }
  });
  return base;
}

export function validateControllerRules(rules: ControllerRules): string | null {
  for (const [index, flow] of rules.flows.entries()) {
    const label = `Medidor ${index + 1}`;
    if (flow.origin === "platform") {
      if (!flow.device_code?.trim()) return `${label}: elige el equipo en Medidores.`;
      continue;
    }
    const pin = Number(flow.pin);
    if (!FLOW_PINS.includes(pin)) return `${label}: elige un pin disponible.`;
    if (rules.flows.some((other, otherIndex) => otherIndex !== index && other.origin !== "platform" && Number(other.pin) === pin)) {
      return "Los dos medidores físicos no pueden usar el mismo pin.";
    }
    const liters = flow.liters_per_pulse ?? 0.1;
    if (liters <= 0 || liters > 100) return `${label}: los litros por pulso van de 0.0001 a 100.`;
  }
  for (const relay of rules.relays) {
    if (relay.mode === "pressure") {
      if ((relay.min_psi ?? 0) >= (relay.max_psi ?? 0)) {
        return `Relevador ${relay.id}: la presión mínima tiene que ser menor que la máxima.`;
      }
      if (relay.enabled && !relay.sensors?.length) return `Relevador ${relay.id}: elige al menos un sensor de presión.`;
    }
    if (relay.mode === "timer" && relay.enabled) {
      const hours = (relay.interval_ms || 0) / 3600000;
      const seconds = (relay.duration_ms || 0) / 1000;
      if (hours < 1) return "El flush automático pide al menos 1 hora entre ciclos.";
      if (seconds < 5 || seconds > 180) return "La duración del flush va de 5 a 180 segundos.";
    }
  }
  return null;
}

type Props = {
  controller: Controller | null;
  onClose: () => void;
  onSaved: (controller: Controller) => void;
};

type MeterOption = { deviceCode: string; label: string };

type MeterRow = {
  deviceCode?: string;
  deviceType?: string;
  installAddress?: string;
  isOnline?: string | boolean | number;
  totalMetering?: number | null;
  snapshot?: {
    litersForward?: number | null;
    rawForward?: number | null;
    online?: boolean;
  };
};

type MeterListResponse = {
  success?: boolean;
  message?: string;
  data?: { rows?: MeterRow[] };
};

function meterIsOnline(row: MeterRow) {
  const value = row.snapshot?.online ?? row.isOnline;
  if (value === true) return true;
  const text = String(value ?? "").toLowerCase();
  return text === "1" || text === "on_line" || text === "online";
}

function meterRawM3(row: MeterRow) {
  const fromReport = Number(row.snapshot?.rawForward);
  if (row.snapshot?.rawForward != null && Number.isFinite(fromReport)) return fromReport;
  const listed = Number(row.totalMetering);
  if (row.totalMetering != null && Number.isFinite(listed)) return listed;
  const liters = Number(row.snapshot?.litersForward);
  if (row.snapshot?.litersForward != null && Number.isFinite(liters)) return liters / 1000;
  return null;
}

function meterOptionLabel(row: MeterRow, peerRaw: number[]) {
  const id = String(row.deviceCode || "").trim();
  const name = toLatinDisplay(row.deviceType || row.installAddress, "Medidor");
  const liters = displayVolume(meterRawM3(row), peerRaw).liters;
  const litersLabel = liters == null ? "—" : `${fNumber(Math.round(liters))} L`;
  const active = meterIsOnline(row) ? "En línea" : "Fuera de línea";
  return `${id} - ${name} - ${litersLabel} - ${active}`;
}

type FieldsProps = {
  rules: ControllerRules;
  onChange: (rules: ControllerRules) => void;
  active: boolean;
};

export function ControllerRulesFields({ rules, onChange, active }: FieldsProps) {
  const [meters, setMeters] = useState<MeterOption[]>([]);
  const [metersError, setMetersError] = useState<string | null>(null);
  const [metersLoading, setMetersLoading] = useState(false);

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    setMetersLoading(true);
    setMetersError(null);
    getV2<MeterListResponse>("/external-providers/meter-platform/devices", {
      pageNum: 1,
      pageSize: 100,
      enrich: true,
    })
      .then((res) => {
        if (cancelled) return;
        if (!res?.success) {
          setMeters([]);
          setMetersError(res?.message || "No se pudo cargar la lista de medidores");
          return;
        }
        const rows = res.data?.rows || [];
        const peerRaw = rows
          .map((row) => meterRawM3(row))
          .filter((value): value is number => value != null && value > 0);
        const options = rows
          .map((row) => {
            const deviceCode = String(row.deviceCode || "").trim();
            if (!deviceCode) return null;
            return { deviceCode, label: meterOptionLabel(row, peerRaw) };
          })
          .filter((row): row is MeterOption => Boolean(row));
        setMeters(options);
      })
      .catch((error: { response?: { data?: { message?: string } }; message?: string }) => {
        if (cancelled) return;
        setMeters([]);
        setMetersError(error?.response?.data?.message || error?.message || "No se pudo cargar la lista de medidores");
      })
      .finally(() => {
        if (!cancelled) setMetersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  const updateRelay = (id: number, patchRule: Partial<ControllerRelayRule>) => {
    onChange({
      ...rules,
      relays: rules.relays.map((relay) => (relay.id === id ? { ...relay, ...patchRule } : relay)),
    });
  };

  const updateFlow = (index: number, patchFlow: Partial<ControllerFlowRule>) => {
    onChange({
      ...rules,
      flows: rules.flows.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patchFlow } : item)),
    });
  };

  const toggleSensor = (id: number, index: number) => {
    const relay = rules.relays.find((item) => item.id === id);
    const selected = new Set(relay?.sensors || []);
    if (selected.has(index)) selected.delete(index);
    else selected.add(index);
    updateRelay(id, { sensors: [...selected].sort((a, b) => a - b) });
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Medidores de flujo</Typography>
            <Stack spacing={1.5}>
              {rules.flows.map((flow, index) => {
                const takenPins = rules.flows
                  .filter((other, otherIndex) => otherIndex !== index && other.origin === "pin")
                  .map((other) => Number(other.pin));
                return (
                  <Box key={index} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>Medidor {index + 1}</Typography>
                    <Stack spacing={1.5}>
                      <TextField
                        label="Nombre en pantalla"
                        value={flow.name}
                        onChange={(event) => updateFlow(index, { name: event.target.value.slice(0, 15) })}
                        fullWidth
                        helperText="Máximo 15 caracteres. La bomba de cloro elige este medidor."
                      />
                      <TextField
                        select
                        label="Origen"
                        value={flow.origin}
                        onChange={(event) => {
                          const origin = event.target.value === "platform" ? "platform" : "pin";
                          if (origin === "platform") {
                            updateFlow(index, { origin, pin: undefined });
                            return;
                          }
                          const current = Number(flow.pin);
                          const pin = FLOW_PINS.includes(current) && !takenPins.includes(current)
                            ? current
                            : FLOW_PINS.find((item) => !takenPins.includes(item));
                          updateFlow(index, {
                            origin: "pin",
                            device_code: undefined,
                            pin,
                            liters_per_pulse: flow.liters_per_pulse ?? 0.1,
                          });
                        }}
                        fullWidth
                        SelectProps={{ native: true }}
                      >
                        <option value="pin">Físico, un pin del controlador</option>
                        <option value="platform">Medidor de la plataforma</option>
                      </TextField>

                      {flow.origin === "pin" ? (
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                          <TextField
                            select
                            label="Pin"
                            value={flow.pin ?? ""}
                            onChange={(event) => updateFlow(index, { pin: Number(event.target.value) })}
                            fullWidth
                            SelectProps={{ native: true }}
                            helperText="Libres: 4, 5, 15, 18, 19, 21, 22 y 23. El 19 es el pulso de los medidores Equysis."
                          >
                            <option value="">Elige un pin</option>
                            {FLOW_PINS.map((pin) => (
                              <option key={pin} value={pin} disabled={takenPins.includes(pin)}>
                                GPIO {pin}{pin === 19 ? " · pulso Equysis" : ""}{takenPins.includes(pin) ? " · ocupado" : ""}
                              </option>
                            ))}
                          </TextField>
                          <TextField
                            type="number"
                            label="Litros por pulso"
                            value={flow.liters_per_pulse ?? 0.1}
                            onChange={(event) => updateFlow(index, { liters_per_pulse: Number(event.target.value) })}
                            inputProps={{ min: 0.0001, max: 100, step: 0.0001 }}
                            fullWidth
                            helperText="Equysis: 0.1 L por pulso (0.0001 m³)."
                          />
                        </Stack>
                      ) : (
                        <TextField
                          select
                          label="Equipo"
                          value={flow.device_code || ""}
                          onChange={(event) => {
                            const deviceCode = event.target.value;
                            const previous = (flow.device_code || "").slice(0, 15);
                            const customName = flow.name && flow.name !== `Medidor ${index + 1}` && flow.name !== previous;
                            updateFlow(index, {
                              device_code: deviceCode,
                              name: customName ? flow.name : deviceCode.slice(0, 15),
                            });
                          }}
                          fullWidth
                          SelectProps={{ native: true }}
                          disabled={metersLoading && meters.length === 0}
                          helperText={metersError || "El id es el device code de Medidores."}
                        >
                          <option value="">{metersLoading ? "Cargando equipos…" : "Elige un equipo"}</option>
                          {flow.device_code && !meters.some((meter) => meter.deviceCode === flow.device_code) ? (
                            <option value={flow.device_code}>{flow.device_code}</option>
                          ) : null}
                          {meters.map((meter) => (
                            <option key={meter.deviceCode} value={meter.deviceCode}>{meter.label}</option>
                          ))}
                        </TextField>
                      )}
                      {flow.origin === "platform" && metersError ? (
                        <TextField
                          label="Id del equipo"
                          value={flow.device_code || ""}
                          onChange={(event) => updateFlow(index, { device_code: event.target.value.trim().slice(0, 64) })}
                          fullWidth
                        />
                      ) : null}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={rules.input_active_low}
                onChange={(event) => onChange({ ...rules, input_active_low: event.target.checked })}
              />
            }
            label="Entradas de la solenoide activas al cerrar a GND"
          />

          {rules.relays.map((relay) => {
            const meta = RELAYS.find((item) => item.id === relay.id);
            return (
              <Box key={relay.id} sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={relay.enabled}
                      onChange={(event) => updateRelay(relay.id, { enabled: event.target.checked })}
                    />
                  }
                  label={meta?.title}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {meta?.help}
                </Typography>

                {relay.mode === "manual" && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(relay.on)}
                        onChange={(event) => updateRelay(relay.id, { on: event.target.checked })}
                      />
                    }
                    label="Encender bomba"
                  />
                )}

                {relay.mode === "timer" && (
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      type="number"
                      label="Cada cuántas horas"
                      value={(relay.interval_ms || 0) / 3600000}
                      onChange={(event) => updateRelay(relay.id, { interval_ms: Number(event.target.value) * 3600000 })}
                      inputProps={{ min: 1, max: 168, step: 1 }}
                      fullWidth
                    />
                    <TextField
                      type="number"
                      label="Duración del ciclo (segundos)"
                      value={(relay.duration_ms || 0) / 1000}
                      onChange={(event) => updateRelay(relay.id, { duration_ms: Number(event.target.value) * 1000 })}
                      inputProps={{ min: 5, max: 180, step: 1 }}
                      fullWidth
                    />
                  </Stack>
                )}

                {relay.mode === "flow" && (
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      select
                      label="Medidor"
                      value={relay.meter === 1 ? 1 : 0}
                      onChange={(event) => updateRelay(relay.id, { meter: Number(event.target.value) })}
                      fullWidth
                      SelectProps={{ native: true }}
                    >
                      <option value={0}>
                        {rules.flows[0]?.origin === "pin"
                          ? `${rules.flows[0]?.name || "Medidor 1"} · GPIO ${rules.flows[0]?.pin ?? "—"}`
                          : `${rules.flows[0]?.name || "Medidor 1"} · ${rules.flows[0]?.device_code || "sin equipo"}`}
                      </option>
                      <option value={1}>
                        {rules.flows[1]?.origin === "pin"
                          ? `${rules.flows[1]?.name || "Medidor 2"} · GPIO ${rules.flows[1]?.pin ?? "—"}`
                          : `${rules.flows[1]?.name || "Medidor 2"} · ${rules.flows[1]?.device_code || "sin equipo"}`}
                      </option>
                    </TextField>
                    <TextField
                      type="number"
                      label="Encender si el flujo es mayor a (L/min)"
                      value={relay.min_lpm ?? 0}
                      onChange={(event) => updateRelay(relay.id, { min_lpm: Number(event.target.value) })}
                      inputProps={{ min: 0, step: 0.1 }}
                      fullWidth
                    />
                  </Stack>
                )}

                {relay.mode === "pressure" && (
                  <Box>
                    <Stack direction="row" flexWrap="wrap">
                      {SENSORS.map((sensor) => (
                        <FormControlLabel
                          key={sensor.index}
                          control={
                            <Checkbox
                              checked={Boolean(relay.sensors?.includes(sensor.index))}
                              onChange={() => toggleSensor(relay.id, sensor.index)}
                            />
                          }
                          label={sensor.label}
                        />
                      ))}
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <TextField
                        type="number"
                        label="Presión mínima (psi)"
                        value={relay.min_psi ?? 0}
                        onChange={(event) => updateRelay(relay.id, { min_psi: Number(event.target.value) })}
                        inputProps={{ min: 0, max: 200, step: 0.5 }}
                        fullWidth
                      />
                      <TextField
                        type="number"
                        label="Presión máxima (psi)"
                        value={relay.max_psi ?? 0}
                        onChange={(event) => updateRelay(relay.id, { max_psi: Number(event.target.value) })}
                        inputProps={{ min: 0, max: 200, step: 0.5 }}
                        fullWidth
                      />
                    </Stack>
                  </Box>
                )}
              </Box>
            );
          })}
        </Stack>
  );
}

export function ControllerRulesDialog({ controller, onClose, onSaved }: Props) {
  const [rules, setRules] = useState<ControllerRules>(defaultRules);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (controller) setRules(rulesFromController(controller.rules));
  }, [controller]);

  const save = async () => {
    if (!controller?._id) return;
    const message = validateControllerRules(rules);
    if (message) {
      Swal.fire({ icon: "warning", title: "Revisa la regla", text: message });
      return;
    }
    setSaving(true);
    try {
      const updated = await patch<Controller>(`/controllers/${controller._id}`, { rules });
      onSaved(updated);
      Swal.fire({
        icon: "success",
        title: "Reglas guardadas",
        text: "El controlador las toma en su siguiente consulta, sin cambiar el firmware.",
        timer: 2200,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error guardando reglas:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(controller)} onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>Reglas de {controller?.name || "controlador"}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Cada relevador se configura aquí. El equipo lee estas reglas en su sincronización y las aplica tal cual.
          Si una regla queda deshabilitada, ese relevador permanece apagado.
        </Typography>
        <ControllerRulesFields rules={rules} onChange={setRules} active={Boolean(controller)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving} color="secondary">Cancelar</Button>
        <Button onClick={save} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={24} /> : "Guardar reglas"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

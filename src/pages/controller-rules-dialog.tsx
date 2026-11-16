import Swal from "sweetalert2";
import { useRef, useState, useEffect, type ReactNode } from "react";

import {
  Box,
  Stack,
  Switch,
  Button,
  Dialog,
  TextField,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  CircularProgress,
} from "@mui/material";

import { fNumber } from "src/utils/format-number";

import { get, patch } from "src/api/axiosHelper";

import { toLatinDisplay } from "./meter-platform/latin-display";
import { displayVolume } from "./meter-platform/meter-platform-demo";

import type { Controller, ControllerRules, ControllerFlowRule, ControllerFlowRole, ControllerRelayRule } from "./types";

const FLOW_PINS = [4, 19];
const INPUT_PINS = [4, 16, 17, 19, 22];

const FLUSH_EVERY_MS = 12 * 60 * 60 * 1000;

const FLOWS: Array<{
  role: ControllerFlowRole;
  title: string;
  name: string;
  help: string;
  origin: "pin" | "platform";
  pin?: number;
}> = [
  {
    role: "gate",
    title: "1 · Agua cruda",
    name: "Agua cruda",
    help: "Si este medidor no marca flujo, no arranca ningún relevador.",
    origin: "pin",
    pin: 4,
  },
  {
    role: "chlorine",
    title: "2 · Agua cruda a tienda",
    name: "Cruda a tienda",
    help: "Cuando este flujo es mayor a 0, enciende la bomba de cloro.",
    origin: "pin",
    pin: 19,
  },
  {
    role: "calc",
    title: "3 · Rechazo",
    name: "Rechazo",
    help: "Se lee para cálculo. No enciende relevadores.",
    origin: "platform",
  },
  {
    role: "calc",
    title: "4 · Producción",
    name: "Produccion",
    help: "Se lee para cálculo. No enciende relevadores.",
    origin: "platform",
  },
  {
    role: "read",
    title: "5 · Agua purificada a tienda",
    name: "Pura a tienda",
    help: "Lectura del agua que sale a la tienda. La bomba se enciende con su interruptor.",
    origin: "platform",
  },
];

const RELAY_COLORS = ["#0369A1", "#D97706", "#059669", "#7C3AED"];

export function MarkedSection({
  mark,
  color,
  title,
  subtitle,
  children,
}: {
  mark: string;
  color: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Box sx={{ containerType: "inline-size", borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
      <Box sx={{ px: { xs: 1.5, sm: 2 }, py: 1.5, display: "flex", gap: 1.5, alignItems: "flex-start", bgcolor: color, color: "#fff" }}>
        <Box sx={{ width: 28, height: 28, mt: 0.25, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.22)", display: "grid", placeItems: "center", fontWeight: 700, flexShrink: 0 }}>
          {mark}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ color: "inherit", lineHeight: 1.2, overflowWrap: "anywhere" }}>{title}</Typography>
          {subtitle ? <Typography variant="caption" sx={{ display: "block", mt: 0.25, color: "rgba(255,255,255,0.9)" }}>{subtitle}</Typography> : null}
        </Box>
      </Box>
      <Box sx={{ p: { xs: 1.5, sm: 2 }, borderLeft: `6px solid ${color}` }}>{children}</Box>
    </Box>
  );
}

const RELAYS: Array<{ id: number; title: string; mode: ControllerRelayRule["mode"]; help: string; defaultPin?: number }> = [
  {
    id: 1,
    title: "1 · Válvula y bomba de agua cruda",
    mode: "manual",
    defaultPin: 16,
    help: "El interruptor de baja y llenado abre la válvula solenoide. La válvula enciende la bomba.",
  },
  {
    id: 2,
    title: "2 · Flush",
    mode: "timer",
    help: "Corre solo. El periodo sale de esta pantalla. Si no se cambia, el flush es cada 12 horas.",
  },
  {
    id: 3,
    title: "3 · Bomba de cloro",
    mode: "flow",
    help: "Enciende cuando el agua cruda a tienda es mayor a 0. Sin flujo de agua cruda permanece apagada.",
  },
  {
    id: 4,
    title: "4 · Bomba de agua purificada",
    mode: "manual",
    defaultPin: 22,
    help: "Un interruptor físico enciende la bomba. No usa el mismo pin que la bomba de agua cruda.",
  },
];

function legacyRules(rules: ControllerRules) {
  return rules.relays?.some((relay) => (
    relay.id > 4
    || relay.mode === "and_inputs"
    || relay.mode === "pressure"
    || relay.mode === "diff"
  )) ?? false;
}

function savedRelay(rules: ControllerRules, id: number, legacy: boolean) {
  const list = rules.relays || [];
  const find = (relayId: number) => list.find((relay) => relay.id === relayId);
  if (!legacy) return find(id);
  if (id === 1) return find(1);
  if (id === 2) return find(3);
  if (id === 3) return find(4);
  const purified = find(6);
  return purified?.mode === "manual" ? purified : undefined;
}

function copyFlow(index: number, saved: ControllerFlowRule | undefined, fallback: ControllerFlowRule): ControllerFlowRule {
  if (!saved) return fallback;
  const generic = !saved.name || /^Medidor \d+$/.test(saved.name);
  const name = (generic ? fallback.name : saved.name).slice(0, 15);
  if (saved.origin === "platform" || (saved.device_code && saved.origin !== "pin")) {
    return { name, origin: "platform", role: fallback.role, device_code: saved.device_code || "" };
  }
  if (saved.origin === "pin" || saved.pin) {
    const pin = FLOW_PINS.includes(Number(saved.pin)) ? Number(saved.pin) : fallback.pin;
    return {
      name,
      origin: "pin",
      role: fallback.role,
      pin,
      liters_per_pulse: saved.liters_per_pulse ?? 0.1,
    };
  }
  return { ...fallback, name };
}

export function defaultRules(): ControllerRules {
  return {
    input_active_low: true,
    flows: FLOWS.map((flow) => (
      flow.origin === "pin"
        ? { name: flow.name, origin: "pin", role: flow.role, pin: flow.pin, liters_per_pulse: 0.1 }
        : { name: flow.name, origin: "platform", role: flow.role, device_code: "" }
    )),
    relays: RELAYS.map((relay) => {
      const base: ControllerRelayRule = { id: relay.id, enabled: false, mode: relay.mode };
      if (relay.mode === "manual") {
        base.on = false;
        base.input_a = relay.defaultPin ?? 16;
      }
      if (relay.mode === "timer") {
        base.interval_ms = FLUSH_EVERY_MS;
        base.duration_ms = 30000;
      }
      if (relay.mode === "flow") {
        base.meter = 1;
        base.min_lpm = 0;
        base.hyst_lpm = 0;
      }
      return base;
    }),
  };
}

export function rulesFromController(rules?: ControllerRules | null): ControllerRules {
  const base = defaultRules();
  if (!rules) return base;
  base.input_active_low = rules.input_active_low !== false;
  base.description = String(rules.description || "").slice(0, 280);
  base.flows = base.flows.map((flow, index) => copyFlow(index, rules.flows?.[index], flow));
  const legacy = legacyRules(rules);
  const raw = savedRelay(rules, 1, legacy);
  const flush = savedRelay(rules, 2, legacy);
  const chlorine = savedRelay(rules, 3, legacy);
  const purified = savedRelay(rules, 4, legacy);
  if (raw) {
    base.relays[0].enabled = Boolean(raw.enabled);
    base.relays[0].on = Boolean(raw.on);
    base.relays[0].input_a = INPUT_PINS.includes(Number(raw.input_a)) ? Number(raw.input_a) : 16;
  }
  if (flush?.mode === "timer" || flush?.interval_ms || flush?.duration_ms) {
    base.relays[1].enabled = Boolean(flush.enabled);
    if (flush.interval_ms) base.relays[1].interval_ms = flush.interval_ms;
    if (flush.duration_ms) base.relays[1].duration_ms = flush.duration_ms;
  }
  if (chlorine?.mode === "flow" || chlorine?.min_lpm != null || chlorine?.meter != null) {
    base.relays[2].enabled = Boolean(chlorine.enabled);
    base.relays[2].meter = 1;
    base.relays[2].min_lpm = Number(chlorine.min_lpm) || 0;
    base.relays[2].hyst_lpm = Number(chlorine.hyst_lpm) || 0;
  }
  if (purified) {
    base.relays[3].enabled = Boolean(purified.enabled);
    base.relays[3].on = Boolean(purified.on);
    const pin = Number(purified.input_a);
    const rawPin = Number(base.relays[0].input_a);
    base.relays[3].input_a = INPUT_PINS.includes(pin) && pin !== rawPin ? pin : 22;
  }
  return base;
}

export function validateControllerRules(rules: ControllerRules): string | null {
  const flowError = rules.flows.reduce<string | null>((found, flow, index) => {
    if (found) return found;
    const label = FLOWS[index]?.title || `Flujo ${index + 1}`;
    if (flow.origin === "platform") {
      const optional = flow.role === "calc" || flow.role === "read";
      return optional || flow.device_code?.trim() ? null : `${label}: elige el equipo en Medidores.`;
    }
    const pin = Number(flow.pin);
    if (!FLOW_PINS.includes(pin)) return `${label}: elige GPIO 4 o GPIO 19.`;
    const repeated = rules.flows.some(
      (other, otherIndex) => otherIndex !== index && other.origin !== "platform" && Number(other.pin) === pin
    );
    if (repeated) return "GPIO 4 y GPIO 19 no se pueden repetir entre flujos.";
    const liters = flow.liters_per_pulse ?? 0.1;
    if (liters <= 0 || liters > 100) return `${label}: los litros por pulso van de 0.0001 a 100.`;
    return null;
  }, null);
  if (flowError) return flowError;

  const switchPins = rules.relays.filter((relay) => relay.mode === "manual").map((relay) => Number(relay.input_a));
  if (switchPins.some((pin) => !INPUT_PINS.includes(pin))) return "Elige un GPIO válido para cada interruptor.";
  if (new Set(switchPins).size !== switchPins.length) return "La bomba de cruda y la de purificada no pueden usar el mismo interruptor.";

  return rules.relays.reduce<string | null>((found, relay) => {
    if (found) return found;
    if (relay.mode === "timer" && relay.enabled) {
      const minutes = (relay.interval_ms || 0) / 60000;
      const seconds = (relay.duration_ms || 0) / 1000;
      if (minutes < 1 || minutes > 10080) return "El periodo del flush va de 1 minuto a 7 días.";
      if (seconds < 1 || seconds > 3600) return "La duración del flush va de 1 a 3600 segundos.";
      if (seconds * 1000 >= minutes * 60000) return "La duración del flush tiene que ser menor que el periodo.";
    }
    return null;
  }, null);
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

type StoredMeter = {
  deviceCode?: string;
  deviceType?: string | null;
  installAddress?: string | null;
  online?: boolean | null;
  litersForward?: number | null;
  rawForward?: number | null;
  lastReportAt?: string | null;
};

type StoredMeterResponse = {
  success?: boolean;
  message?: string;
  rows?: StoredMeter[];
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
  const { liters } = displayVolume(meterRawM3(row), peerRaw);
  const litersLabel = liters == null ? "sin lectura" : `${fNumber(Math.round(liters))} L`;
  const active = meterIsOnline(row) ? "En línea" : "Fuera de línea";
  return `${id} · ${litersLabel} · ${name} · ${active}`;
}

type FieldsProps = {
  rules: ControllerRules;
  onChange: (rules: ControllerRules) => void;
  active: boolean;
};

function storedMeterRow(meter: StoredMeter): MeterRow {
  return {
    deviceCode: meter.deviceCode,
    deviceType: meter.deviceType || undefined,
    installAddress: meter.installAddress || undefined,
    isOnline: meter.online ?? undefined,
    totalMetering: meter.rawForward,
    snapshot: {
      litersForward: meter.litersForward,
      rawForward: meter.rawForward,
      online: meter.online ?? undefined,
    },
  };
}

export function ControllerRulesFields({ rules, onChange, active }: FieldsProps) {
  const [meters, setMeters] = useState<MeterOption[]>([]);
  const [metersError, setMetersError] = useState<string | null>(null);
  const [metersNote, setMetersNote] = useState<string | null>(null);
  const [metersLoading, setMetersLoading] = useState(false);
  const rulesRef = useRef(rules);
  rulesRef.current = rules;

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    setMetersLoading(true);
    setMetersError(null);
    const codes = rulesRef.current.flows
      .filter((flow) => flow.origin === "platform" && flow.device_code)
      .map((flow) => flow.device_code)
      .join(",");
    get<StoredMeterResponse>("/digital-meters", codes ? { codes } : undefined)
      .then((res) => {
        if (cancelled) return;
        const rows = (res?.rows || []).map(storedMeterRow);
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
        if (!res?.success && options.length === 0) {
          setMetersError(res?.message || "No se pudo cargar la lista de medidores");
          setMetersNote(null);
          return;
        }
        setMetersNote(res?.message || "Medidores leídos de la base.");
      })
      .catch((error: { response?: { data?: { message?: string } }; message?: string }) => {
        if (cancelled) return;
        setMeters([]);
        setMetersNote(null);
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

  const flowRole = (index: number) => {
    if (index <= 1) return "Arranque";
    if (index <= 3) return "Cálculo";
    return "Lectura";
  };

  return (
    <Stack spacing={2.5}>
      <MarkedSection mark="2" color="#0891B2" title="Flujos y medidores" subtitle="Pin físico en el controlador, o medidor digital guardado en la base.">
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
          {metersLoading ? "Cargando medidores guardados…" : metersNote}
        </Typography>
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "1fr", "@container (min-width: 720px)": { gridTemplateColumns: "1fr 1fr" }, "@container (min-width: 1100px)": { gridTemplateColumns: "1fr 1fr 1fr" } }}>
          {rules.flows.map((flow, index) => {
            const takenPins = rules.flows
              .filter((other, otherIndex) => otherIndex !== index && other.origin === "pin")
              .map((other) => Number(other.pin));
            return (
              <Box key={index} sx={{ containerType: "inline-size", minWidth: 0, p: 1.5, borderRadius: 1.5, bgcolor: "#F0FDFA", border: "1px solid #99F6E4" }}>
                <Box display="flex" flexWrap="wrap" alignItems="center" gap={1} mb={1}>
                  <Typography variant="subtitle2" sx={{ flex: "1 1 140px", minWidth: 0 }}>{FLOWS[index]?.title || `Flujo ${index + 1}`}</Typography>
                  <Box sx={{ px: 1, py: 0.25, borderRadius: 10, bgcolor: "#0891B2", color: "#fff", fontSize: 12 }}>{flowRole(index)}</Box>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                  {FLOWS[index]?.help}
                </Typography>
                <Stack spacing={1.5}>
                  <TextField
                    label="Nombre en pantalla"
                    value={flow.name}
                    onChange={(event) => updateFlow(index, { name: event.target.value.slice(0, 15) })}
                    fullWidth
                    helperText="Máximo 15 caracteres."
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
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& .MuiNativeSelect-select": { paddingTop: "16px", paddingBottom: "8px" } }}
                  >
                    <option value="pin">Pin físico</option>
                    <option value="platform">Medidor digital</option>
                  </TextField>
                  {flow.origin === "pin" ? (
                    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr", "@container (min-width: 480px)": { gridTemplateColumns: "1fr 1fr" } }}>
                      <TextField
                        select
                        label="Pin"
                        value={flow.pin ?? ""}
                        onChange={(event) => updateFlow(index, { pin: Number(event.target.value) })}
                        fullWidth
                        SelectProps={{ native: true }}
                        InputLabelProps={{ shrink: true }}
                    sx={{ "& .MuiNativeSelect-select": { paddingTop: "16px", paddingBottom: "8px" } }}
                        helperText="Por omisión, agua cruda en GPIO 4 y cruda a tienda en GPIO 19."
                      >
                        <option value="">Elige un pin</option>
                        {FLOW_PINS.map((pin) => (
                          <option key={pin} value={pin} disabled={takenPins.includes(pin)}>
                            GPIO {pin}{takenPins.includes(pin) ? " · ocupado" : ""}
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
                        helperText="Equysis: 0.1 L por pulso."
                      />
                    </Box>
                  ) : (
                    <TextField
                      select
                      label="Medidor digital"
                      value={flow.device_code || ""}
                      onChange={(event) => {
                        const deviceCode = event.target.value;
                        const previous = (flow.device_code || "").slice(0, 15);
                        const customName = flow.name && flow.name !== FLOWS[index]?.name && flow.name !== previous;
                        updateFlow(index, {
                          device_code: deviceCode,
                          name: customName ? flow.name : deviceCode.slice(0, 15),
                        });
                      }}
                      fullWidth
                      SelectProps={{ native: true }}
                      InputLabelProps={{ shrink: true }}
                    sx={{ "& .MuiNativeSelect-select": { paddingTop: "16px", paddingBottom: "8px" } }}
                      disabled={metersLoading && meters.length === 0}
                      helperText={metersError || meters.find((meter) => meter.deviceCode === flow.device_code)?.label || (flow.role === "calc" || flow.role === "read" ? "Puede quedar sin equipo hasta asignarlo." : "Elige un medidor guardado.")}
                    >
                      <option value="">{metersLoading ? "Cargando medidores…" : "Sin equipo"}</option>
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
        </Box>
      </MarkedSection>

      {rules.relays.map((relay) => {
        const meta = RELAYS.find((item) => item.id === relay.id);
        const color = RELAY_COLORS[relay.id - 1] || "#0369A1";
        return (
          <MarkedSection key={relay.id} mark={`3.${relay.id}`} color={color} title={meta?.title || `Relevador ${relay.id}`} subtitle={meta?.help}>
            <Box display="flex" justifyContent="flex-end" mb={1}>
              <FormControlLabel
                sx={{ mr: 0 }}
                control={
                  <Switch
                    checked={relay.enabled}
                    onChange={(event) => updateRelay(relay.id, { enabled: event.target.checked })}
                  />
                }
                label={relay.enabled ? "Activo" : "Apagado"}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              {relay.mode === "manual" && (
                <Stack spacing={1}>
                  <TextField
                    select
                    label="Pin del interruptor"
                    value={relay.input_a ?? meta?.defaultPin ?? 16}
                    onChange={(event) => updateRelay(relay.id, { input_a: Number(event.target.value) })}
                    fullWidth
                    SelectProps={{ native: true }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& .MuiNativeSelect-select": { paddingTop: "16px", paddingBottom: "8px" } }}
                    helperText="Se cierra a GND. En esta placa: 4, 16, 17, 19 o 22."
                  >
                    {INPUT_PINS.map((pin) => {
                      const taken = rules.relays.some((other) => other.mode === "manual" && other.id !== relay.id && Number(other.input_a) === pin);
                      return (
                        <option key={pin} value={pin} disabled={taken}>
                          GPIO {pin}{taken ? " · ocupado" : ""}
                        </option>
                      );
                    })}
                  </TextField>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(relay.on)}
                        onChange={(event) => updateRelay(relay.id, { on: event.target.checked })}
                      />
                    }
                    label="Forzar encendido desde el portal"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={rules.input_active_low}
                        onChange={(event) => onChange({ ...rules, input_active_low: event.target.checked })}
                      />
                    }
                    label="Activo al cerrar el interruptor a GND"
                  />
                </Stack>
              )}
              {relay.mode === "timer" && (
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr", "@container (min-width: 520px)": { gridTemplateColumns: "1fr 1fr" } }}>
                  <TextField
                    type="number"
                    label="Cada cuántos minutos"
                    value={(relay.interval_ms || 0) / 60000}
                    onChange={(event) => updateRelay(relay.id, { interval_ms: Number(event.target.value) * 60000 })}
                    inputProps={{ min: 1, max: 10080, step: 1 }}
                    fullWidth
                    helperText="720 minutos son 12 horas."
                  />
                  <TextField
                    type="number"
                    label="Segundos encendido"
                    value={(relay.duration_ms || 0) / 1000}
                    onChange={(event) => updateRelay(relay.id, { duration_ms: Number(event.target.value) * 1000 })}
                    inputProps={{ min: 1, max: 3600, step: 1 }}
                    fullWidth
                    helperText="Menor que el periodo."
                  />
                </Box>
              )}
              {relay.mode === "flow" && (
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr", "@container (min-width: 520px)": { gridTemplateColumns: "1fr 1fr" } }}>
                  <TextField
                    type="number"
                    label="Encender sobre (L/min)"
                    value={relay.min_lpm ?? 0}
                    onChange={(event) => updateRelay(relay.id, { min_lpm: Number(event.target.value), meter: 1 })}
                    inputProps={{ min: 0, step: 0.1 }}
                    fullWidth
                    helperText={`Sigue ${rules.flows[1]?.name || "Cruda a tienda"}. 0 enciende al haber flujo.`}
                  />
                  <TextField
                    type="number"
                    label="Histéresis (L/min)"
                    value={relay.hyst_lpm ?? 0}
                    onChange={(event) => updateRelay(relay.id, { hyst_lpm: Number(event.target.value), meter: 1 })}
                    inputProps={{ min: 0, step: 0.1 }}
                    fullWidth
                  />
                </Box>
              )}
            </Box>
          </MarkedSection>
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
        text: "Quedaron guardadas en el portal. El controlador las aplicará cuando se actualice.",
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
          Tres relevadores y cinco flujos. Sin flujo de agua cruda no arranca ningún relevador.
          Una regla deshabilitada deja ese relevador apagado.
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

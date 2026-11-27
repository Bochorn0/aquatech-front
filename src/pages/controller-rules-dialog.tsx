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

import type { Controller, ControllerRules, ControllerFlowRule, ControllerFlowRole, ControllerFlowAlarm, ControllerRelayRule, ControllerPressureAlarms, PressureAlarmChannel } from "./types";

const INPUT_PINS = [16, 22];

const FLUSH_EVERY_MS = 12 * 60 * 60 * 1000;
const LITERS_PER_PULSE = 0.00303;

function pulseFactor(value?: number) {
  if (value == null || !Number.isFinite(value) || value <= 0 || Math.abs(value - 0.1) < 0.000001) return LITERS_PER_PULSE;
  return value;
}

const FLOWS: Array<{
  role: ControllerFlowRole;
  title: string;
  name: string;
  help: string;
  origin: "pin" | "platform";
  pin?: number;
}> = [
  {
    role: "read",
    title: "1 · Cruda",
    name: "Entrada cruda",
    help: "Medidor digital. Solo informativo.",
    origin: "platform",
  },
  {
    role: "chlorine",
    title: "2 · Cruda tienda",
    name: "Tienda cruda",
    help: "Pin físico GPIO 19. No se elige medidor. Con flujo enciende la bomba de cloro.",
    origin: "pin",
    pin: 19,
  },
  {
    role: "calc",
    title: "3 · Producción",
    name: "Produccion",
    help: "Pin físico GPIO 4. No se elige medidor.",
    origin: "pin",
    pin: 4,
  },
  {
    role: "calc",
    title: "4 · Rechazo",
    name: "Rechazo",
    help: "Pin físico GPIO 17. No se elige medidor.",
    origin: "pin",
    pin: 17,
  },
  {
    role: "read",
    title: "5 · Tienda purificada",
    name: "Tda purificada",
    help: "Medidor digital. Solo informativo.",
    origin: "platform",
  },
];

const RELAY_COLORS = ["#0369A1", "#059669", "#D97706"];
const ALARM_OK = "#059669";
const ALARM_WARN = "#D97706";
const ALARM_BAD = "#DC2626";

const PRESSURE_SENSORS = [
  { sensor: 1, title: "S1 · GPIO 26", hint: "0.812 MPa" },
  { sensor: 2, title: "S2 · GPIO 27", hint: "1.983 MPa" },
  { sensor: 3, title: "S3 · GPIO 14", hint: "0.915 MPa" },
  { sensor: 4, title: "S4 · GPIO 12", hint: "2.327 MPa" },
  { sensor: 5, title: "S5 · GPIO 13", hint: "0.915 MPa" },
];

function thresholdText(value: number) {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function SemaphoreLegend({
  min,
  max,
  margin,
  ok,
  warn,
  alarm,
}: {
  min: number;
  max: number;
  margin: number;
  ok: string;
  warn: string;
  alarm: string;
}) {
  const low = Number(min);
  const high = Number(max);
  const edge = Number(margin);
  const ready = Number.isFinite(low) && Number.isFinite(high) && Number.isFinite(edge) && high > low && edge >= 0;
  if (!ready) {
    return (
      <Typography variant="caption" color="text.secondary">
        El mínimo tiene que ser menor que el máximo.
      </Typography>
    );
  }
  const innerLow = Math.min(high, low + edge);
  const innerHigh = Math.max(low, high - edge);
  const hasGreen = innerLow < innerHigh;
  const bands = [
    { color: alarm, text: `menos de ${thresholdText(low)} y más de ${thresholdText(high)}` },
    ...(edge > 0 ? [{
      color: warn,
      text: hasGreen
        ? `${thresholdText(low)} a ${thresholdText(innerLow)} y ${thresholdText(innerHigh)} a ${thresholdText(high)}`
        : `${thresholdText(low)} a ${thresholdText(high)}`,
    }] : []),
    ...(hasGreen ? [{ color: ok, text: `${thresholdText(innerLow)} a ${thresholdText(innerHigh)}` }] : []),
  ];
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 1.75, rowGap: 0.5, alignItems: "center" }}>
      {bands.map((band) => (
        <Box key={band.text} sx={{ display: "inline-flex", alignItems: "center", gap: 0.7 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: band.color, flexShrink: 0 }} />
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>{band.text}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function hexColor(value: unknown, fallback: string) {
  const text = String(value || "").trim();
  return /^#[0-9A-Fa-f]{6}$/.test(text) ? text : fallback;
}

function defaultPressureAlarms(): ControllerPressureAlarms {
  return {
    color_ok: ALARM_OK,
    color_warn: ALARM_WARN,
    color_alarm: ALARM_BAD,
    sensors: PRESSURE_SENSORS.map((item) => ({
      sensor: item.sensor,
      enabled: false,
      min_psi: 20,
      max_psi: 80,
      margin_psi: 5,
      channel: "portal" as PressureAlarmChannel,
      email: "",
    })),
  };
}

function copyPressureAlarms(saved?: ControllerPressureAlarms | null): ControllerPressureAlarms {
  const base = defaultPressureAlarms();
  if (!saved) return base;
  base.color_ok = hexColor(saved.color_ok, ALARM_OK);
  base.color_warn = hexColor(saved.color_warn, ALARM_WARN);
  base.color_alarm = hexColor(saved.color_alarm, ALARM_BAD);
  base.sensors = base.sensors.map((sensor) => {
    const found = saved.sensors?.find((item) => item.sensor === sensor.sensor);
    if (!found) return sensor;
    const channel: PressureAlarmChannel = found.channel === "email" || found.channel === "both" ? found.channel : "portal";
    const minPsi = Number(found.min_psi);
    const maxPsi = Number(found.max_psi);
    const margin = Number(found.margin_psi);
    return {
      ...sensor,
      enabled: Boolean(found.enabled),
      min_psi: Number.isFinite(minPsi) ? minPsi : sensor.min_psi,
      max_psi: Number.isFinite(maxPsi) ? maxPsi : sensor.max_psi,
      margin_psi: Number.isFinite(margin) ? margin : sensor.margin_psi,
      channel,
      email: String(found.email || "").trim().slice(0, 80),
    };
  });
  return base;
}

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
    title: "1 · Bomba",
    mode: "manual",
    defaultPin: 16,
    help: "El interruptor físico enciende la bomba. Relevador GPIO 32.",
  },
  {
    id: 2,
    title: "2 · Bomba de cloro",
    mode: "flow",
    help: "Enciende cuando hay flujo en tienda cruda. Relevador GPIO 33.",
  },
  {
    id: 3,
    title: "3 · Flush",
    mode: "timer",
    defaultPin: 22,
    help: "Periodo de esta pantalla, o el interruptor físico. Relevador GPIO 25.",
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

function copyFlowAlarm(saved?: ControllerFlowAlarm): ControllerFlowAlarm {
  const channel: PressureAlarmChannel = saved?.channel === "email" || saved?.channel === "both" ? saved.channel : "portal";
  const minLpm = Number(saved?.min_lpm);
  const maxLpm = Number(saved?.max_lpm);
  const margin = Number(saved?.margin_lpm);
  return {
    enabled: Boolean(saved?.enabled),
    min_lpm: Number.isFinite(minLpm) ? minLpm : 0,
    max_lpm: Number.isFinite(maxLpm) ? maxLpm : 60,
    margin_lpm: Number.isFinite(margin) ? margin : 5,
    channel,
    email: String(saved?.email || "").trim().slice(0, 80),
  };
}

function copyFlow(_index: number, saved: ControllerFlowRule | undefined, fallback: ControllerFlowRule): ControllerFlowRule {
  if (!saved) return fallback;
  const generic = !saved.name || /^Medidor \d+$/.test(saved.name);
  const name = (generic ? fallback.name : saved.name).slice(0, 15);
  const alarm = copyFlowAlarm(saved.alarm);
  if (fallback.origin === "pin") {
    return {
      name,
      origin: "pin",
      role: fallback.role,
      pin: fallback.pin,
      liters_per_pulse: pulseFactor(saved.liters_per_pulse),
      alarm,
    };
  }
  const deviceCode = saved.origin === "platform" || saved.device_code ? saved.device_code || "" : "";
  return { name, origin: "platform", role: fallback.role, device_code: deviceCode, alarm };
}

export function defaultRules(): ControllerRules {
  return {
    input_active_low: true,
    flows: FLOWS.map((flow) => (
      flow.origin === "pin"
        ? { name: flow.name, origin: "pin", role: flow.role, pin: flow.pin, liters_per_pulse: LITERS_PER_PULSE, alarm: copyFlowAlarm() }
        : { name: flow.name, origin: "platform", role: flow.role, device_code: "", alarm: copyFlowAlarm() }
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
        base.input_a = relay.defaultPin ?? 22;
      }
      if (relay.mode === "flow") {
        base.meter = 1;
        base.min_lpm = 0;
        base.hyst_lpm = 0;
      }
      return base;
    }),
    pressure_alarms: defaultPressureAlarms(),
  };
}

export function rulesFromController(rules?: ControllerRules | null): ControllerRules {
  const base = defaultRules();
  if (!rules) return base;
  base.input_active_low = rules.input_active_low !== false;
  base.description = String(rules.description || "").slice(0, 280);
  base.flows = base.flows.map((flow, index) => copyFlow(index, rules.flows?.[index], flow));
  base.pressure_alarms = copyPressureAlarms(rules.pressure_alarms);
  const list = rules.relays || [];
  const find = (id: number) => list.find((relay) => relay.id === id);
  const oldShape = find(2)?.mode === "timer" && find(3)?.mode === "flow";
  const raw = legacyRules(rules) ? savedRelay(rules, 1, true) : find(1);
  const chlorine = legacyRules(rules) ? savedRelay(rules, 3, true) : (oldShape ? find(3) : find(2));
  const flush = legacyRules(rules) ? savedRelay(rules, 2, true) : (oldShape ? find(2) : find(3));
  if (raw) {
    base.relays[0].enabled = Boolean(raw.enabled);
    base.relays[0].on = Boolean(raw.on);
    base.relays[0].input_a = INPUT_PINS.includes(Number(raw.input_a)) ? Number(raw.input_a) : 16;
  }
  if (chlorine?.mode === "flow" || chlorine?.min_lpm != null || chlorine?.meter != null) {
    base.relays[1].enabled = Boolean(chlorine.enabled);
    base.relays[1].meter = 1;
    base.relays[1].min_lpm = Number(chlorine.min_lpm) || 0;
    base.relays[1].hyst_lpm = Number(chlorine.hyst_lpm) || 0;
  }
  if (flush?.mode === "timer" || flush?.interval_ms || flush?.duration_ms) {
    base.relays[2].enabled = Boolean(flush.enabled);
    if (flush.interval_ms) base.relays[2].interval_ms = flush.interval_ms;
    if (flush.duration_ms) base.relays[2].duration_ms = flush.duration_ms;
    const savedPin = oldShape ? Number(find(4)?.input_a) : Number(flush.input_a);
    const rawPin = Number(base.relays[0].input_a);
    base.relays[2].input_a = INPUT_PINS.includes(savedPin) && savedPin !== rawPin ? savedPin : 22;
  }
  return base;
}

export function validateControllerRules(rules: ControllerRules): string | null {
  const flowError = rules.flows.reduce<string | null>((found, flow, index) => {
    if (found) return found;
    const label = FLOWS[index]?.title || `Flujo ${index + 1}`;
    if (flow.origin === "platform") {
      return flow.role === "read" || flow.device_code?.trim() ? null : `${label}: elige el equipo en Medidores.`;
    }
    const pin = Number(flow.pin);
    const expected = Number(FLOWS[index]?.pin);
    if (pin !== expected) return `${label}: este flujo va en GPIO ${expected}.`;
    const liters = pulseFactor(flow.liters_per_pulse);
    if (liters <= 0 || liters > 100) return `${label}: el factor de conversión va de 0.0001 a 100 litros por pulso.`;
    const alarm = flow.alarm;
    if (alarm?.enabled) {
      if (!(alarm.min_lpm < alarm.max_lpm)) return `${label}: el mínimo del semáforo tiene que ser menor que el máximo.`;
      if (alarm.margin_lpm < 0) return `${label}: el margen del semáforo no puede ser negativo.`;
      if (alarm.margin_lpm * 2 >= alarm.max_lpm - alarm.min_lpm) return `${label}: el margen amarillo tiene que dejar una zona verde.`;
      if ((alarm.channel === "email" || alarm.channel === "both") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alarm.email || "")) {
        return `${label}: escribe el correo de la alerta.`;
      }
    }
    return null;
  }, null);
  if (flowError) return flowError;

  const switchPins = rules.relays.filter((relay) => relay.mode === "manual" || relay.mode === "timer").map((relay) => Number(relay.input_a));
  if (switchPins.some((pin) => !INPUT_PINS.includes(pin))) return "Elige un GPIO válido para cada interruptor.";
  if (new Set(switchPins).size !== switchPins.length) return "La bomba y el flush no pueden usar el mismo interruptor.";

  const alarmError = rules.pressure_alarms.sensors.reduce<string | null>((found, sensor) => {
    if (found || !sensor.enabled) return found;
    if (!(sensor.min_psi < sensor.max_psi)) return `S${sensor.sensor}: el mínimo tiene que ser menor que el máximo.`;
    if (sensor.margin_psi < 0) return `S${sensor.sensor}: el margen no puede ser negativo.`;
    if (sensor.margin_psi * 2 >= sensor.max_psi - sensor.min_psi) return `S${sensor.sensor}: el margen amarillo tiene que dejar una zona verde.`;
    if ((sensor.channel === "email" || sensor.channel === "both") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sensor.email || "")) {
      return `S${sensor.sensor}: escribe el correo de la alerta.`;
    }
    return null;
  }, null);
  if (alarmError) return alarmError;

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

  const updateAlarm = (sensor: number, patchAlarm: Partial<ControllerPressureAlarms["sensors"][number]>) => {
    onChange({
      ...rules,
      pressure_alarms: {
        ...rules.pressure_alarms,
        sensors: rules.pressure_alarms.sensors.map((item) => (item.sensor === sensor ? { ...item, ...patchAlarm } : item)),
      },
    });
  };

  const updateAlarmColors = (patchColors: Partial<Pick<ControllerPressureAlarms, "color_ok" | "color_warn" | "color_alarm">>) => {
    onChange({
      ...rules,
      pressure_alarms: { ...rules.pressure_alarms, ...patchColors },
    });
  };

  const updateFlow = (index: number, patchFlow: Partial<ControllerFlowRule>) => {
    const meta = FLOWS[index];
    const patch = meta?.origin === "pin"
      ? { ...patchFlow, origin: "pin" as const, role: meta.role, pin: meta.pin, device_code: undefined }
      : patchFlow;
    onChange({
      ...rules,
      flows: rules.flows.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    });
  };

  const flowRole = (index: number) => {
    if (index === 1) return "Arranque";
    if (index === 2 || index === 3) return "Cálculo";
    return "Lectura";
  };

  return (
    <Stack spacing={2.5}>
      <MarkedSection mark="2" color="#0891B2" title="Flujos y medidores" subtitle="1 cruda y 5 tienda purificada son medidores digitales. 2 cruda tienda es GPIO 19, 3 producción es GPIO 4 y 4 rechazo es GPIO 17.">
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
          {metersLoading ? "Cargando medidores guardados…" : metersNote}
        </Typography>
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "1fr", "@container (min-width: 720px)": { gridTemplateColumns: "1fr 1fr" }, "@container (min-width: 1100px)": { gridTemplateColumns: "1fr 1fr 1fr" } }}>
          {rules.flows.map((flow, index) => {
            const fixedPin = FLOWS[index]?.origin === "pin";
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
                  {fixedPin ? (
                    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr", "@container (min-width: 480px)": { gridTemplateColumns: "1fr 1fr" } }}>
                      <Box sx={{ px: 1.5, py: 1.25, borderRadius: 1, bgcolor: "#CCFBF1", border: "1px solid #5EEAD4" }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>GPIO {FLOWS[index]?.pin}</Typography>
                        <Typography variant="caption" color="text.secondary">Pin físico. Este flujo no lleva medidor digital.</Typography>
                      </Box>
                      <TextField
                        type="number"
                        label="Factor de conversión"
                        value={pulseFactor(flow.liters_per_pulse)}
                        onChange={(event) => updateFlow(index, { liters_per_pulse: Number(event.target.value) })}
                        inputProps={{ min: 0.0001, max: 100, step: 0.0001 }}
                        fullWidth
                        helperText="Sugerido Dragino DW-005: 0.00303 L por pulso. F = 5.5 × L/min."
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
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2">Semaforo</Typography>
                    <Switch
                      checked={Boolean(flow.alarm?.enabled)}
                      onChange={(event) => updateFlow(index, { alarm: { ...copyFlowAlarm(flow.alarm), enabled: event.target.checked } })}
                    />
                  </Box>
                  {flow.alarm?.enabled ? (
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1}>
                        <TextField type="number" label="Mín. L/min" value={flow.alarm.min_lpm} onChange={(event) => updateFlow(index, { alarm: { ...copyFlowAlarm(flow.alarm), min_lpm: Number(event.target.value) } })} inputProps={{ min: 0, step: 0.1 }} fullWidth />
                        <TextField type="number" label="Máx. L/min" value={flow.alarm.max_lpm} onChange={(event) => updateFlow(index, { alarm: { ...copyFlowAlarm(flow.alarm), max_lpm: Number(event.target.value) } })} inputProps={{ min: 0, step: 0.1 }} fullWidth />
                        <TextField type="number" label="Margen" value={flow.alarm.margin_lpm} onChange={(event) => updateFlow(index, { alarm: { ...copyFlowAlarm(flow.alarm), margin_lpm: Number(event.target.value) } })} inputProps={{ min: 0, step: 0.1 }} fullWidth />
                      </Stack>
                      <SemaphoreLegend
                        min={flow.alarm.min_lpm}
                        max={flow.alarm.max_lpm}
                        margin={flow.alarm.margin_lpm}
                        ok={rules.pressure_alarms.color_ok}
                        warn={rules.pressure_alarms.color_warn}
                        alarm={rules.pressure_alarms.color_alarm}
                      />
                      <TextField
                        select
                        label="Aviso"
                        value={flow.alarm.channel}
                        onChange={(event) => updateFlow(index, { alarm: { ...copyFlowAlarm(flow.alarm), channel: event.target.value as PressureAlarmChannel } })}
                        fullWidth
                        SelectProps={{ native: true }}
                        InputLabelProps={{ shrink: true }}
                        sx={{ "& .MuiNativeSelect-select": { paddingTop: "16px", paddingBottom: "8px" } }}
                        helperText="Verde, amarillo y rojo son los de las alarmas de presión."
                      >
                        <option value="portal">Notificación en el portal</option>
                        <option value="email">Correo</option>
                        <option value="both">Portal y correo</option>
                      </TextField>
                      {flow.alarm.channel !== "portal" ? (
                        <TextField
                          label="Correo"
                          value={flow.alarm.email || ""}
                          onChange={(event) => updateFlow(index, { alarm: { ...copyFlowAlarm(flow.alarm), email: event.target.value.trim().slice(0, 80) } })}
                          fullWidth
                        />
                      ) : null}
                    </Stack>
                  ) : null}
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
                    helperText="Se cierra a GND. 16 es la bomba y 22 el flush."
                  >
                    {INPUT_PINS.map((pin) => {
                      const taken = rules.relays.some((other) => other.id !== relay.id && (other.mode === "manual" || other.mode === "timer") && Number(other.input_a) === pin);
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
                    select
                    label="Pin del interruptor"
                    value={relay.input_a ?? meta?.defaultPin ?? 22}
                    onChange={(event) => updateRelay(relay.id, { input_a: Number(event.target.value) })}
                    fullWidth
                    SelectProps={{ native: true }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& .MuiNativeSelect-select": { paddingTop: "16px", paddingBottom: "8px" }, gridColumn: "1 / -1" }}
                    helperText="El flush también enciende si este interruptor se cierra a GND."
                  >
                    {INPUT_PINS.map((pin) => {
                      const taken = rules.relays.some((other) => other.id !== relay.id && (other.mode === "manual" || other.mode === "timer") && Number(other.input_a) === pin);
                      return (
                        <option key={pin} value={pin} disabled={taken}>
                          GPIO {pin}{taken ? " · ocupado" : ""}
                        </option>
                      );
                    })}
                  </TextField>
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
                    helperText={`Sigue ${rules.flows[1]?.name || "Tienda cruda"} en GPIO 19. 0 enciende al haber flujo.`}
                  />
                  <TextField
                    type="number"
                    label="Histéresis (L/min)"
                    value={relay.hyst_lpm ?? 0}
                    onChange={(event) => updateRelay(relay.id, { hyst_lpm: Number(event.target.value), meter: 1 })}
                    inputProps={{ min: 0, step: 0.1 }}
                    fullWidth
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ gridColumn: "1 / -1" }}>
                    Factor de {rules.flows[1]?.name || "Tienda cruda"}: {pulseFactor(rules.flows[1]?.liters_per_pulse).toFixed(5)} L/pulso. Se configura en Flujos y medidores.
                  </Typography>
                </Box>
              )}
            </Box>
          </MarkedSection>
        );
      })}

      <MarkedSection mark="4" color="#0F3A5A" title="Alarmas de presión" subtitle="Estos colores pintan la presión y también los flujos que tengan el semáforo activo.">
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
          {([
            ["color_ok", "Verde, en rango"],
            ["color_warn", "Amarillo, cerca"],
            ["color_alarm", "Rojo, fuera"],
          ] as const).map(([key, label]) => (
            <TextField
              key={key}
              type="color"
              label={label}
              value={rules.pressure_alarms[key]}
              onChange={(event) => updateAlarmColors({ [key]: hexColor(event.target.value, rules.pressure_alarms[key]) })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          ))}
        </Stack>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.5 }}>
          {rules.pressure_alarms.sensors.map((sensor) => {
            const meta = PRESSURE_SENSORS.find((item) => item.sensor === sensor.sensor);
            return (
              <Box key={sensor.sensor} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, p: 1.5 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                  <Box>
                    <Typography variant="subtitle2">{meta?.title || `S${sensor.sensor}`}</Typography>
                    <Typography variant="caption" color="text.secondary">{meta?.hint}</Typography>
                  </Box>
                  <FormControlLabel
                    sx={{ mr: 0 }}
                    control={<Switch checked={sensor.enabled} onChange={(event) => updateAlarm(sensor.sensor, { enabled: event.target.checked })} />}
                    label={sensor.enabled ? "Activa" : "Apagada"}
                  />
                </Box>
                <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                  <Stack direction="row" spacing={1}>
                    <TextField type="number" label="Mínimo (psi)" value={sensor.min_psi} onChange={(event) => updateAlarm(sensor.sensor, { min_psi: Number(event.target.value) })} inputProps={{ min: 0, max: 200, step: 1 }} fullWidth />
                    <TextField type="number" label="Máximo (psi)" value={sensor.max_psi} onChange={(event) => updateAlarm(sensor.sensor, { max_psi: Number(event.target.value) })} inputProps={{ min: 0, max: 200, step: 1 }} fullWidth />
                    <TextField type="number" label="Margen (psi)" value={sensor.margin_psi} onChange={(event) => updateAlarm(sensor.sensor, { margin_psi: Number(event.target.value) })} inputProps={{ min: 0, max: 50, step: 1 }} fullWidth />
                  </Stack>
                  <SemaphoreLegend
                    min={sensor.min_psi}
                    max={sensor.max_psi}
                    margin={sensor.margin_psi}
                    ok={rules.pressure_alarms.color_ok}
                    warn={rules.pressure_alarms.color_warn}
                    alarm={rules.pressure_alarms.color_alarm}
                  />
                  <TextField
                    select
                    label="Aviso"
                    value={sensor.channel}
                    onChange={(event) => updateAlarm(sensor.sensor, { channel: event.target.value as PressureAlarmChannel })}
                    fullWidth
                    SelectProps={{ native: true }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& .MuiNativeSelect-select": { paddingTop: "16px", paddingBottom: "8px" } }}
                  >
                    <option value="portal">Notificación en el portal</option>
                    <option value="email">Correo</option>
                    <option value="both">Portal y correo</option>
                  </TextField>
                  {sensor.channel !== "portal" ? (
                    <TextField
                      label="Correo"
                      value={sensor.email || ""}
                      onChange={(event) => updateAlarm(sensor.sensor, { email: event.target.value.trim().slice(0, 80) })}
                      fullWidth
                      helperText="Se envía al salir del rango y al volver."
                    />
                  ) : null}
                </Stack>
              </Box>
            );
          })}
        </Box>
      </MarkedSection>
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

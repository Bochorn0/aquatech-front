/** Fixture + rangos de maqueta (Punto de Venta v2). No envía correos. */

export type MeterReportPoint = {
  at: string;
  forwardM3: number;
  reverseM3: number;
  voltage: number;
  remainingPower: number;
  isLeak: boolean;
  isReverseFlow: boolean;
  isOverFlow: boolean;
  success: number;
  total: number;
  valve?: string;
  pipeDiameter?: number;
};

export type AlertChannel = 'none' | 'preventivo' | 'correo';
export type AlertLevel = 'normal' | 'preventivo' | 'critico';

export type DemoRule = {
  min: number | null;
  max: number | null;
  label: string;
  message: string;
  severity: AlertLevel;
  channel: AlertChannel;
};

export type MetricAlert = {
  label: string;
  message: string;
  severity: 'success' | 'warning' | 'error' | 'info';
  bgColor: string;
  borderColor: string;
  channel: AlertChannel;
  level: AlertLevel;
};

export const DEMO_SITE = {
  deviceCode: '20260701010012',
  siteName: 'Sitio de prueba · Medidor NB',
  address: 'Zhejiang, China',
  client: 'Meter Platform (prueba)',
  deviceType: 'NB water meter',
};

/** Reportes diarios del JSON de prueba (más antiguo → más reciente). */
export const DEMO_HISTORY: MeterReportPoint[] = [
  { at: '2026-08-12 06:04:09', forwardM3: 2.396, reverseM3: 0.371, voltage: 3.7, remainingPower: 98, isLeak: false, isReverseFlow: false, isOverFlow: false, success: 54, total: 58, valve: '阀门开', pipeDiameter: 15 },
  { at: '2026-08-13 06:04:09', forwardM3: 2.396, reverseM3: 0.371, voltage: 3.698, remainingPower: 98, isLeak: false, isReverseFlow: false, isOverFlow: false, success: 55, total: 59, valve: '阀门开', pipeDiameter: 15 },
  { at: '2026-08-14 06:04:08', forwardM3: 2.396, reverseM3: 0.371, voltage: 3.698, remainingPower: 98, isLeak: false, isReverseFlow: false, isOverFlow: false, success: 56, total: 60, valve: '阀门开', pipeDiameter: 15 },
  { at: '2026-08-15 06:04:09', forwardM3: 2.396, reverseM3: 0.371, voltage: 3.697, remainingPower: 98, isLeak: false, isReverseFlow: false, isOverFlow: false, success: 57, total: 61, valve: '阀门开', pipeDiameter: 15 },
  { at: '2026-08-16 06:04:09', forwardM3: 2.396, reverseM3: 0.371, voltage: 3.698, remainingPower: 98, isLeak: false, isReverseFlow: false, isOverFlow: false, success: 58, total: 62, valve: '阀门开', pipeDiameter: 15 },
  { at: '2026-08-17 06:04:10', forwardM3: 2.396, reverseM3: 0.371, voltage: 3.699, remainingPower: 98, isLeak: false, isReverseFlow: false, isOverFlow: false, success: 59, total: 63, valve: '阀门开', pipeDiameter: 15 },
  { at: '2026-08-18 06:05:17', forwardM3: 2.396, reverseM3: 0.371, voltage: 3.698, remainingPower: 98, isLeak: false, isReverseFlow: false, isOverFlow: false, success: 60, total: 64, valve: '阀门开', pipeDiameter: 15 },
  { at: '2026-08-19 06:04:39', forwardM3: 2.396, reverseM3: 0.371, voltage: 3.698, remainingPower: 98, isLeak: false, isReverseFlow: false, isOverFlow: false, success: 61, total: 65, valve: '阀门开', pipeDiameter: 15 },
  { at: '2026-08-20 06:04:13', forwardM3: 2.396, reverseM3: 0.371, voltage: 3.697, remainingPower: 98, isLeak: false, isReverseFlow: false, isOverFlow: false, success: 62, total: 66, valve: '阀门开', pipeDiameter: 15 },
  { at: '2026-08-21 06:04:09', forwardM3: 2.397, reverseM3: 0.845, voltage: 3.697, remainingPower: 98, isLeak: false, isReverseFlow: false, isOverFlow: false, success: 63, total: 67, valve: '阀门开', pipeDiameter: 15 },
  { at: '2026-08-22 06:04:09', forwardM3: 2.648, reverseM3: 1.037, voltage: 3.698, remainingPower: 98, isLeak: false, isReverseFlow: false, isOverFlow: false, success: 64, total: 68, valve: '阀门开', pipeDiameter: 15 },
  { at: '2026-08-23 06:04:09', forwardM3: 2.648, reverseM3: 1.956, voltage: 3.696, remainingPower: 98, isLeak: false, isReverseFlow: false, isOverFlow: false, success: 65, total: 69, valve: '阀门开', pipeDiameter: 15 },
  { at: '2026-08-24 06:04:09', forwardM3: 2.648, reverseM3: 1.956, voltage: 3.698, remainingPower: 97, isLeak: false, isReverseFlow: false, isOverFlow: false, success: 66, total: 70, valve: '阀门开', pipeDiameter: 15 },
  { at: '2026-08-25 06:04:09', forwardM3: 3.342, reverseM3: 1.957, voltage: 3.7, remainingPower: 97, isLeak: false, isReverseFlow: false, isOverFlow: false, success: 67, total: 71, valve: '阀门开', pipeDiameter: 15 },
  { at: '2026-08-26 06:04:09', forwardM3: 3.342, reverseM3: 3.972, voltage: 3.693, remainingPower: 97, isLeak: false, isReverseFlow: false, isOverFlow: false, success: 68, total: 72, valve: '阀门开', pipeDiameter: 15 },
  { at: '2026-08-27 06:04:13', forwardM3: 3.342, reverseM3: 5.123, voltage: 3.69, remainingPower: 97, isLeak: false, isReverseFlow: false, isOverFlow: false, success: 69, total: 73, valve: '阀门开', pipeDiameter: 15 },
  { at: '2026-08-28 06:04:09', forwardM3: 3.358, reverseM3: 5.123, voltage: 3.692, remainingPower: 97, isLeak: false, isReverseFlow: false, isOverFlow: false, success: 70, total: 74, valve: '阀门开', pipeDiameter: 15 },
  { at: '2026-08-29 06:04:09', forwardM3: 3.358, reverseM3: 5.336, voltage: 3.7, remainingPower: 97, isLeak: false, isReverseFlow: false, isOverFlow: false, success: 71, total: 75, valve: '阀门开', pipeDiameter: 15 },
  { at: '2026-08-30 06:04:15', forwardM3: 3.358, reverseM3: 5.336, voltage: 3.699, remainingPower: 97, isLeak: false, isReverseFlow: false, isOverFlow: false, success: 72, total: 76, valve: '阀门开', pipeDiameter: 15 },
  { at: '2026-08-31 06:04:19', forwardM3: 3.358, reverseM3: 5.336, voltage: 3.701, remainingPower: 97, isLeak: false, isReverseFlow: false, isOverFlow: false, success: 73, total: 77, valve: '阀门开', pipeDiameter: 15 },
];

export const DEMO_METRIC_RULES: Record<string, DemoRule[]> = {
  volumenL: [
    { min: 0, max: null, label: 'En rango', message: 'Acumulado del medidor (odómetro).', severity: 'normal', channel: 'none' },
  ],
  inversoL: [
    { min: 3000, max: null, label: 'Crítico', message: 'Flujo inverso muy alto. Se detonaría correo al responsable del sitio.', severity: 'critico', channel: 'correo' },
    { min: 500, max: 2999.999, label: 'Preventivo', message: 'Inverso por encima del residual de prueba. Alerta preventiva (sin correo).', severity: 'preventivo', channel: 'preventivo' },
    { min: 0, max: 499.999, label: 'En rango', message: 'Flujo inverso residual.', severity: 'normal', channel: 'none' },
  ],
  voltage: [
    { min: 0, max: 3.399, label: 'Crítico', message: 'Batería baja. Se detonaría correo de reemplazo.', severity: 'critico', channel: 'correo' },
    { min: 3.4, max: 3.599, label: 'Preventivo', message: 'Batería en zona de vigilancia.', severity: 'preventivo', channel: 'preventivo' },
    { min: 3.6, max: null, label: 'En rango', message: 'Voltaje de alimentación estable.', severity: 'normal', channel: 'none' },
  ],
  remainingPower: [
    { min: 0, max: 19.99, label: 'Crítico', message: 'Reserva < 20%. Se detonaría correo.', severity: 'critico', channel: 'correo' },
    { min: 20, max: 84.99, label: 'Preventivo', message: 'Reserva por debajo de 85%.', severity: 'preventivo', channel: 'preventivo' },
    { min: 85, max: null, label: 'En rango', message: 'Reserva de batería saludable.', severity: 'normal', channel: 'none' },
  ],
  consumoDiarioL: [
    { min: 500, max: null, label: 'Crítico', message: 'Consumo diario anómalo. Posible fuga; se detonaría correo.', severity: 'critico', channel: 'correo' },
    { min: 200, max: 499.999, label: 'Preventivo', message: 'Consumo por encima del umbral de sitio de prueba.', severity: 'preventivo', channel: 'preventivo' },
    { min: 0, max: 199.999, label: 'En rango', message: 'Consumo diario dentro del rango del sitio.', severity: 'normal', channel: 'none' },
  ],
  reportOkPct: [
    { min: 0, max: 69.99, label: 'Crítico', message: 'Muchos reportes fallidos. Se detonaría correo de enlace.', severity: 'critico', channel: 'correo' },
    { min: 70, max: 89.99, label: 'Preventivo', message: 'Tasa de reportes por debajo de 90%.', severity: 'preventivo', channel: 'preventivo' },
    { min: 90, max: null, label: 'En rango', message: 'El medidor reporta de forma estable (~1 / día).', severity: 'normal', channel: 'none' },
  ],
};

export function toLiters(m3: number | null | undefined): number | null {
  if (m3 == null || !Number.isFinite(Number(m3))) return null;
  return Number(m3) * 1000;
}

export function matchRule(value: number | null | undefined, rules: DemoRule[]): DemoRule | null {
  if (value == null || !Number.isFinite(value) || !rules?.length) return null;
  return (
    rules.find((rule) => {
      const min = rule.min == null ? -Infinity : rule.min;
      const max = rule.max == null ? Infinity : rule.max;
      return value >= min && value <= max;
    }) || null
  );
}

export function ruleToAlert(rule: DemoRule | null, fallback: string): MetricAlert {
  if (!rule) {
    return {
      label: fallback,
      message: '',
      severity: 'success',
      bgColor: 'success.lighter',
      borderColor: 'success.main',
      channel: 'none',
      level: 'normal',
    };
  }
  if (rule.severity === 'critico') {
    return {
      label: rule.label,
      message: rule.message,
      severity: 'error',
      bgColor: 'error.lighter',
      borderColor: 'error.main',
      channel: rule.channel,
      level: 'critico',
    };
  }
  if (rule.severity === 'preventivo') {
    return {
      label: rule.label,
      message: rule.message,
      severity: 'warning',
      bgColor: 'warning.lighter',
      borderColor: 'warning.main',
      channel: rule.channel,
      level: 'preventivo',
    };
  }
  return {
    label: rule.label,
    message: rule.message,
    severity: 'success',
    bgColor: 'success.lighter',
    borderColor: 'success.main',
    channel: rule.channel,
    level: 'normal',
  };
}

export function evaluateMetric(value: number | null | undefined, rules: DemoRule[]): MetricAlert {
  return ruleToAlert(matchRule(value, rules), 'En rango');
}

export function parseConnRows(rows: Array<Record<string, any>> | undefined): MeterReportPoint[] {
  if (!Array.isArray(rows)) return [];
  const points: MeterReportPoint[] = [];
  rows.forEach((row) => {
    const point = pointFromConnRow(row);
    if (point) points.push(point);
  });

  return points.sort(
    (a, b) => new Date(a.at.replace(' ', 'T')).getTime() - new Date(b.at.replace(' ', 'T')).getTime()
  );
}

function reportPayload(row: Record<string, any>): Record<string, any> | null {
  const parsed = row?.analyticalParsed?.meterReportRequest;
  if (parsed && typeof parsed === 'object') return parsed;
  const body = row?.analyticalBody;
  if (typeof body === 'string' && body.trim().startsWith('{')) {
    try {
      const json = JSON.parse(body);
      return json?.meterReportRequest || json;
    } catch {
      return null;
    }
  }
  return null;
}

function pointFromConnRow(row: Record<string, any>): MeterReportPoint | null {
  const m = reportPayload(row);
  if (!m) return null;
  const forward = Number(m.currentForwardUsage ?? m.totalMetering ?? m.totalUsage);
  if (!Number.isFinite(forward)) return null;
  return {
    at: String(row.createTime || m.terminalClock || ''),
    forwardM3: forward,
    reverseM3: Number(m.reverseUsage ?? m.currentReverseUsage) || 0,
    voltage: Number(m.voltage) || 0,
    remainingPower: Number(m.remainingPower) || 0,
    isLeak: Boolean(m.isLeak),
    isReverseFlow: Boolean(m.isReverseFlow),
    isOverFlow: Boolean(m.isOverFlow),
    success: Number(m.successReportTimes) || 0,
    total: Number(m.totalReportTimes) || 0,
    valve: m.valveDesc ? String(m.valveDesc) : undefined,
    pipeDiameter: Number(m.pipeDiameter) || undefined,
  };
}

function metricNum(metrics: Array<{ name: string; value: number }> | undefined, name: string): number | null {
  const found = metrics?.find((m) => m.name === name);
  const n = found != null ? Number(found.value) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function snapshotFromDevice(data: {
  listRow?: Record<string, any> | null;
  extend?: Record<string, any> | null;
  normalized?: { observedAt?: string; metrics?: Array<{ name: string; value: number }> } | null;
} | null): MeterReportPoint | null {
  if (!data) return null;
  const metrics = data.normalized?.metrics;
  const litersFwd = metricNum(metrics, 'volume_positive');
  const listM3 = Number(data.listRow?.totalMetering);
  const forwardM3 =
    litersFwd != null ? litersFwd / 1000 : Number.isFinite(listM3) ? listM3 : null;
  if (forwardM3 == null) return null;

  const litersRev = metricNum(metrics, 'volume_reverse');
  const voltage =
    metricNum(metrics, 'voltage_meter')
    ?? Number(data.extend?.voltage)
    ?? 0;
  const remaining = Number(data.extend?.remainingPower) || 0;

  return {
    at: String(data.normalized?.observedAt || data.listRow?.lastConnTime || data.extend?.updateTime || ''),
    forwardM3,
    reverseM3: litersRev != null ? litersRev / 1000 : 0,
    voltage: Number.isFinite(voltage) ? voltage : 0,
    remainingPower: remaining,
    isLeak: Boolean(data.extend?.isLeak),
    isReverseFlow: Boolean(data.extend?.isReverseFlow),
    isOverFlow: Boolean(data.extend?.isOverFlow),
    success: 0,
    total: 0,
    valve: data.extend?.valveDesc || data.listRow?.valveStatus,
    pipeDiameter: Number(data.extend?.pipeDiameter) || undefined,
  };
}

export function historyFromUsage(
  entries: Array<{ date: string; m3?: number; liters?: number }> | undefined
): MeterReportPoint[] {
  if (!Array.isArray(entries) || !entries.length) return [];
  return [...entries]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((entry) => {
      const m3 =
        Number.isFinite(Number(entry.m3)) ? Number(entry.m3) : Number(entry.liters) / 1000;
      return {
        at: String(entry.date),
        forwardM3: Number.isFinite(m3) ? m3 : 0,
        reverseM3: 0,
        voltage: 0,
        remainingPower: 0,
        isLeak: false,
        isReverseFlow: false,
        isOverFlow: false,
        success: 0,
        total: 0,
      };
    });
}

/** History for the open device. Never reuse another sensor's fixture. */
export function historyForDevice(
  deviceCode: string,
  data: {
    connRecords?: { rows?: Array<Record<string, any>> };
    usageBreakdown?: { dailyUsageEnriched?: Array<{ date: string; m3?: number; liters?: number }> | null } | null;
    listRow?: Record<string, any> | null;
    extend?: Record<string, any> | null;
    normalized?: { observedAt?: string; metrics?: Array<{ name: string; value: number }> } | null;
  } | null
): MeterReportPoint[] {
  const fromConn = parseConnRows(data?.connRecords?.rows);
  if (fromConn.length) return fromConn;

  const fromUsage = historyFromUsage(data?.usageBreakdown?.dailyUsageEnriched || undefined);
  if (fromUsage.length) return fromUsage;

  const snap = snapshotFromDevice(data);
  if (snap) return [snap];

  if (deviceCode === DEMO_SITE.deviceCode) return DEMO_HISTORY;
  return [];
}

export function chartDayLabel(at: string) {
  const d = new Date(String(at).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return at.slice(5, 10);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

export function dailyDeltas(points: MeterReportPoint[]) {
  return points.map((point, index) => {
    const prev = points[index - 1];
    return {
      at: point.at,
      date: String(point.at).slice(0, 10),
      forwardL: toLiters(point.forwardM3) ?? 0,
      reverseL: toLiters(point.reverseM3) ?? 0,
      deltaForwardL: prev ? (point.forwardM3 - prev.forwardM3) * 1000 : 0,
      deltaReverseL: prev ? (point.reverseM3 - prev.reverseM3) * 1000 : 0,
      voltage: point.voltage,
    };
  });
}

export function channelLabel(channel: AlertChannel) {
  if (channel === 'correo') return 'Detonaría correo';
  if (channel === 'preventivo') return 'Alerta preventiva';
  return 'Sin disparo';
}

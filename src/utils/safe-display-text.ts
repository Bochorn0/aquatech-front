/** Coerce API/Tuya values to a React-safe scalar (avoids React #130 on object children). */
export function safeDisplayText(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (o.value != null) return safeDisplayText(o.value, fallback);
    if (o.val != null) return safeDisplayText(o.val, fallback);
    if (typeof o.name === 'string') return o.name;
    if (typeof o.es === 'string') return o.es;
    if (typeof o.en === 'string') return o.en;
    if (typeof o.text === 'string') return o.text;
    if (typeof o.label === 'string') return o.label;
  }
  return fallback;
}

/** Resolve numeric cliente id from V2 detalle payload (never return a cliente object). */
export function safeLower(value: unknown): string {
  return safeDisplayText(value, '').toLowerCase();
}

/** Match V1 /metrics row by client id (cliente may be number, string, or nested object). */
export function matchV1MetricsRowForCliente(rows: unknown, clienteId: string): unknown {
  if (!Array.isArray(rows) || !clienteId) return undefined;
  return rows.find((m: any) => {
    const raw = m?.cliente ?? m?.client_id;
    if (raw != null && typeof raw === 'object') {
      const id = (raw as Record<string, unknown>).id ?? (raw as Record<string, unknown>)._id;
      return id != null && String(id) === clienteId;
    }
    return raw != null && String(raw) === clienteId;
  });
}

/** Normalize V2/region metric configs so rule labels/types are always render-safe strings. */
export function sanitizeMetricsConfigList(list: unknown): any[] {
  if (!Array.isArray(list)) return [];
  return list.map((m: any) => ({
    ...m,
    metric_name: safeDisplayText(m?.metric_name, ''),
    metric_type: safeDisplayText(m?.metric_type, ''),
    sensor_type: safeDisplayText(m?.sensor_type, ''),
    sensor_unit: safeDisplayText(m?.sensor_unit, ''),
    rules: Array.isArray(m?.rules)
      ? m.rules.map((rule: any) => ({
          ...rule,
          label: safeDisplayText(rule?.label, ''),
          message: safeDisplayText(rule?.message, ''),
          color: safeDisplayText(rule?.color, ''),
          severity: safeDisplayText(rule?.severity, ''),
        }))
      : [],
  }));
}

export function resolveClienteId(
  punto: { cliente?: unknown; clientId?: unknown } | null | undefined
): string | undefined {
  const c = punto?.cliente;
  if (c != null && typeof c === 'object') {
    const id = (c as Record<string, unknown>).id ?? (c as Record<string, unknown>)._id;
    if (id != null && id !== '') return String(id);
  }
  if (punto?.clientId != null && punto.clientId !== '') return String(punto.clientId);
  if (typeof c === 'string' || typeof c === 'number') return String(c);
  return undefined;
}

/** Strip V1 /metrics row to scalar ranges only (safe for TuyaOsmosisMetricsSection). */
export function normalizeV1ClientMetrics(row: unknown): {
  tds_range: number;
  production_volume_range: number;
  rejected_volume_range: number;
  filter_only_online: boolean;
} | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const num = (v: unknown) => {
    const scalar = toDisplayScalar(v, 0);
    const n = Number(scalar);
    return Number.isFinite(n) ? n : 0;
  };
  return {
    tds_range: num(r.tds_range),
    production_volume_range: num(r.production_volume_range),
    rejected_volume_range: num(r.rejected_volume_range),
    filter_only_online: r.filter_only_online !== false,
  };
}

export function toDisplayScalar(value: unknown, fallback: string | number = 'N/A'): string | number {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'string') return value;
  const nested = safeDisplayText(value, '');
  if (nested) {
    const n = Number(nested);
    return Number.isNaN(n) ? nested : n;
  }
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

export function toMetricRange(value: unknown): number | 'N/A' {
  const scalar = toDisplayScalar(value, 'N/A');
  if (scalar === 'N/A') return 'N/A';
  const n = Number(scalar);
  return Number.isNaN(n) ? 'N/A' : n;
}

export function toFlowNumber(value: unknown): number | null {
  const scalar = toDisplayScalar(value, 'N/A');
  if (scalar === 'N/A') return null;
  const n = Number(scalar);
  return Number.isFinite(n) ? n : null;
}

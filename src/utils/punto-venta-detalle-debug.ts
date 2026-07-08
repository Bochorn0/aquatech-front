/** Tuya detalle debug logs — filter production console by `[PVDetalle]`. */

const LOG_PREFIX = '[PVDetalle]';

/** Describe a value for logs without dumping huge payloads. */
export function describeValue(value: unknown): {
  type: string;
  isPlainObject: boolean;
  preview: string;
} {
  if (value === null) return { type: 'null', isPlainObject: false, preview: 'null' };
  if (value === undefined) return { type: 'undefined', isPlainObject: false, preview: 'undefined' };
  const type = Array.isArray(value) ? 'array' : typeof value;
  const isPlainObject = type === 'object' && !Array.isArray(value);
  if (type === 'string' || type === 'number' || type === 'boolean') {
    const s = String(value);
    return { type, isPlainObject: false, preview: s.length > 80 ? `${s.slice(0, 80)}…` : s };
  }
  if (isPlainObject) {
    const keys = Object.keys(value as object).slice(0, 8);
    return { type: 'object', isPlainObject: true, preview: `{${keys.join(', ')}}` };
  }
  if (type === 'array') {
    return { type: 'array', isPlainObject: false, preview: `[${(value as unknown[]).length} items]` };
  }
  return { type, isPlainObject: false, preview: String(value) };
}

export function pvDetalleLog(event: string, payload?: Record<string, unknown>): void {
  if (payload) {
    console.info(`${LOG_PREFIX} ${event}`, payload);
  } else {
    console.info(`${LOG_PREFIX} ${event}`);
  }
}

/** Warn when a field is a plain object (common cause of React #130 if rendered in JSX). */
export function pvDetalleWarnObjectField(
  context: string,
  field: string,
  value: unknown
): void {
  const d = describeValue(value);
  if (d.isPlainObject) {
    console.warn(`${LOG_PREFIX} object field (${context}.${field})`, d);
  }
}

export function logV1MetricsRow(context: string, row: unknown): void {
  if (!row || typeof row !== 'object') {
    pvDetalleLog(`${context}: no V1 metrics row for cliente`);
    return;
  }
  const r = row as Record<string, unknown>;
  const fields = ['cliente', 'client_id', 'tds_range', 'production_volume_range', 'rejected_volume_range', 'filter_only_online'];
  const snapshot: Record<string, ReturnType<typeof describeValue>> = {};
  fields.forEach((f) => {
    snapshot[f] = describeValue(r[f]);
    pvDetalleWarnObjectField(context, f, r[f]);
  });
  pvDetalleLog(`${context}: V1 /metrics row`, snapshot);
}

export function logMetricsConfigRules(context: string, metricsConfig: unknown): void {
  if (!Array.isArray(metricsConfig)) {
    pvDetalleLog(`${context}: metricsConfig not an array`);
    return;
  }
  metricsConfig.forEach((metric, mi) => {
    const rules = metric?.rules;
    if (!Array.isArray(rules)) return;
    rules.forEach((rule: unknown, ri: number) => {
      if (!rule || typeof rule !== 'object') return;
      const r = rule as Record<string, unknown>;
      pvDetalleWarnObjectField(`${context} rule[${mi}][${ri}]`, 'label', r.label);
      pvDetalleWarnObjectField(`${context} rule[${mi}][${ri}]`, 'message', r.message);
    });
  });
  pvDetalleLog(`${context}: metricsConfig loaded`, {
    count: metricsConfig.length,
    metricTypes: metricsConfig.map((m: any) => m?.metric_type ?? m?.sensor_type ?? m?.metric_name ?? '?'),
  });
}

export function logTuyaProductStatus(context: string, products: unknown[]): void {
  products.forEach((p, i) => {
    if (!p || typeof p !== 'object') return;
    const prod = p as Record<string, unknown>;
    pvDetalleWarnObjectField(`${context} product[${i}]`, 'name', prod.name);
    const {status} = prod;
    if (!Array.isArray(status)) return;
    status.forEach((s: unknown, si: number) => {
      if (!s || typeof s !== 'object') return;
      const st = s as Record<string, unknown>;
      pvDetalleWarnObjectField(`${context} product[${i}].status[${si}]`, 'value', st.value);
      pvDetalleWarnObjectField(`${context} product[${i}].status[${si}]`, 'label', st.label);
    });
  });
}

/** Log which Tuya-only UI blocks will mount (helps spot unhandled empty/missing-data scenarios). */
export function logTuyaUiScenario(puntoId: string, scenario: {
  source_type: string;
  clienteId?: string;
  tuyaMetrics: unknown;
  chartsLoading: boolean;
  counts: {
    osmosisSystems: number;
    osmosisFromSystems: number;
    tuyaOsmosis: number;
    tuyaNiveles: number;
    tuyaPresion: number;
  };
  branches: {
    mqttCards: boolean;
    tuyaSection: boolean;
    presionOsmosis: boolean;
    exportReports: boolean;
    tuyaNivelSection: boolean;
    tuyaOsmosisMetricsStandalone: boolean;
    tuyaHistorico: boolean;
  };
}): void {
  pvDetalleLog(`Tuya UI scenario (punto ${puntoId})`, {
    source_type: scenario.source_type,
    clienteId: scenario.clienteId ?? 'missing',
    tuyaMetrics: scenario.tuyaMetrics ?? null,
    chartsLoading: scenario.chartsLoading,
    ...scenario.counts,
    ...scenario.branches,
  });

  if (scenario.branches.tuyaSection && !scenario.counts.tuyaOsmosis && !scenario.counts.tuyaNiveles) {
    console.warn(`${LOG_PREFIX} Tuya section visible but no Osmosis/Nivel products in productos[]`);
  }
  if (scenario.branches.tuyaOsmosisMetricsStandalone && scenario.tuyaMetrics == null) {
    console.warn(`${LOG_PREFIX} TuyaOsmosisMetricsSection will render with metrics=null (no V1 client metrics?)`);
  }
  if (scenario.branches.tuyaNivelSection && scenario.tuyaMetrics == null) {
    console.warn(`${LOG_PREFIX} TuyaNivelSection will render with metrics=null (no V1 client metrics?)`);
  }
}

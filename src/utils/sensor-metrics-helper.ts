/**
 * Sensor metrics helper for Dashboard V2.
 * Handles 3 levels: normal, preventivo, correctivo.
 * Multiple rules per level (e.g. TDS preventivo: < 30 and > 70) are summed.
 * Sensors without any metric defined are considered normal.
 */

export type MetricLevel = 'normal' | 'preventivo' | 'correctivo';

export type MetricRuleWithLevel = {
  min: number | null;
  max: number | null;
  color: string;
  label: string;
  /** Level for this rule; inferred from label if not set (e.g. "preventivo" in label) */
  level?: MetricLevel;
  /** Custom alert message shown in dashboard when this rule matches (optional). */
  message?: string;
};

export type MetricConfig = {
  id: string | number;
  metric_name?: string;
  sensor_type?: string;
  sensor_unit?: string;
  rules?: MetricRuleWithLevel[];
};

export type SensorRecord = {
  id: string | number;
  puntoVentaId: string | number;
  puntoVentaName: string;
  clientName: string;
  sensorName: string;
  sensorType: string;
  value: number | null;
  unit?: string;
  online: boolean;
  /** Timestamp of latest reading */
  timestamp?: string | null;
};

export type SensorWithLevel = SensorRecord & {
  /** Per-metric level: metric id -> level */
  levelByMetric: Record<string, MetricLevel>;
  /** Global "worst" level across all metrics for this sensor (correctivo > preventivo > normal) */
  worstLevel: MetricLevel;
};

const LEVEL_ORDER: Record<MetricLevel, number> = {
  correctivo: 3,
  preventivo: 2,
  normal: 1,
};

function parseLevelFromLabel(label: string): MetricLevel {
  const lower = label.toLowerCase();
  if (lower.includes('correctivo') || lower.includes('critico') || lower.includes('crítico')) return 'correctivo';
  if (lower.includes('preventivo') || lower.includes('warning') || lower.includes('advertencia')) return 'preventivo';
  return 'normal';
}

function getRuleLevel(rule: MetricRuleWithLevel): MetricLevel {
  if (rule.level) return rule.level;
  return parseLevelFromLabel(rule.label);
}

/**
 * Check if a numeric value matches a rule (min/max inclusive where applicable).
 * Rule: min === null means no lower bound; max === null means no upper bound.
 * So "< 30" => max: 30 (value <= 30); "> 70" => min: 70 (value >= 70).
 */
export function valueMatchesRule(value: number | null, rule: MetricRuleWithLevel): boolean {
  if (value === null || typeof value !== 'number' || Number.isNaN(value)) return false;
  const { min, max } = rule;
  if (min !== null && value < min) return false;
  if (max !== null && value > max) return false;
  return true;
}

/**
 * For a sensor value and a metric's rules, return the level (worst matching rule).
 * If no rule matches, returns 'normal'.
 */
export function getLevelForValue(value: number | null, rules: MetricRuleWithLevel[] | undefined): MetricLevel {
  if (!rules || rules.length === 0) return 'normal';
  const worst = rules.reduce<MetricLevel>((acc, rule) => {
    if (!valueMatchesRule(value, rule)) return acc;
    const ruleLevel = getRuleLevel(rule);
    return LEVEL_ORDER[ruleLevel] > LEVEL_ORDER[acc] ? ruleLevel : acc;
  }, 'normal');
  return worst;
}

/**
 * Classify all sensors with levels per metric and worst level.
 */
export function classifySensorsWithLevels(
  sensors: SensorRecord[],
  metrics: MetricConfig[]
): SensorWithLevel[] {
  const metricMap = new Map<string, MetricConfig>();
  metrics.forEach((m) => metricMap.set(String(m.id), m));

  return sensors.map((sensor) => {
    const levelByMetric: Record<string, MetricLevel> = {};
    const worstLevel = metrics.reduce<MetricLevel>((acc, metric) => {
      const metricId = String(metric.id);
      const matchesSensor =
        (metric.sensor_type && sensor.sensorType && metric.sensor_type.toLowerCase() === sensor.sensorType.toLowerCase()) ||
        (metric.sensor_type && sensor.sensorName && sensor.sensorName.toLowerCase().includes(metric.sensor_type.toLowerCase()));
      const level = matchesSensor
        ? getLevelForValue(sensor.value, metric.rules)
        : 'normal';
      levelByMetric[metricId] = level;
      return LEVEL_ORDER[level] > LEVEL_ORDER[acc] ? level : acc;
    }, 'normal' as MetricLevel);

    return {
      ...sensor,
      levelByMetric,
      worstLevel,
    };
  });
}

export type DashboardMetricSeriesItem = {
  label: string;
  color: string;
  value: number;
  level: MetricLevel;
  sensors: SensorWithLevel[];
};

export type DashboardMetricChart = {
  metricId: string;
  title: string;
  unit?: string;
  series: DashboardMetricSeriesItem[];
};

/**
 * Build pie chart data per metric: normal, preventivo, correctivo (multiple rules per level are summed).
 * Each sensor appears in exactly one bucket per metric (no overlap).
 */
export function buildMetricCharts(
  sensorsWithLevels: SensorWithLevel[],
  metrics: MetricConfig[]
): DashboardMetricChart[] {
  return metrics.map((metric) => {
    const metricId = String(metric.id);
    const byLevel: Record<MetricLevel, SensorWithLevel[]> = {
      normal: [],
      preventivo: [],
      correctivo: [],
    };
    sensorsWithLevels.forEach((s) => {
      const level = s.levelByMetric[metricId] ?? 'normal';
      byLevel[level].push(s);
    });
    const series: DashboardMetricSeriesItem[] = [
      {
        label: 'Normal',
        color: '#22C55E',
        value: byLevel.normal.length,
        level: 'normal' as MetricLevel,
        sensors: byLevel.normal,
      },
      {
        label: 'Preventivo',
        color: '#FFAB00',
        value: byLevel.preventivo.length,
        level: 'preventivo' as MetricLevel,
        sensors: byLevel.preventivo,
      },
      {
        label: 'Correctivo',
        color: '#FF5630',
        value: byLevel.correctivo.length,
        level: 'correctivo' as MetricLevel,
        sensors: byLevel.correctivo,
      },
    ].filter((s) => s.value > 0);
    return {
      metricId,
      title: metric.metric_name || metric.sensor_type || `Metric ${metricId}`,
      unit: metric.sensor_unit,
      series,
    };
  });
}

export type OnlineOfflineChart = {
  title: string;
  series: { label: string; color: string; value: number; sensors: SensorWithLevel[] }[];
};

/**
 * Build online/offline pie chart.
 */
export function buildOnlineOfflineChart(sensorsWithLevels: SensorWithLevel[]): OnlineOfflineChart {
  const online = sensorsWithLevels.filter((s) => s.online);
  const offline = sensorsWithLevels.filter((s) => !s.online);
  return {
    title: 'Sensores',
    series: [
      { label: 'Sensores online', color: '#1877F2', value: online.length, sensors: online },
      { label: 'Sensores offline', color: '#FF5630', value: offline.length, sensors: offline },
    ],
  };
}

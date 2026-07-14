import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Box,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

import Swal from 'sweetalert2';

import { get, put, post } from 'src/api/axiosHelper';
import { SvgColor } from 'src/components/svg-color';

/** Above MUI Dialog (~1300); default SweetAlert z-index sits behind and looks broken. */
const rulesSwal = Swal.mixin({
  customClass: { container: 'swal-rules-on-top' },
  didOpen: () => {
    const el = document.querySelector('.swal2-container') as HTMLElement | null;
    if (el) el.style.zIndex = '20000';
  },
});

export type TuyaFieldConfig = {
  enabled: boolean;
  db_column: string | null;
  scale: number;
};

export type TuyaCustomRule = {
  id: string;
  name: string;
  enabled: boolean;
  op: 'subtract' | 'add' | 'multiply' | 'divide';
  left: { source: 'current' | 'previous_hour'; code: string };
  right: { source: 'current' | 'previous_hour'; code: string };
  scale: number;
  store_as: string;
  db_column: string | null;
};

export type TuyaProductLogsConfig = {
  enabled_fields: Record<string, TuyaFieldConfig>;
  custom_rules: TuyaCustomRule[];
};

type ConfigApiResponse = {
  success?: boolean;
  product_id?: string;
  product_type?: string;
  is_custom?: boolean;
  config: TuyaProductLogsConfig;
};

const OSMOSIS_CODES = [
  { code: 'flowrate_total_1', label: 'flowrate_total_1 (volumen producción)', defaultColumn: 'production_volume', defaultScale: 0.1 },
  { code: 'flowrate_total_2', label: 'flowrate_total_2 (volumen rechazo)', defaultColumn: 'rejected_volume', defaultScale: 0.1 },
  { code: 'flowrate_speed_1', label: 'flowrate_speed_1 (flujo producción)', defaultColumn: 'flujo_produccion', defaultScale: 1 },
  { code: 'flowrate_speed_2', label: 'flowrate_speed_2 (flujo rechazo)', defaultColumn: 'flujo_rechazo', defaultScale: 1 },
  { code: 'tds_out', label: 'tds_out (TDS salida)', defaultColumn: 'tds', defaultScale: 1 },
] as const;

const NIVEL_CODES = [
  { code: 'liquid_depth', label: 'liquid_depth', defaultColumn: 'flujo_produccion', defaultScale: 1 },
  { code: 'liquid_level_percent', label: 'liquid_level_percent', defaultColumn: 'flujo_rechazo', defaultScale: 1 },
] as const;

const DB_COLUMNS = [
  'campo_personalizado_1',
  'campo_personalizado_2',
] as const;

const MAX_CUSTOM_RULES = 2;

const OPS = [
  { value: 'subtract', label: 'restar (A − B)' },
  { value: 'add', label: 'sumar (A + B)' },
  { value: 'multiply', label: 'multiplicar (A × B)' },
  { value: 'divide', label: 'dividir (A ÷ B)' },
] as const;

function newRuleId() {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type Props = {
  productId: string;
  productName?: string;
  productType?: string;
  disabled?: boolean;
  onSaved?: (config: TuyaProductLogsConfig) => void;
};

export function TuyaLogsRoutineRulesPanel({
  productId,
  productName,
  productType = 'Osmosis',
  disabled = false,
  onSaved,
}: Props) {
  const [config, setConfig] = useState<TuyaProductLogsConfig>({
    enabled_fields: {},
    custom_rules: [],
  });
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [resolvedType, setResolvedType] = useState(productType);

  const codeOptions = useMemo(
    () => (resolvedType === 'Nivel' ? NIVEL_CODES : OSMOSIS_CODES),
    [resolvedType]
  );

  const fetchConfig = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await get<ConfigApiResponse>(
        `/products/${encodeURIComponent(productId)}/logs-routine-config`
      );
      setConfig(res?.config || { enabled_fields: {}, custom_rules: [] });
      setIsCustom(Boolean(res?.is_custom));
      if (res?.product_type) setResolvedType(res.product_type);
    } catch (error) {
      console.error('Error loading product logs routine config:', error);
      rulesSwal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la configuración del producto.' });
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleToggleField = (code: string, enabled: boolean) => {
    const meta = codeOptions.find((c) => c.code === code);
    const prevField = config.enabled_fields[code] || {
      enabled: false,
      db_column: meta?.defaultColumn ?? null,
      scale: meta?.defaultScale ?? 1,
    };
    setConfig({
      ...config,
      enabled_fields: {
        ...config.enabled_fields,
        [code]: { ...prevField, enabled },
      },
    });
  };

  const handleAddRule = () => {
    const rules = config.custom_rules || [];
    if (rules.length >= MAX_CUSTOM_RULES) {
      rulesSwal.fire({
        icon: 'info',
        title: 'Límite alcanzado',
        text: 'Solo se permiten 2 campos personalizados (campo_personalizado_1 y campo_personalizado_2).',
      });
      return;
    }
    const used = new Set(rules.map((r) => r.db_column).filter(Boolean));
    const nextSlot =
      DB_COLUMNS.find((col) => !used.has(col)) || DB_COLUMNS[rules.length] || 'campo_personalizado_1';
    const defaultCode = codeOptions[0]?.code || 'flowrate_total_1';
    const rule: TuyaCustomRule = {
      id: newRuleId(),
      name: rules.length === 0 ? 'produccion_desde_ultima_hora' : `campo_custom_${rules.length + 1}`,
      enabled: true,
      op: 'subtract',
      left: { source: 'current', code: defaultCode },
      right: { source: 'previous_hour', code: defaultCode },
      scale: 1,
      store_as: rules.length === 0 ? 'produccion_desde_ultima_hora' : `campo_custom_${rules.length + 1}`,
      db_column: nextSlot,
    };
    setConfig({
      ...config,
      custom_rules: [...rules, rule],
    });
  };

  const handleUpdateRule = (id: string, patch: Partial<TuyaCustomRule>) => {
    setConfig({
      ...config,
      custom_rules: (config.custom_rules || []).map((r) =>
        r.id === id
          ? {
              ...r,
              ...patch,
              left: patch.left ? { ...r.left, ...patch.left } : r.left,
              right: patch.right ? { ...r.right, ...patch.right } : r.right,
              store_as: patch.store_as ?? patch.name ?? r.store_as,
            }
          : r
      ),
    });
  };

  const handleRemoveRule = (id: string) => {
    setConfig({
      ...config,
      custom_rules: (config.custom_rules || []).filter((r) => r.id !== id),
    });
  };

  const handleSave = async () => {
    if (!productId) return;
    const rules = config.custom_rules || [];
    if (rules.length > MAX_CUSTOM_RULES) {
      rulesSwal.fire({
        icon: 'warning',
        title: 'Demasiadas reglas',
        text: 'Máximo 2 campos personalizados.',
      });
      return;
    }
    const slots = rules.map((r) => r.db_column).filter(Boolean);
    if (new Set(slots).size !== slots.length) {
      rulesSwal.fire({
        icon: 'warning',
        title: 'Columnas duplicadas',
        text: 'Cada regla debe usar un campo distinto (campo_personalizado_1 o _2).',
      });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...config,
        custom_rules: rules.slice(0, MAX_CUSTOM_RULES),
      };
      const res = await put<ConfigApiResponse>(
        `/products/${encodeURIComponent(productId)}/logs-routine-config`,
        { config: payload }
      );
      setConfig(res?.config || payload);
      setIsCustom(true);
      onSaved?.(res?.config || payload);
      rulesSwal.fire({
        icon: 'success',
        title: 'Guardado',
        text: `Reglas actualizadas para ${productName || productId}.`,
      });
    } catch (error) {
      console.error('Error saving product logs routine config:', error);
      rulesSwal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar la configuración.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRunRoutine = async () => {
    if (!productId) return;
    const ok = await rulesSwal.fire({
      icon: 'question',
      title: '¿Probar rutina ahora?',
      html: `Ejecuta la misma lógica del cron para <strong>${productName || productId}</strong> (última 1h de Tuya + reglas → <code>campo_personalizado_1/2</code>). Consume cuota Tuya.`,
      showCancelButton: true,
      confirmButtonText: 'Ejecutar',
      cancelButtonText: 'Cancelar',
    });
    if (!ok.isConfirmed) return;

    setRunning(true);
    try {
      const res = await post<{
        success?: boolean;
        message?: string;
        routine_result?: {
          logsInserted?: number;
          logsSkippedDuplicates?: number;
          logsToSave?: number;
          logsGrouped?: number;
          totalLogsFromTuya?: number;
          codesFetched?: number;
          previous_hour_hits?: number;
          previous_hour_misses?: number;
        };
        recent_logs?: Array<{
          date?: string;
          production_volume?: number;
          campo_personalizado_1?: number | null;
          campo_personalizado_2?: number | null;
          custom_metrics?: Record<string, number>;
        }>;
        error?: { error?: string } | null;
        config_used?: { enabled_codes?: string[]; custom_rules?: unknown[] };
      }>(`/products/${encodeURIComponent(productId)}/run-logs-routine`, {});

      const inserted = res?.routine_result?.logsInserted ?? 0;
      const fromTuya = res?.routine_result?.totalLogsFromTuya ?? 0;
      const skipped = res?.routine_result?.logsSkippedDuplicates ?? 0;
      const toSave = res?.routine_result?.logsToSave ?? 0;
      const prevHits = res?.routine_result?.previous_hour_hits ?? 0;
      const prevMisses = res?.routine_result?.previous_hour_misses ?? 0;
      const sample = (res?.recent_logs || [])
        .slice(0, 3)
        .map(
          (l) =>
            `${l.date ? new Date(l.date).toLocaleString('es-MX') : '?'} · prod=${l.production_volume ?? '-'} · c1=${l.campo_personalizado_1 ?? '-'} · c2=${l.campo_personalizado_2 ?? '-'}`
        )
        .join('<br/>');

      await rulesSwal.fire({
        icon: res?.success ? 'success' : 'warning',
        title: res?.success ? 'Rutina ejecutada' : 'Rutina con problemas',
        html: `${res?.message || ''}<br/><br/>
          Insertados: <strong>${inserted}</strong> · Omitidos (mismo timestamp): <strong>${skipped}</strong><br/>
          Logs Tuya: <strong>${fromTuya}</strong> · Filas a guardar: <strong>${toSave}</strong><br/>
          previous_hour: hits <strong>${prevHits}</strong> · misses <strong>${prevMisses}</strong>
          ${prevMisses > 0 ? '<br/><em>Sin registro usable ≥1h antes (o solo filas con volumen 0): esa regla se omite en esos timestamps (ya no se usa 0 → evita deltas ≈ ±contador total).</em>' : ''}<br/>
          Códigos: ${(res?.config_used?.enabled_codes || []).join(', ') || '-'}<br/>
          Reglas: ${res?.config_used?.custom_rules?.length ?? 0}<br/><br/>
          <strong>Últimos logs</strong><br/>${sample || '(sin muestra)'}`,
        width: 560,
      });
    } catch (error) {
      console.error('Error running logs routine for product:', error);
      rulesSwal.fire({ icon: 'error', title: 'Error', text: 'No se pudo ejecutar la rutina de prueba.' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Configuración de <strong>{productName || productId}</strong> ({resolvedType}).
        {isCustom ? ' Usa reglas personalizadas.' : ' Usando valores por defecto del tipo (aún no personalizado).'}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mb: 2, flexWrap: 'wrap' }}>
        <Button variant="outlined" onClick={fetchConfig} disabled={loading || saving || running || disabled}>
          Recargar
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleRunRoutine}
          disabled={loading || saving || running || disabled}
        >
          {running ? 'Ejecutando…' : 'Probar rutina ahora'}
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={loading || saving || running || disabled}>
          {saving ? 'Guardando…' : 'Guardar reglas'}
        </Button>
      </Box>

      <Typography variant="subtitle1" gutterBottom>
        Campos a obtener de Tuya
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Cada campo activo se consulta en la rutina (consume cuota Tuya).
      </Typography>
      {codeOptions.map(({ code, label }) => {
        const enabled = Boolean(config.enabled_fields[code]?.enabled);
        return (
          <Box
            key={code}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 0.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2">{label}</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={enabled}
                  onChange={(e) => handleToggleField(code, e.target.checked)}
                  disabled={loading || disabled}
                  color="primary"
                />
              }
              label={enabled ? 'Activo' : 'Inactivo'}
            />
          </Box>
        );
      })}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3, mb: 1 }}>
        <Box>
          <Typography variant="subtitle1">Reglas personalizadas (máx. 2)</Typography>
          <Typography variant="body2" color="text.secondary">
            Se guardan en <code>campo_personalizado_1</code> / <code>campo_personalizado_2</code>.
            Ej: producción última hora = total actual − total hace 1h
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={handleAddRule}
          disabled={loading || disabled || (config.custom_rules || []).length >= MAX_CUSTOM_RULES}
        >
          Agregar regla
        </Button>
      </Box>

      {(config.custom_rules || []).length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Sin reglas derivadas para este producto.
        </Typography>
      )}

      {(config.custom_rules || []).slice(0, MAX_CUSTOM_RULES).map((rule, idx) => (
        <Box key={rule.id} sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2">Regla {idx + 1}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={rule.enabled !== false}
                    onChange={(e) => handleUpdateRule(rule.id, { enabled: e.target.checked })}
                    disabled={loading || disabled}
                  />
                }
                label="Activa"
              />
              <IconButton
                onClick={() => handleRemoveRule(rule.id)}
                disabled={loading || disabled}
                title="Eliminar regla"
                sx={{ color: 'error.main' }}
              >
                <SvgColor src="./assets/icons/actions/delete.svg" />
              </IconButton>
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Nombre descriptivo"
                value={rule.name}
                onChange={(e) =>
                  handleUpdateRule(rule.id, {
                    name: e.target.value,
                    store_as: e.target.value,
                  })
                }
                disabled={loading || disabled}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Guardar en</InputLabel>
                <Select
                  label="Guardar en"
                  value={rule.db_column || DB_COLUMNS[idx]}
                  onChange={(e) =>
                    handleUpdateRule(rule.id, {
                      db_column: e.target.value || DB_COLUMNS[idx],
                    })
                  }
                  disabled={loading || disabled}
                >
                  {DB_COLUMNS.map((col) => (
                    <MenuItem key={col} value={col}>
                      {col}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Operación</InputLabel>
                <Select
                  label="Operación"
                  value={rule.op}
                  onChange={(e) =>
                    handleUpdateRule(rule.id, { op: e.target.value as TuyaCustomRule['op'] })
                  }
                  disabled={loading || disabled}
                >
                  {OPS.map((op) => (
                    <MenuItem key={op.value} value={op.value}>
                      {op.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 0.5 }} />
              <Typography variant="caption" color="text.secondary">
                Operando A
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Fuente A</InputLabel>
                <Select
                  label="Fuente A"
                  value={rule.left.source}
                  onChange={(e) =>
                    handleUpdateRule(rule.id, {
                      left: {
                        ...rule.left,
                        source: e.target.value as 'current' | 'previous_hour',
                      },
                    })
                  }
                  disabled={loading || disabled}
                >
                  <MenuItem value="current">Valor actual (este log)</MenuItem>
                  <MenuItem value="previous_hour">Valor de hace ~1 hora (BD)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Código A</InputLabel>
                <Select
                  label="Código A"
                  value={rule.left.code}
                  onChange={(e) =>
                    handleUpdateRule(rule.id, {
                      left: { ...rule.left, code: e.target.value },
                    })
                  }
                  disabled={loading || disabled}
                >
                  {codeOptions.map((c) => (
                    <MenuItem key={c.code} value={c.code}>
                      {c.code}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Operando B
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Fuente B</InputLabel>
                <Select
                  label="Fuente B"
                  value={rule.right.source}
                  onChange={(e) =>
                    handleUpdateRule(rule.id, {
                      right: {
                        ...rule.right,
                        source: e.target.value as 'current' | 'previous_hour',
                      },
                    })
                  }
                  disabled={loading || disabled}
                >
                  <MenuItem value="current">Valor actual (este log)</MenuItem>
                  <MenuItem value="previous_hour">Valor de hace ~1 hora (BD)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Código B</InputLabel>
                <Select
                  label="Código B"
                  value={rule.right.code}
                  onChange={(e) =>
                    handleUpdateRule(rule.id, {
                      right: { ...rule.right, code: e.target.value },
                    })
                  }
                  disabled={loading || disabled}
                >
                  {codeOptions.map((c) => (
                    <MenuItem key={c.code} value={c.code}>
                      {c.code}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      ))}
    </Box>
  );
}

export default TuyaLogsRoutineRulesPanel;

import dayjs from 'dayjs';

export type HistoricoViewMode = 'raw' | 'hour' | 'day' | 'first_last';

export type HistoricoTableRowModel = {
  key: string;
  periodLabel: string;
  samples: number;
  tdsSummary: string;
  productionSummary: string;
  rejectionSummary: string;
  detail?: string;
};

export type HistoricoViewInputLog = {
  _id?: string;
  date: string | Date;
  tds?: number | null;
  production_volume?: number | null;
  rejected_volume?: number | null;
  source?: string;
};

function ts(d: string | Date): number {
  return new Date(d).getTime();
}

function sortAsc(rows: HistoricoViewInputLog[]): HistoricoViewInputLog[] {
  return [...rows].sort((a, b) => ts(a.date) - ts(b.date));
}

function volumeDelta(rows: HistoricoViewInputLog[]): {
  prod: number | null;
  rej: number | null;
} {
  const s = sortAsc(rows);
  const first = s[0];
  const last = s[s.length - 1];
  if (!first || !last) return { prod: null, rej: null };
  const pv0 = first.production_volume;
  const pv1 = last.production_volume;
  const rv0 = first.rejected_volume;
  const rv1 = last.rejected_volume;
  const prod = pv0 != null && pv1 != null ? Number(pv1) - Number(pv0) : null;
  const rej = rv0 != null && rv1 != null ? Number(rv1) - Number(rv0) : null;
  return { prod, rej };
}

function tdsStats(rows: HistoricoViewInputLog[]): {
  min: number | null;
  max: number | null;
  avg: number | null;
  first: number | null;
  last: number | null;
} {
  const s = sortAsc(rows);
  const vals = s
    .map((r) => r.tds)
    .filter((v): v is number => v != null && !Number.isNaN(Number(v)))
    .map(Number);
  const first = s[0]?.tds != null ? Number(s[0].tds) : null;
  const last = s[s.length - 1]?.tds != null ? Number(s[s.length - 1].tds) : null;
  if (vals.length === 0) return { min: null, max: null, avg: null, first, last };
  const sum = vals.reduce((a, b) => a + b, 0);
  return {
    min: Math.min(...vals),
    max: Math.max(...vals),
    avg: sum / vals.length,
    first,
    last,
  };
}

function formatTdsAgg(st: ReturnType<typeof tdsStats>): string {
  const parts: string[] = [];
  if (st.first != null && st.last != null) {
    if (Math.abs(st.first - st.last) < 0.05) {
      parts.push(`${st.first.toFixed(1)} ppm`);
    } else {
      parts.push(`${st.first.toFixed(1)}→${st.last.toFixed(1)} ppm`);
    }
  }
  if (st.min != null && st.max != null && (st.min !== st.max || parts.length === 0)) {
    parts.push(`min–max ${st.min.toFixed(1)}/${st.max.toFixed(1)}`);
  } else if (st.avg != null && parts.length === 0) {
    parts.push(`prom. ${st.avg.toFixed(1)} ppm`);
  }
  return parts.length ? parts.join(' · ') : 'N/A';
}

/**
 * Construye filas para la tabla según la vista. Volúmenes agregados = Δ del contador acumulado
 * (última muestra − primera en el bucket), coherente con flowrate_total_* en product_logs.
 */
export function buildHistoricoTableRows(
  logs: HistoricoViewInputLog[],
  mode: HistoricoViewMode
): HistoricoTableRowModel[] {
  const base = logs.filter((l) => l != null);
  if (mode === 'raw') {
    return base.map((l, idx) => ({
      key: String(l._id ?? `${ts(l.date)}-${idx}`),
      periodLabel: new Date(l.date).toLocaleString(),
      samples: 1,
      tdsSummary: l.tds != null ? `${Number(l.tds).toFixed(2)} ppm` : 'N/A',
      productionSummary:
        l.production_volume != null ? `${Number(l.production_volume).toFixed(2)} L` : 'N/A',
      rejectionSummary:
        l.rejected_volume != null ? `${Number(l.rejected_volume).toFixed(2)} L` : 'N/A',
      detail: l.source ?? '',
    }));
  }

  if (mode === 'first_last') {
    const s = sortAsc(base);
    if (s.length === 0) return [];
    const st = tdsStats(s);
    const vd = volumeDelta(s);
    return [
      {
        key: 'first-last',
        periodLabel: 'Todo el rango (primera → última muestra)',
        samples: s.length,
        tdsSummary: formatTdsAgg(st),
        productionSummary:
          vd.prod != null ? `Δ ${vd.prod.toFixed(2)} L (acumulado)` : 'N/A',
        rejectionSummary: vd.rej != null ? `Δ ${vd.rej.toFixed(2)} L (acumulado)` : 'N/A',
        detail: 'Δ = último acum. − primero acum. en las filas cargadas',
      },
    ];
  }

  const bucketMode = mode === 'hour' ? 'hour' : 'day';
  const buckets = base.reduce((acc, l) => {
    const d = dayjs(l.date);
    const key =
      bucketMode === 'hour' ? `${d.format('YYYY-MM-DD HH')}:00` : d.format('YYYY-MM-DD');
    const arr = acc.get(key) ?? [];
    arr.push(l);
    acc.set(key, arr);
    return acc;
  }, new Map<string, HistoricoViewInputLog[]>());

  const keys = [...buckets.keys()].sort((a, b) => (a < b ? 1 : -1));

  return keys.map((k) => {
    const rows = buckets.get(k)!;
    const st = tdsStats(rows);
    const vd = volumeDelta(rows);
    return {
      key: k,
      periodLabel:
        bucketMode === 'hour'
          ? `${k} — hora local`
          : `${k} — día local`,
      samples: rows.length,
      tdsSummary: formatTdsAgg(st),
      productionSummary: vd.prod != null ? `Δ ${vd.prod.toFixed(2)} L` : 'N/A',
      rejectionSummary: vd.rej != null ? `Δ ${vd.rej.toFixed(2)} L` : 'N/A',
      detail: `${rows.length} muestras`,
    };
  });
}

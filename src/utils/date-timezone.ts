/**
 * Format timestamps for display in app timezone (America/Hermosillo).
 * Ensures UTC timestamps from API are shown in local time.
 */
import { APP_TIMEZONE } from '../config-global';

/**
 * Format a timestamp for chart/time display in Hermosillo timezone.
 * Handles ISO strings (with/without Z), Unix seconds, and Date objects.
 */
export function formatTimestampLocal(
  timestamp: string | number | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
): string {
  if (timestamp == null) return '';
  const date = parseTimestamp(timestamp);
  if (!date || isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es-MX', { ...options, timeZone: APP_TIMEZONE });
}

/**
 * Format timestamp for date+time display.
 */
export function formatDateTimeLocal(
  timestamp: string | number | Date | null | undefined
): string {
  if (timestamp == null) return '';
  const date = parseTimestamp(timestamp);
  if (!date || isNaN(date.getTime())) return '';
  return date.toLocaleString('es-MX', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Parse timestamp to Date. Ensures UTC timestamps (ISO with Z) are parsed correctly.
 * If no timezone in string, assumes UTC (API sends UTC).
 * Exported for use in charts.
 */
export function parseTimestampAsUTC(ts: string | number | Date | null | undefined): Date {
  const d = parseTimestamp(ts);
  return d || new Date(0);
}

function parseTimestamp(ts: string | number | Date | null | undefined): Date | null {
  if (ts instanceof Date) return ts;
  if (typeof ts === 'number') {
    return ts > 1e12 ? new Date(ts) : new Date(ts * 1000);
  }
  const str = String(ts).trim();
  if (!str) return null;
  // Ensure ISO strings without Z are treated as UTC (API timestamps)
  const normalized = str.endsWith('Z') || str.includes('+') || /-\d{2}:\d{2}$/.test(str)
    ? str
    : str + 'Z';
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

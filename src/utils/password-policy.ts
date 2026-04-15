/**
 * Keep in sync with Aquatech_api `password-policy.js`:
 * min/max length, optional uppercase + digit (A-Z, 0-9).
 * VITE_PASSWORD_REQUIRE_UPPERCASE / VITE_PASSWORD_REQUIRE_DIGIT: set "false" to disable.
 */

const n = (v: string | undefined, fallback: number) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : fallback;
};

const envFlag = (v: string | undefined, defaultTrue: boolean) => {
  if (v === undefined || v === '') return defaultTrue;
  return !['false', '0', 'no'].includes(String(v).toLowerCase());
};

export const PASSWORD_MIN_LENGTH = n(import.meta.env.VITE_PASSWORD_MIN_LENGTH, 8);
export const PASSWORD_MAX_LENGTH = n(import.meta.env.VITE_PASSWORD_MAX_LENGTH, 128);
export const PASSWORD_REQUIRE_UPPERCASE = envFlag(import.meta.env.VITE_PASSWORD_REQUIRE_UPPERCASE, true);
export const PASSWORD_REQUIRE_DIGIT = envFlag(import.meta.env.VITE_PASSWORD_REQUIRE_DIGIT, true);

/** Short hint for form helperText (same rules as validation). */
export function getPasswordRulesHint(): string {
  const parts = [`Mín. ${PASSWORD_MIN_LENGTH} caracteres`];
  if (PASSWORD_REQUIRE_UPPERCASE) parts.push('1 mayúscula (A-Z)');
  if (PASSWORD_REQUIRE_DIGIT) parts.push('1 número (0-9)');
  return parts.join(', ');
}

export function validatePasswordClient(plain: string): { ok: true } | { ok: false; message: string } {
  if (!plain || typeof plain !== 'string') {
    return { ok: false, message: 'La contraseña es requerida' };
  }
  if (plain.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
    };
  }
  if (plain.length > PASSWORD_MAX_LENGTH) {
    return {
      ok: false,
      message: `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres`,
    };
  }
  if (PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(plain)) {
    return {
      ok: false,
      message: 'La contraseña debe incluir al menos una letra mayúscula (A-Z)',
    };
  }
  if (PASSWORD_REQUIRE_DIGIT && !/[0-9]/.test(plain)) {
    return {
      ok: false,
      message: 'La contraseña debe incluir al menos un número (0-9)',
    };
  }
  return { ok: true };
}

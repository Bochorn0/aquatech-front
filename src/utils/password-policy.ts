/** Keep in sync with Aquatech_api `PASSWORD_MIN_LENGTH` / `PASSWORD_MAX_LENGTH` (defaults 8 / 128). */

const n = (v: string | undefined, fallback: number) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : fallback;
};

export const PASSWORD_MIN_LENGTH = n(import.meta.env.VITE_PASSWORD_MIN_LENGTH, 8);
export const PASSWORD_MAX_LENGTH = n(import.meta.env.VITE_PASSWORD_MAX_LENGTH, 128);

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
  return { ok: true };
}

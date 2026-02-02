
// ----------------------------------------------------------------------

/**
 * Obtiene los permisos del usuario actual desde localStorage
 * @returns Array de rutas permitidas o null si no hay usuario
 */
export function getUserPermissions(): string[] | null {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      console.log('[Permissions] No user found in localStorage');
      return null;
    }

    const user = JSON.parse(userStr);
    const {role} = user;

    // Debug: Log para verificar estructura
    console.log('[Permissions] User object:', user);
    console.log('[Permissions] Role object:', role);
    console.log('[Permissions] Role permissions:', role?.permissions);

    // Si el rol no existe, retornar null (sin restricciones)
    if (!role) {
      console.log('[Permissions] No role found, returning null (all access)');
      return null;
    }

    // Verificar si el campo permissions existe y tiene valores
    // Si permissions es undefined, null, o un array vacío, retornar null (sin restricciones)
    if (!role.permissions) {
      console.log('[Permissions] Role has no permissions field, returning null (all access)');
      return null;
    }

    if (!Array.isArray(role.permissions)) {
      console.log('[Permissions] Role permissions is not an array, returning null (all access)');
      return null;
    }

    if (role.permissions.length === 0) {
      console.log('[Permissions] Role permissions array is empty, returning null (all access)');
      return null;
    }

    // Si el rol tiene permisos definidos, retornarlos
    console.log('[Permissions] Returning permissions:', role.permissions);
    return role.permissions;
  } catch (error) {
    console.error('[Permissions] Error getting user permissions:', error);
    return null;
  }
}

/**
 * Obtiene la versión del dashboard asignada al rol del usuario (landing/home).
 * @returns 'v1' | 'v2' | 'both' | null si no hay usuario/rol; null se trata como 'v1' en la UI
 */
export function getDashboardVersion(): 'v1' | 'v2' | 'both' | null {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    const version = user?.role?.dashboardVersion;
    if (version === 'v1' || version === 'v2' || version === 'both') return version;
    return null;
  } catch {
    return null;
  }
}

/**
 * Normaliza una ruta para comparación (convierte a minúsculas y asegura que empiece con /)
 * @param routePath - Ruta a normalizar
 * @returns Ruta normalizada
 */
function normalizeRoute(routePath: string): string {
  // Asegurar que empiece con /
  let normalized = routePath.startsWith('/') ? routePath : `/${routePath}`;
  // Convertir a minúsculas
  normalized = normalized.toLowerCase();
  return normalized;
}

/**
 * Verifica si el usuario tiene permiso para acceder a una ruta
 * @param routePath - Ruta a verificar (ej: '/equipos' o 'Equipos')
 * @returns true si tiene permiso o si no hay restricciones, false si no tiene permiso
 */
export function hasPermission(routePath: string): boolean {
  const permissions = getUserPermissions();

  // Si no hay permisos definidos, permitir acceso (comportamiento por defecto)
  if (permissions === null) {
    return true;
  }

  // Normalizar la ruta a verificar
  const normalizedRoute = normalizeRoute(routePath);

  // Verificar si la ruta normalizada está en la lista de permisos (también normalizados)
  const normalizedPermissions = permissions.map(normalizeRoute);
  return normalizedPermissions.includes(normalizedRoute);
}

/**
 * Verifica si el usuario tiene al menos uno de los permisos indicados.
 * Útil para rutas que aceptan permiso legacy (/) o específico (ej. /dashboard/v1).
 */
export function hasAnyPermission(routePaths: string[]): boolean {
  if (!routePaths.length) return false;
  return routePaths.some((p) => hasPermission(p));
}

/**
 * Filtra un array de items del menú según los permisos del usuario
 * @param menuItems - Array de items del menú con propiedad 'path' y opcionalmente 'subItems'
 * @returns Array filtrado de items del menú
 */
export function filterMenuByPermissions<T extends { path: string; requiredPath?: string; submenu?: boolean; subItems?: Array<{ path: string; requiredPath: string; title?: string }> }>(menuItems: T[]): T[] {
  const permissions = getUserPermissions();

  // Si no hay permisos definidos, retornar todos los items (comportamiento por defecto)
  if (permissions === null) {
    console.log('[Menu Filter] No permissions, showing all items');
    return menuItems;
  }

  const normalizedPermissions = permissions.map(normalizeRoute);

  const result = menuItems.flatMap((item): T[] => {
    // Items with submenu: filter subItems by permission; collapse to single link when only one
    if (item.submenu && item.subItems) {
      if (item.requiredPath) {
        const normalizedParentPath = normalizeRoute(item.requiredPath);
        if (!normalizedPermissions.includes(normalizedParentPath)) {
          console.log(`[Menu Filter] Filtering out submenu: ${item.path} (parent permission ${item.requiredPath} not granted)`);
          return [];
        }
      }

      const allowedSubItems = item.subItems.filter((subItem) =>
        normalizedPermissions.includes(normalizeRoute(subItem.requiredPath))
      );

      if (allowedSubItems.length === 0) {
        console.log(`[Menu Filter] Filtering out submenu: ${item.path} (no sub-items have permission)`);
        return [];
      }

      // Only one subItem: show as single link (no submenu)
      if (allowedSubItems.length === 1) {
        const single = allowedSubItems[0];
        return [
          {
            ...item,
            path: single.path,
            defaultPath: single.path,
            submenu: false,
            subItems: undefined,
          } as T,
        ];
      }

      // Two or more: show submenu with only allowed items
      return [{ ...item, subItems: allowedSubItems } as T];
    }

    // Regular items
    if (item.requiredPath) {
      const hasAccess = normalizedPermissions.includes(normalizeRoute(item.requiredPath));
      if (!hasAccess) {
        console.log(`[Menu Filter] Filtering out: ${item.path} (requiredPath ${item.requiredPath} not in permissions)`);
        return [];
      }
      return [item];
    }

    const hasAccess = normalizedPermissions.includes(normalizeRoute(item.path));
    if (!hasAccess) {
      console.log(`[Menu Filter] Filtering out: ${item.path} (not in permissions)`);
      return [];
    }
    return [item];
  });

  console.log(`[Menu Filter] Filtered menu: ${result.length} of ${menuItems.length} items`);
  return result;
}



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
 * Filtra un array de items del menú según los permisos del usuario
 * @param menuItems - Array de items del menú con propiedad 'path' y opcionalmente 'subItems'
 * @returns Array filtrado de items del menú
 */
export function filterMenuByPermissions<T extends { path: string; requiredPath?: string; submenu?: boolean; subItems?: Array<{ path: string; requiredPath: string }> }>(menuItems: T[]): T[] {
  const permissions = getUserPermissions();

  // Si no hay permisos definidos, retornar todos los items (comportamiento por defecto)
  if (permissions === null) {
    console.log('[Menu Filter] No permissions, showing all items');
    return menuItems;
  }

  // Filtrar items según permisos (normalizando ambas rutas)
  const normalizedPermissions = permissions.map(normalizeRoute);
  const filtered = menuItems.filter((item) => {
    // For items with submenu, check both parent permission and sub-item permissions
    if (item.submenu && item.subItems) {
      // First check if parent item has permission (requiredPath)
      if (item.requiredPath) {
        const normalizedParentPath = normalizeRoute(item.requiredPath);
        const hasParentAccess = normalizedPermissions.includes(normalizedParentPath);
        
        if (!hasParentAccess) {
          console.log(`[Menu Filter] Filtering out submenu: ${item.path} (parent permission ${item.requiredPath} not granted)`);
          return false;
        }
      }
      
      // Then check if at least one subItem has permission
      const hasSubItemAccess = item.subItems.some((subItem) => {
        const normalizedSubPath = normalizeRoute(subItem.requiredPath);
        return normalizedPermissions.includes(normalizedSubPath);
      });
      
      if (!hasSubItemAccess) {
        console.log(`[Menu Filter] Filtering out submenu: ${item.path} (no sub-items have permission)`);
      }
      return hasSubItemAccess;
    }

    // For regular items, check requiredPath if provided, otherwise check the main path
    if (item.requiredPath) {
      const normalizedRequiredPath = normalizeRoute(item.requiredPath);
      const hasAccess = normalizedPermissions.includes(normalizedRequiredPath);
      if (!hasAccess) {
        console.log(`[Menu Filter] Filtering out: ${item.path} (requiredPath ${item.requiredPath} not in permissions)`);
      }
      return hasAccess;
    }

    // Fallback to checking the main path
    const normalizedItemPath = normalizeRoute(item.path);
    const hasAccess = normalizedPermissions.includes(normalizedItemPath);
    if (!hasAccess) {
      console.log(`[Menu Filter] Filtering out: ${item.path} (not in permissions)`);
    }
    return hasAccess;
  });

  console.log(`[Menu Filter] Filtered menu: ${filtered.length} of ${menuItems.length} items`);
  return filtered;
}


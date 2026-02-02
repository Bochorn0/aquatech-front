// import { Label } from 'src/components/label';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor width="100%" height="100%" src={`/assets/icons/navbar/${name}.svg`} />
);

// Definir todos los items del menú disponibles
export const allNavItems = [
  {
    title: 'Dashboard',
    path: '/dashboard/v2', // Default to v2 (same as Puntos de venta / Personalizacion)
    icon: icon('ic-analytics'),
    requiredPath: '/dashboard', // Permission required to see this menu item (parent)
    submenu: true,
    defaultPath: '/dashboard/v2',
    subItems: [
      { title: 'V2', path: '/dashboard/v2', requiredPath: '/dashboard/v2' },
      { title: 'V1', path: '/dashboard/v1', requiredPath: '/dashboard/v1' },
    ],
  },
  {
    title: 'Equipos',
    path: '/equipos',
    icon: icon('ic-products'),
  },
  {
    title: 'Personalizacion',
    path: '/Personalizacion', // Default to v2
    icon: icon('ic-configuration'),
    requiredPath: '/personalizacion', // Permission required to see this menu item (parent)
    submenu: true, // Indicates this has a submenu
    defaultPath: '/Personalizacion', // Default path when clicking main item (v2)
    subItems: [
      {
        title: 'V2',
        path: '/Personalizacion',
        requiredPath: '/personalizacion/v2', // Separate permission for v2
      },
      {
        title: 'V1',
        path: '/v1/Personalizacion',
        requiredPath: '/personalizacion/v1', // Separate permission for v1
      },
    ],
  },
  {
    title: 'Usuarios',
    path: '/usuarios',
    icon: icon('ic-user'),
  },
  {
    title: 'Controladores',
    path: '/controladores',
    icon: icon('ic-controllers'),
  },
  {
    title: 'Puntos De Venta',
    path: '/PuntoVenta', // Default to v2
    icon: icon('ic-building'),
    requiredPath: '/puntoVenta', // Permission required to see this menu item (parent)
    submenu: true, // Indicates this has a submenu
    defaultPath: '/PuntoVenta', // Default path when clicking main item (v2)
    subItems: [
      {
        title: 'V2',
        path: '/PuntoVenta',
        requiredPath: '/puntoVenta/v2', // Separate permission for v2
      },
      {
        title: 'V1',
        path: '/v1/PuntoVenta',
        requiredPath: '/puntoVenta/v1', // Separate permission for v1
      },
    ],
  },
  {
    title: 'Catálogo TI Water',
    path: '/tiwater-catalog',
    icon: icon('ic-products'),
  },
  {
    title: 'API TI Water',
    path: '/api-ti-water',
    icon: icon('ic-configuration'),
  },
];

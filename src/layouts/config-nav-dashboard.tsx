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
    path: '/',
    icon: icon('ic-analytics'),
  },
  {
    title: 'Equipos',
    path: '/equipos',
    icon: icon('ic-products'),
    // info: (
    //   <Label color="error" variant="inverted">
    //   </Label>
    // ),
  },
  // {
  //   title: 'Regiones',
  //   path: '/Regiones',
  //   icon: icon('ic-map'),
  //   info: (
  //     <Label color="error" variant="inverted">
  //       +1002
  //     </Label>
  //   ),
  // },
  {
    title: 'Personalizacion',
    path: '/personalizacion',
    icon: icon('ic-configuration'),
  },
  {
    title: 'Usuarios',
    path: '/usuarios',
    icon: icon('ic-user'),
    // info: (
    //   <Label color="error" variant="inverted">
    //     {/* amount */}
    //   </Label>
    // ),
  },
  {
    title: 'Controladores',
    path: '/controladores',
    icon: icon('ic-controllers'),
    // info: (
    //   <Label color="error" variant="inverted">
    //     {/* amount */}
    //   </Label>
    // ),
  },
  {
    title: 'Puntos De Venta',
    path: '/puntoVenta',
    icon: icon('ic-building'),
    // info: (
    //   <Label color="error" variant="inverted">
    //     {/* amount */}
    //   </Label>
    // ),
  },
  {
    title: 'API TI Water',
    path: '/api-ti-water',
    icon: icon('ic-configuration'),
  },
  // {
  //   title: 'R',
  //   path: '/login',
  //   icon: icon('ic-lock'),
  // },
  // {
  //   title: 'Not found',
  //   path: '/404',
  //   icon: icon('ic-disabled'),
  // },
];

import { Label } from 'src/components/label';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor width="100%" height="100%" src={`/assets/icons/navbar/${name}.svg`} />
);

export const navData = [
  {
    title: 'Dashboard',
    path: '/',
    icon: icon('ic-analytics'),
  },
  {
    title: 'Productos',
    path: '/productos',
    icon: icon('ic-products'),
    info: (
      <Label color="error" variant="inverted">
        +1000
      </Label>
    ),
  },
  {
    title: 'Regiones',
    path: '/Regiones',
    icon: icon('ic-map'),
    info: (
      <Label color="error" variant="inverted">
        +8000
      </Label>
    ),
  },
  {
    title: 'Reportes',
    path: '/reportes',
    icon: icon('ic-analytics'),
  },
  {
    title: 'Usuarios',
    path: '/usuarios',
    icon: icon('ic-user'),
    info: (
      <Label color="error" variant="inverted">
        +1
      </Label>
    ),
  },
  {
    title: 'Registrarse',
    path: '/registrarse',
    icon: icon('ic-lock'),
  },
  // {
  //   title: 'Not found',
  //   path: '/404',
  //   icon: icon('ic-disabled'),
  // },
];

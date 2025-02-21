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
    title: 'Productos',
    path: '/productos',
    icon: icon('ic-cart'),
    info: (
      <Label color="error" variant="inverted">
        +1000
      </Label>
    ),
  },
  // {
  //   title: 'Blog',
  //   path: '/blog',
  //   icon: icon('ic-blog'),
  // },
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

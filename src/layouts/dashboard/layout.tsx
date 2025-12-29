import type { Theme, SxProps, Breakpoint } from '@mui/material/styles';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';

import { filterMenuByPermissions } from 'src/utils/permissions';

import { Iconify } from 'src/components/iconify';

import { Main } from './main';
import { layoutClasses } from '../classes';
import { NavMobile, NavDesktop } from './nav';
import { Searchbar } from '../components/searchbar';
import { allNavItems } from '../config-nav-dashboard';
import { MenuButton } from '../components/menu-button';
import { LayoutSection } from '../core/layout-section';
import { HeaderSection } from '../core/header-section';
import { AccountPopover } from '../components/account-popover';
import { NotificationsPopover } from '../components/notifications-popover';

// ----------------------------------------------------------------------
interface AccountData {
  _id: string;
  nombre: string;
  email: string;
  empresa: string;
  role: string;
  verified: boolean;
  puesto: string;
  status: string;
  avatar: string;
}

export type DashboardLayoutProps = {
  sx?: SxProps<Theme>;
  children: React.ReactNode;
  header?: {
    sx?: SxProps<Theme>;
  };
};

export function DashboardLayout({ sx, children, header }: DashboardLayoutProps) {  
  const theme = useTheme();

  const [navOpen, setNavOpen] = useState(false);
  const [accountData, setAccountData] = useState<AccountData | null>(null);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const parsedUser = JSON.parse(user);
      setAccountData(parsedUser);
    }
  }, []);

  // Filtrar el menú dinámicamente cada vez que se renderiza, basado en los permisos actuales
  // No necesita dependencias porque filterMenuByPermissions lee directamente de localStorage
  const navData = useMemo(() => {
    const filtered = filterMenuByPermissions(allNavItems);
    console.log('[Layout] Menu filtered:', filtered.length, 'of', allNavItems.length, 'items');
    return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Se recalcula automáticamente cuando cambia localStorage

  const layoutQuery: Breakpoint = 'lg';

  return (
    <LayoutSection
      /** **************************************
       * Header
       *************************************** */
      headerSection={
        <HeaderSection
          layoutQuery={layoutQuery}
          slotProps={{
            container: {
              maxWidth: false,
              sx: { px: { [layoutQuery]: 5 } },
            },
          }}
          sx={header?.sx}
          slots={{
            topArea: (
              <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
                This is an info Alert.
              </Alert>
            ),
            leftArea: (
              <>
                <MenuButton
                  onClick={() => setNavOpen(true)}
                  sx={{
                    ml: -1,
                    [theme.breakpoints.up(layoutQuery)]: { display: 'none' },
                  }}
                />
                <NavMobile
                  data={navData}
                  open={navOpen}
                  onClose={() => setNavOpen(false)}
                />
              </>
            ),
            rightArea: (
              <Box gap={1} display="flex" alignItems="center">
                <Searchbar />
                <NotificationsPopover />
                <AccountPopover
                  data={[
                    {
                      label: 'Inicio',
                      href: '/',
                      icon: <Iconify width={22} icon="solar:home-angle-bold-duotone" />,
                    },
                    {
                      label: 'Perfil',
                      href: `/Usuarios/Perfil/${accountData?._id}`,
                      icon: <Iconify width={22} icon="solar:shield-keyhole-bold-duotone" />,
                    },
                    // {
                    //   label: 'Settings',
                    //   href: '#',
                    //   icon: <Iconify width={22} icon="solar:settings-bold-duotone" />,
                    // },
                  ]}
                />
              </Box>
            ),
          }}
        />
      }
      /** **************************************
       * Sidebar
       *************************************** */
      sidebarSection={
        <NavDesktop data={navData} layoutQuery={layoutQuery} />
      }
      /** **************************************
       * Footer
       *************************************** */
      footerSection={null}
      /** **************************************
       * Style
       *************************************** */
      cssVars={{
        '--layout-nav-vertical-width': '300px',
        '--layout-dashboard-content-pt': theme.spacing(1),
        '--layout-dashboard-content-pb': theme.spacing(8),
        '--layout-dashboard-content-px': theme.spacing(5),
      }}
      sx={{
        [`& .${layoutClasses.hasSidebar}`]: {
          [theme.breakpoints.up(layoutQuery)]: {
            pl: 'var(--layout-nav-vertical-width)',
          },
        },
        ...sx,
      }}
    >
      <Main>{children}</Main>
    </LayoutSection>
  );
}

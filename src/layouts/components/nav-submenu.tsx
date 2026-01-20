import { useState } from 'react';

import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import ListItem from '@mui/material/ListItem';
import { alpha, useTheme } from '@mui/material/styles';
import ListItemButton from '@mui/material/ListItemButton';

import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { hasPermission } from 'src/utils/permissions';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export type NavSubMenuItem = {
  title: string;
  path: string;
  requiredPath: string; // Permission path to check
};

export type NavSubMenuProps = {
  title: string;
  icon: React.ReactNode;
  items: NavSubMenuItem[];
  defaultPath?: string; // Default path when clicking the main item
};

export function NavSubMenu({ title, icon, items, defaultPath }: NavSubMenuProps) {
  const theme = useTheme();
  const pathname = usePathname();
  
  // Filter items based on permissions
  const filteredItems = items.filter(item => hasPermission(item.requiredPath));
  
  // Check if any sub-item is active
  const isAnySubItemActive = filteredItems.some(item => pathname === item.path || pathname.startsWith(`${item.path}/`));
  
  // Check if main item should be active (if defaultPath matches)
  const isMainActive = defaultPath ? pathname === defaultPath || pathname.startsWith(`${defaultPath}/`) : false;
  const isActive = isMainActive || isAnySubItemActive;
  
  const [open, setOpen] = useState(isActive);

  // If no items after filtering, don't render
  if (filteredItems.length === 0) {
    return null;
  }

  return (
    <>
      <ListItem disableGutters disablePadding>
        <ListItemButton
          component={defaultPath ? RouterLink : 'div'}
          href={defaultPath}
          onClick={(e: React.MouseEvent<HTMLDivElement>) => {
            // If clicking the arrow icon, toggle submenu
            const target = e.target as HTMLElement;
            if (target.closest('.submenu-toggle') || target.closest('svg')) {
              e.preventDefault();
              setOpen(!open);
            }
            // Otherwise, navigate to defaultPath (v2)
          }}
          sx={{
            pl: 2,
            py: 1,
            gap: 2,
            pr: 1.5,
            borderRadius: 0.75,
            typography: 'body2',
            fontWeight: 'fontWeightMedium',
            color: 'var(--layout-nav-item-color)',
            minHeight: 'var(--layout-nav-item-height)',
            ...(isActive && {
              fontWeight: 'fontWeightSemiBold',
              bgcolor: 'var(--layout-nav-item-active-bg)',
              color: 'var(--layout-nav-item-active-color)',
            }),
          }}
        >
          <Box component="span" sx={{ width: 24, height: 24 }}>
            {icon}
          </Box>

          <Box component="span" flexGrow={1}>
            {title}
          </Box>

          <Box
            className="submenu-toggle"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(!open);
            }}
            sx={{ 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center',
              ml: 1
            }}
          >
            <Iconify
              icon={open ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
              width={16}
              sx={{ color: 'text.secondary' }}
            />
          </Box>
        </ListItemButton>
      </ListItem>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box component="ul" sx={{ pl: 2, listStyle: 'none' }}>
          {filteredItems.map((item) => {
            const isItemActive = pathname === item.path || pathname.startsWith(`${item.path}/`);

            return (
              <ListItem key={item.path} disableGutters disablePadding>
                <ListItemButton
                  component={RouterLink}
                  href={item.path}
                  sx={{
                    pl: 3,
                    py: 0.75,
                    gap: 1.5,
                    pr: 1.5,
                    borderRadius: 0.75,
                    typography: 'body2',
                    fontWeight: 'fontWeightMedium',
                    color: 'text.secondary',
                    minHeight: 36,
                    ...(isItemActive && {
                      fontWeight: 'fontWeightSemiBold',
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      color: 'primary.main',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                      },
                    }),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.grey[500], 0.08),
                    },
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      bgcolor: isItemActive ? 'primary.main' : 'text.disabled',
                    }}
                  />
                  <Box component="span" flexGrow={1}>
                    {item.title}
                  </Box>
                </ListItemButton>
              </ListItem>
            );
          })}
        </Box>
      </Collapse>
    </>
  );
}

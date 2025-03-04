import { forwardRef } from 'react';

import Box from '@mui/material/Box';

import type { SvgColorProps } from './types';

const svgColorClasses = { root: 'aquatech_svg_color_root' };
// ----------------------------------------------------------------------

export const SvgColor = forwardRef<HTMLSpanElement, SvgColorProps>(
  ({ src, width = 24, height, className, sx, ...other }, ref) => (
    <Box
      ref={ref}
      component="span"
      className={svgColorClasses.root.concat(className ? ` ${className}` : '')}
      sx={{
        width,
        flexShrink: 0,
        height: height ?? width,
        display: 'inline-flex',
        bgcolor: 'currentColor',
        mask: `url(${src}) no-repeat center / contain`,
        WebkitMask: `url(${src}) no-repeat center / contain`,
        ...sx,
      }}
      {...other}
    />
  )
);

import { useState, useEffect, forwardRef, useCallback } from 'react';

import Box from '@mui/material/Box';

import { Iconify } from 'src/components/iconify';

import type { SvgColorProps } from './types';

const svgColorClasses = { root: 'aquatech_svg_color_root' };

/** Normalize icon path so it works on any route: ./assets/... -> /assets/... */
function normalizeIconSrc(src: string): string {
  if (typeof src !== 'string') return src;
  const trimmed = src.trim();
  if (trimmed.startsWith('./')) return `/${trimmed.slice(2)}`;
  if (!trimmed.startsWith('/') && !trimmed.startsWith('http')) return `/${trimmed}`;
  return trimmed;
}

// ----------------------------------------------------------------------

export const SvgColor = forwardRef<HTMLSpanElement, SvgColorProps>(
  ({ src, width = 24, height, className, sx, fallback, ...other }, ref) => {
    const resolvedSrc = normalizeIconSrc(src);
    const [loadError, setLoadError] = useState(false);

    const handleError = useCallback(() => setLoadError(true), []);
    const handleLoad = useCallback(() => setLoadError(false), []);

    useEffect(() => {
      setLoadError(false);
      const img = new Image();
      img.onload = handleLoad;
      img.onerror = handleError;
      img.src = resolvedSrc;
      return () => {
        img.onload = null;
        img.onerror = null;
        img.src = '';
      };
    }, [resolvedSrc, handleLoad, handleError]);

    if (loadError) {
      return (
        <Box
          ref={ref}
          component="span"
          className={svgColorClasses.root.concat(className ? ` ${className}` : '')}
          sx={{
            width,
            flexShrink: 0,
            height: height ?? width,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...sx,
          }}
          {...other}
        >
          {fallback ?? <Iconify icon="solar:gallery-bold-duotone" width={typeof width === 'number' ? width : (typeof width === 'string' ? width : 24)} sx={{ opacity: 0.7 }} />}
        </Box>
      );
    }

    return (
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
          mask: `url(${resolvedSrc}) no-repeat center / contain`,
          WebkitMask: `url(${resolvedSrc}) no-repeat center / contain`,
          ...sx,
        }}
        {...other}
      />
    );
  }
);

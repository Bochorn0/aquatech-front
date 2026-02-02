import type { ReactNode } from 'react';
import type { BoxProps } from '@mui/material/Box';

// ----------------------------------------------------------------------

export type SvgColorProps = BoxProps & {
  src: string;
  /** Rendered when the icon image fails to load (e.g. network or wrong path) */
  fallback?: ReactNode;
};

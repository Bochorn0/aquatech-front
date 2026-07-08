import type { BoxProps } from '@mui/material/Box';

import ReactApexChart from 'react-apexcharts';

import Box from '@mui/material/Box';

import type { ChartProps } from './types';

const ApexChart =
  typeof ReactApexChart === 'function'
    ? ReactApexChart
    : (ReactApexChart as { default?: typeof ReactApexChart }).default;

const chartClasses = { root: 'aquatech_base_chart' };
// ----------------------------------------------------------------------

export function Chart({
  sx,
  type,
  series,
  height,
  options,
  className,
  width = '100%',
  ...other
}: BoxProps & ChartProps) {
  return (
    <Box
      dir="ltr"
      className={chartClasses.root.concat(className ? ` ${className}` : '')}
      sx={{
        width,
        height,
        flexShrink: 0,
        borderRadius: 1.5,
        position: 'relative',
        ...sx,
      }}
      {...other}
    >
      {typeof ApexChart === 'function' ? (
        <ApexChart type={type} series={series} options={options} width="100%" height="100%" />
      ) : (
        <Box sx={{ p: 2, typography: 'caption', color: 'text.secondary' }}>Gráfica no disponible</Box>
      )}
    </Box>
  );
}

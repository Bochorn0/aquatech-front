import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  value: number;
  maxValue?: number;
  unit?: string;
  label?: string;
  color?: string;
};

export function PressureGauge({ 
  title, 
  subheader, 
  value, 
  maxValue = 100, 
  unit = 'PSI', 
  label = 'Presión',
  color,
  ...other 
}: Props) {
  const theme = useTheme();

  // Calcular el porcentaje
  const percentage = Math.min((value / maxValue) * 100, 100);

  // Determinar el color basado en el valor
  const getColor = () => {
    if (color) return color;
    if (percentage < 30) return theme.palette.error.main;
    if (percentage < 70) return theme.palette.warning.main;
    return theme.palette.success.main;
  };

  const chartColor = getColor();

  const chartOptions = useChart({
    chart: {
      type: 'radialBar',
      sparkline: { enabled: false },
    },
    colors: [chartColor],
    plotOptions: {
      radialBar: {
        hollow: {
          size: '60%',
        },
        track: {
          background: theme.palette.grey[200],
          strokeWidth: '100%',
        },
        dataLabels: {
          show: false,
        },
      },
    },
  } as ChartOptions);

  return (
    <Card {...other}>
      {title && (
        <>
          <Box sx={{ p: 2, pb: 0 }}>
            <Typography variant="h6" gutterBottom>
              {title}
            </Typography>
            {subheader && (
              <Typography variant="body2" color="text.secondary">
                {subheader}
              </Typography>
            )}
          </Box>
          <Divider sx={{ borderStyle: 'dashed', mt: 2 }} />
        </>
      )}

      <Box sx={{ p: 2, textAlign: 'center', position: 'relative' }}>
        <Chart
          type="radialBar"
          series={[percentage]}
          options={chartOptions}
          height={220}
        />
        {/* Valor de presión superpuesto */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <Typography variant="h3" fontWeight="bold" color="text.primary">
            {value.toFixed(1)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {unit}
          </Typography>
        </Box>
        
        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Rango: 0 - {maxValue} {unit}
        </Typography>
      </Box>
    </Card>
  );
}


import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';

import { useState, useCallback } from 'react';

import Card from '@mui/material/Card';
import List from '@mui/material/List';
import Dialog from '@mui/material/Dialog';
import ListItem from '@mui/material/ListItem';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import DialogContent from '@mui/material/DialogContent';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

export type BarClickInfo = {
  seriesIndex: number;
  dataPointIndex: number;
  seriesName: string;
  category: string;
  value: number;
};

type Props = CardProps & {
  title?: string;
  subheader?: string;
  chart: {
    colors?: string[];
    categories?: string[];
    series: {
      name: string;
      data: number[];
    }[];
    options?: ChartOptions;
  };
  /** When provided, bar clicks show a dialog with the returned title and content (string or list of PV names). */
  getBarDescription?: (info: BarClickInfo) => { title: string; content: string | string[] } | null;
};

export function MultipleBarChart({ title, subheader, chart, getBarDescription, ...other }: Props) {
  const theme = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogContent, setDialogContent] = useState<string | string[]>([]);

  const defaultColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ];
  const chartColors = chart.colors && chart.colors.length > 0 ? chart.colors : defaultColors;

  const onDataPointSelection = useCallback(
    (event: unknown, chartContext: unknown, config: { seriesIndex: number; dataPointIndex: number; w: { config: { series: { name: string; data: number[] }[]; xaxis?: { categories?: string[] } } } }) => {
      if (!getBarDescription) return;
      const categories = config.w?.config?.xaxis?.categories ?? chart.categories ?? [];
      const series = config.w?.config?.series ?? chart.series ?? [];
      const seriesName = series[config.seriesIndex]?.name ?? '';
      const category = categories[config.dataPointIndex] ?? '';
      const value = series[config.seriesIndex]?.data?.[config.dataPointIndex] ?? 0;
      const info: BarClickInfo = {
        seriesIndex: config.seriesIndex,
        dataPointIndex: config.dataPointIndex,
        seriesName,
        category,
        value,
      };
      const result = getBarDescription(info);
      if (result) {
        setDialogTitle(result.title);
        setDialogContent(result.content);
        setDialogOpen(true);
      }
    },
    [getBarDescription, chart.categories, chart.series]
  );

  const chartOptions = useChart({
    colors: chartColors,
    stroke: { width: 2, colors: ['transparent'] },
    xaxis: { categories: chart.categories },
    legend: { show: true },
    tooltip: { y: { formatter: (value: number) => `${value}` } },
    ...chart.options,
    ...(getBarDescription
      ? { chart: { ...(chart.options?.chart ?? {}), events: { dataPointSelection: onDataPointSelection } } }
      : {}),
  });

  const handleCloseDialog = useCallback(() => setDialogOpen(false), []);

  return (
    <>
      <Card {...other}>
        <CardHeader title={title} subheader={subheader} />

        <Chart
          type="bar"
          series={chart.series}
          options={chartOptions}
          height={500}
          sx={{ py: 2.5, pl: 1, pr: 2.5 }}
        />
      </Card>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          {Array.isArray(dialogContent) ? (
            <List dense>
              {dialogContent.map((item, i) => (
                <ListItem key={i}>
                  <ListItemText primary={item} />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2">{dialogContent}</Typography>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

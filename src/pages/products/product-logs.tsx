import axios from 'axios';
import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { Box, Chip, Card, Grid, Table, Paper, Checkbox, TableRow, TableCell, TableBody, TableHead, Typography, CardContent, TableContainer, CircularProgress, FormControlLabel } from '@mui/material';

import { CONFIG } from 'src/config-global';

import dayjs, { Dayjs } from 'dayjs';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// Interfaces for TypeScript

interface Log {
  event_time: string;
  value: number;
  code: string;
}

interface MetricCardProps {
  title: string;
  value: string | number | object;
  unit?: string;
}

interface DisplayFields {
  [key: string]: boolean;
}

const defaultFields: DisplayFields = {
  tds_out: true,
  flowrate_total_1: false,
  flowrate_total_2: false,
  flowrate_speed_1: true,
  flowrate_speed_2: true,
  temperature: true
};

// Separate MetricCard Component
const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit }) => {
  let displayValue = 'N/A';

  if (value !== null && value !== undefined) {
    if (typeof value === 'object') {
      displayValue = JSON.stringify(value);
    } else {
      displayValue = String(value);
    }
  }

  return (
    <Card sx={{ height: '100%', '&:hover': { boxShadow: 3 } }}>
      <CardContent>
        <Typography color="textSecondary" gutterBottom>
          {title || 'N/A'}
        </Typography>
        <Typography variant="h4" component="div" color="primary">
          {displayValue}
          {unit && (
            <Typography variant="subtitle1" component="span" ml={1}>
              {unit}
            </Typography>
          )}
        </Typography>
      </CardContent>
    </Card>
  );
};

// PropTypes validation
MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.object]).isRequired,
  unit: PropTypes.string,
};


const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [displayFields, setDisplayFields] = useState<DisplayFields>(defaultFields);
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().startOf('day')); // Start of the day
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs()); // Current time
  

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const params = {
          id,
          start_date: startDate ? startDate.valueOf() : dayjs().startOf('day'),
          end_date: endDate ? endDate.valueOf() : dayjs().valueOf(),
          fields: Object.keys(displayFields)
            .filter((key) => displayFields[key as keyof DisplayFields])
            .join(',')
        };
        console.log('params', params);
        const response = await axios.get(`${CONFIG.API_BASE_URL}/products/${id}/logs`, { params });
        setLogs(response.data?.list || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching logs:', error);
        setLoading(false);
      }
    };

    fetchLogs();

    const interval = setInterval(() => {
      fetchLogs();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [id, startDate, endDate, displayFields]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Filter Logs
          </Typography>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
              <DateTimePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                slotProps={{ textField: { fullWidth: true } }} 
              />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <DateTimePicker
                  label="End Date"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  slotProps={{ textField: { fullWidth: true } }} 
                />
              </Grid>
            </Grid>
          </LocalizationProvider>

          <Grid container spacing={2} sx={{ mt: 2 }}>
            {Object.keys(displayFields).map((field) => (
              <Grid item xs={6} sm={4} md={3} key={field}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={displayFields[field]}
                      onChange={(e) =>
                        setDisplayFields((prev) => ({ ...prev, [field]: e.target.checked }))
                      }
                    />
                  }
                  label={field.replace(/([A-Z])/g, ' $1').trim()}
                />
              </Grid>
            ))}
          </Grid>
        </Paper>

        <TableContainer component={Paper} sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
            Product Logs
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Event Time</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Flow Rate (L/min)</TableCell>
                <TableCell>Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length > 0 ? (
                logs.map((log, index) => {
                  const isFlowRate = log.code.includes('flowrate_speed');
                  const value = isFlowRate ? `${log.value} L/min` : `${log.value / 10} L/min`;

                  return (
                    <TableRow key={index}>
                      <TableCell>{new Date(log.event_time).toLocaleString()}</TableCell>
                      <TableCell>{log.code}</TableCell>
                      <TableCell>
                        <Chip label={value} color={isFlowRate ? 'secondary' : 'primary'} size="small" />
                      </TableCell>
                      <TableCell>{log.value}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No logs available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </>
  );
};

export default ProductDetail;

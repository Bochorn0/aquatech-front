import type { Dayjs } from 'dayjs'; // Only import Dayjs as a type
import axios from 'axios';
import dayjs from 'dayjs';
import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { Box, Chip, Card, Grid, Table, Paper, Checkbox, TableRow, TextField, TableCell, TableBody, TableHead, Typography, CardContent, TableContainer, TablePagination, CircularProgress, FormControlLabel } from '@mui/material';

import { CONFIG } from 'src/config-global';
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
  tds_out: false,
  flowrate_total_1: false,
  flowrate_total_2: false,
  flowrate_speed_1: true,
  flowrate_speed_2: true,
  temperature: false
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
  const [searchTerm, setSearchTerm] = useState<string>(''); // New search state
  const [page, setPage] = useState<number>(0); // Pagination page
  const [rowsPerPage, setRowsPerPage] = useState<number>(10); // Pagination rows per page

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const params = {
          id,
          start_date: startDate ? startDate.valueOf() : dayjs().startOf('day'),
          end_date: endDate ? endDate.valueOf() : dayjs().valueOf(),
          fields: Object.keys(displayFields)
            .filter((key) => displayFields[key as keyof DisplayFields])
            .join(','),
          page, // Send page to the API
          limit: rowsPerPage // Send limit for pagination
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
  }, [id, startDate, endDate, displayFields, page, rowsPerPage]);

  // Filter logs based on search term
  const filteredLogs = logs.filter((log) => log.code.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to the first page when rows per page change
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Filtrar Logs
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
          <TextField
            label="Search Logs"
            value={searchTerm}
            onChange={handleSearchChange}
            fullWidth
            sx={{ mt: 2 }}
          />
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
                <TableCell>Flow Rate (L)</TableCell>
                <TableCell>Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map(({ event_time, code, value }, index) => {
                  const isFlowRate = code.includes('flowrate');
                  const isTemperature = code.includes('temperature');
                  const isTds = code === 'tds_out'; // Check for tds_out field

                  // Adjust value if necessary
                  const adjustedValue = isFlowRate ? value / 10 : value;

                  // Format display value
                  const displayValue = isTemperature
                    ? `${adjustedValue} °C`
                    : isTds
                    ? `${adjustedValue} ppm`
                    : `${adjustedValue} L`; // Default to L for other cases

                  return (
                    <TableRow key={index}>
                      <TableCell>{new Date(event_time).toLocaleString()}</TableCell>
                      <TableCell>{code}</TableCell>
                      <TableCell>
                        <Chip
                          label={displayValue}
                          color={isFlowRate ? 'secondary' : isTemperature ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{value}</TableCell>
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
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={logs.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      </Box>
  );
};

export default ProductDetail;

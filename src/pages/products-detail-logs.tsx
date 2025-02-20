import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

import Button from '@mui/material/Button';
import React, { useState, useEffect } from 'react';

import { Box, Chip, Table, Paper, TableRow, TableCell, TableBody, TableHead, Typography, TableContainer, CircularProgress } from '@mui/material';

import { API_BASE_URL } from '../config/config';

function ProductsDetailLogs() {
  const { id } = useParams();
  const [logs, setLogs] = useState([{event_time: '', value: 1}]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/products/${id}/logs`);
        console.log(response.data, 'response.data');
        
        // Extract logs from API response
        if (response.data?.list) {
          setLogs(response.data.list);
        } else {
          setLogs([]);
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
        Product Logs
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Event Time</TableCell>
            <TableCell>Flow Rate (L/min)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <TableRow key={index}>
                <TableCell>{new Date(log.event_time).toLocaleString()}</TableCell>
                <TableCell>
                  <Chip label={`${log.value/10} L/min`} color="primary" size="small" />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={2} align="center">
                No logs available
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default ProductsDetailLogs;

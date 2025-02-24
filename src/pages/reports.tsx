import axios from 'axios';
import { CSVLink } from 'react-csv';
import React, { useState, useEffect } from 'react';

import { Box, Stack, Button, Checkbox, Typography, FormControlLabel} from '@mui/material';

import { CONFIG } from 'src/config-global';


interface Status {
  code: string;
  value: string | number | boolean;
}

interface Product {
  id: string;
  name: string;
  online: boolean;
  icon: string;
  status: Status[];
}

function ReportGenerator() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${CONFIG.API_BASE_URL}/products/mocked`);
        setProducts(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  }, []);

  const fields = [
    { label: 'Product Name', value: 'name' },
    { label: 'TDS', value: 'tds_out' },
    { label: 'Flowrate Total 1', value: 'flowrate_total_1' },
    { label: 'Flowrate Total 2', value: 'flowrate_total_2' },
    { label: 'Flowrate Speed 1', value: 'flowrate_speed_1' },
    { label: 'Flowrate Speed 2', value: 'flowrate_speed_2' },
    { label: 'Filter Element 1', value: 'filter_element_1' },
    { label: 'Filter Element 2', value: 'filter_element_2' },
    { label: 'Filter Element 3', value: 'filter_element_3' },
    { label: 'Filter Element 4', value: 'filter_element_4' },
    { label: 'Temperature', value: 'temperature' },
    { label: 'Online Status', value: 'online' },
  ];

  const handleFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setSelectedFields((prev) =>
      checked ? [...prev, value] : prev.filter((field) => field !== value)
    );
  };

  const generateReportData = () => {
    return products.map((product) => {
      const rowData: Record<string, string | number | boolean> = {};
      selectedFields.forEach((field) => {
        if (field === 'name') rowData['Product'] = product.name;
        else if (field === 'tds_out') rowData['TDS'] = product.status.find(s => s.code === 'tds_out')?.value || 'N/A';
        else if (field === 'flowrate_total_1') rowData['Flowrate Total 1'] = product.status.find(s => s.code === 'flowrate_total_1')?.value || 'N/A';
        else if (field === 'flowrate_total_2') rowData['Flowrate Total 2'] = product.status.find(s => s.code === 'flowrate_total_2')?.value || 'N/A';
        else if (field === 'flowrate_speed_1') rowData['Flowrate Speed 1'] = product.status.find(s => s.code === 'flowrate_speed_1')?.value || 'N/A';
        else if (field === 'flowrate_speed_2') rowData['Flowrate Speed 2'] = product.status.find(s => s.code === 'flowrate_speed_2')?.value || 'N/A';
        else if (field === 'filter_element_1') rowData['Filter Element 1'] = product.status.find(s => s.code === 'filter_element_1')?.value || 'N/A';
        else if (field === 'filter_element_2') rowData['Filter Element 2'] = product.status.find(s => s.code === 'filter_element_2')?.value || 'N/A';
        else if (field === 'filter_element_3') rowData['Filter Element 3'] = product.status.find(s => s.code === 'filter_element_3')?.value || 'N/A';
        else if (field === 'filter_element_4') rowData['Filter Element 4'] = product.status.find(s => s.code === 'filter_element_4')?.value || 'N/A';
        else if (field === 'temperature') rowData['Temperature'] = product.status.find(s => s.code === 'temperature')?.value || 'N/A';
        else if (field === 'online') rowData['Online Status'] = product.online ? 'Online' : 'Offline';
      });
      return rowData;
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6">Generate Report</Typography>
      <Stack direction="column" spacing={2}>
        {fields.map((field) => (
          <FormControlLabel
            key={field.value}
            control={
              <Checkbox
                checked={selectedFields.includes(field.value)}
                onChange={handleFieldChange}
                value={field.value}
              />
            }
            label={field.label}
          />
        ))}
      </Stack>

      {selectedFields.length > 0 && (
        <CSVLink
          data={generateReportData()}
          filename="product_report.csv"
        >
          <Button variant="contained" color="primary" sx={{ mt: 2 }}>
            Download Report
          </Button>
        </CSVLink>
      )}
    </Box>
  );
}

export default ReportGenerator;

import Swal from "sweetalert2";
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Box,
  Grid,
  Paper,
  Table,
  Button,
  TableRow,
  TableBody,
  TableHead,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
} from '@mui/material';

import { StyledTableRow, StyledTableCell, StyledTableContainer, StyledTableCellHeader } from "src/utils/styles";

import { CONFIG } from "src/config-global";
import { get, remove } from "src/api/axiosHelperV2";

import { SvgColor } from 'src/components/svg-color';

export type TIWaterProduct = {
  id: number;
  code: string;
  name: string;
  description?: string;
  category?: string;
  price?: number;
  specifications?: Record<string, any>;
  images?: string[];
  catalogSource?: string;
  pageNumber?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export default function TIWaterCatalogPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<TIWaterProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, categoryFilter]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const filters: any = {
        isActive: true,
        limit: 100,
      };
      
      if (searchTerm) filters.search = searchTerm;
      if (categoryFilter) filters.category = categoryFilter;

      const response = await get<{ products: TIWaterProduct[] }>(`/tiwater/products`, filters);
      setProducts(response.products || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al cargar productos',
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmationAlert = () => Swal.fire({
    icon: 'warning',
    title: 'Advertencia',
    text: '¿Estás seguro de que deseas eliminar este producto?',
    showCancelButton: true,
    confirmButtonText: 'Sí, Continuar',
    cancelButtonText: 'Cancelar',
  });

  const handleEdit = (product: TIWaterProduct) => {
    navigate(`/tiwater-catalog/${product.id}`);
  };

  const handleDelete = async (id: number) => {
    try {
      const result = await confirmationAlert();
      if (result.isConfirmed) {
        await remove(`/tiwater/products/${id}`);
        Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Producto eliminado correctamente',
        });
        fetchProducts();
      }
    } catch (error: any) {
      console.error("Error deleting product:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al eliminar producto',
      });
    }
  };

  const handleAddProduct = () => {
    navigate('/tiwater-catalog/new');
  };

  const categories = ['general', 'presurizadores', 'valvulas_sistemas', 'sumergibles', 'plomeria'];
  const categoryLabels: Record<string, string> = {
    general: 'General',
    presurizadores: 'Presurizadores',
    valvulas_sistemas: 'Válvulas y Sistemas',
    sumergibles: 'Sumergibles',
    plomeria: 'Plomería',
  };

  return (
    <>
      <Helmet>
        <title>Catálogo TI Water - {CONFIG.appName}</title>
      </Helmet>

      <Box sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box sx={{ overflowX: 'auto' }}>
              <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
                    Catálogo de Productos TI Water
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={3} textAlign='right'>
                  <Button variant="contained" color="primary" onClick={handleAddProduct} fullWidth>
                    Añadir Producto
                  </Button>
                </Grid>
              </Grid>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={3}>
                  <TextField
                    select
                    fullWidth
                    label="Categoría"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    SelectProps={{ native: true }}
                    size="small"
                  >
                    <option value="">Todas las categorías</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {categoryLabels[cat] || cat}
                      </option>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </Box>

            <StyledTableContainer>
              <Paper elevation={3}>
                <Box sx={{ overflowX: 'auto' }}>
                  {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f4f6f8' }}>
                          <StyledTableCellHeader>Código</StyledTableCellHeader>
                          <StyledTableCellHeader>Nombre</StyledTableCellHeader>
                          <StyledTableCellHeader>Categoría</StyledTableCellHeader>
                          <StyledTableCellHeader>Precio</StyledTableCellHeader>
                          <StyledTableCellHeader>Catálogo</StyledTableCellHeader>
                          <StyledTableCellHeader>Página</StyledTableCellHeader>
                          <StyledTableCellHeader>Acciones</StyledTableCellHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {products.length === 0 ? (
                          <StyledTableRow>
                            <StyledTableCell colSpan={7} align="center">
                              <Typography variant="body2" color="text.secondary">
                                No hay productos disponibles
                              </Typography>
                            </StyledTableCell>
                          </StyledTableRow>
                        ) : (
                          products.map((product) => (
                            <StyledTableRow key={product.id}>
                              <StyledTableCell>{product.code}</StyledTableCell>
                              <StyledTableCell>{product.name}</StyledTableCell>
                              <StyledTableCell>
                                {product.category ? categoryLabels[product.category] || product.category : '-'}
                              </StyledTableCell>
                              <StyledTableCell>
                                {product.price ? `$${product.price.toFixed(2)}` : '-'}
                              </StyledTableCell>
                              <StyledTableCell>
                                {product.catalogSource || '-'}
                              </StyledTableCell>
                              <StyledTableCell>
                                {product.pageNumber || '-'}
                              </StyledTableCell>
                              <StyledTableCell>
                                <IconButton 
                                  sx={{ mr: 1, color: 'primary.main' }} 
                                  onClick={() => handleEdit(product)}
                                >
                                  <SvgColor src='./assets/icons/actions/edit.svg' />
                                </IconButton>
                                <IconButton 
                                  sx={{ mr: 1, color: 'danger.main' }} 
                                  onClick={() => handleDelete(product.id)}
                                >
                                  <SvgColor src='./assets/icons/actions/delete.svg' />
                                </IconButton>
                              </StyledTableCell>
                            </StyledTableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </Box>
              </Paper>
            </StyledTableContainer>
          </Grid>
        </Grid>
      </Box>
    </>
  );
}

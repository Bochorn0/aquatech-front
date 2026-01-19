import Swal from "sweetalert2";
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import {
  Box,
  Grid,
  Paper,
  Avatar,
  Button,
  Select,
  MenuItem,
  TextField,
  IconButton,
  InputLabel,
  Typography,
  FormControl,
  CircularProgress,
} from '@mui/material';

import { CONFIG } from 'src/config-global';
import { get, post, patch } from 'src/api/axiosHelperV2';

import { SvgColor } from 'src/components/svg-color';

import type { TIWaterProduct } from './tiwater-catalog';

const defaultProduct: Partial<TIWaterProduct> = {
  code: '',
  name: '',
  description: '',
  category: '',
  price: undefined,
  specifications: {},
  images: [],
  catalogSource: '',
  pageNumber: undefined,
  isActive: true,
};

export default function TIWaterCatalogProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<TIWaterProduct>>(defaultProduct);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!isNew && id) {
      fetchProduct(parseInt(id, 10));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew]);

  const fetchProduct = async (productId: number) => {
    setLoading(true);
    try {
      const product = await get<TIWaterProduct>(`/tiwater/products/${productId}`);
      setFormData({
        ...product,
        images: product.images || [],
      });
    } catch (error: any) {
      console.error('Error fetching product:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al cargar producto',
      });
      navigate('/tiwater-catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle numeric fields
    if (name === 'price' || name === 'pageNumber') {
      const numValue = value === '' ? undefined : parseFloat(value);
      setFormData((prev) => ({
        ...prev,
        [name]: numValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64String = reader.result as string;
        
        setFormData((prev) => {
          const currentImages = prev.images || [];
          
          if (index !== undefined && index >= 0) {
            // Replace image at index
            const updatedImages = [...currentImages];
            updatedImages[index] = base64String;
            return { ...prev, images: updatedImages };
          }
          // Add new image
          return { ...prev, images: [...currentImages, base64String] };
        });
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => {
      const currentImages = prev.images || [];
      return {
        ...prev,
        images: currentImages.filter((_, i) => i !== index),
      };
    });
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.code || formData.code.trim() === '') {
      newErrors.code = 'El código es requerido';
    }
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'El nombre es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validación',
        text: 'Por favor completa todos los campos requeridos',
      });
      return;
    }

    setSaving(true);
    try {
      const productData = {
        ...formData,
        price: formData.price !== null && formData.price !== undefined ? parseFloat(formData.price.toString()) : undefined,
        pageNumber: formData.pageNumber !== null && formData.pageNumber !== undefined ? parseInt(formData.pageNumber.toString(), 10) : undefined,
        specifications: formData.specifications || {},
        images: formData.images || [],
      };

      if (isNew) {
        await post<TIWaterProduct>(`/tiwater/products`, productData);
        Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Producto creado correctamente',
        });
      } else {
        await patch<TIWaterProduct>(`/tiwater/products/${id}`, productData);
        Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Producto actualizado correctamente',
        });
      }
      
      navigate('/tiwater-catalog');
    } catch (error: any) {
      console.error('Error saving product:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al guardar producto',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

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
        <title>{isNew ? 'Nuevo Producto' : 'Editar Producto'} - {CONFIG.appName}</title>
      </Helmet>

      <Box sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" gap={2} sx={{ mb: 3 }}>
          <IconButton onClick={() => navigate('/tiwater-catalog')}>
            <SvgColor src='./assets/icons/actions/back.svg' width={24} height={24} />
          </IconButton>
          <Typography variant="h4">
            {isNew ? 'Nuevo Producto' : 'Editar Producto'}
          </Typography>
        </Box>

        <Paper elevation={3} sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Información Básica
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Código *"
                name="code"
                value={formData.code || ''}
                onChange={handleChange}
                fullWidth
                error={!!errors.code}
                helperText={errors.code}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Nombre *"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                fullWidth
                error={!!errors.name}
                helperText={errors.name}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Categoría</InputLabel>
                <Select
                  name="category"
                  value={formData.category || ''}
                  onChange={handleSelectChange}
                  label="Categoría"
                >
                  <MenuItem value="">Sin categoría</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {categoryLabels[cat] || cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Precio"
                name="price"
                type="number"
                value={formData.price || ''}
                onChange={handleChange}
                fullWidth
                inputProps={{ step: '0.01', min: '0' }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Descripción"
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                fullWidth
                multiline
                rows={4}
              />
            </Grid>

            {/* Catalog Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Información del Catálogo
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Fuente del Catálogo"
                name="catalogSource"
                value={formData.catalogSource || ''}
                onChange={handleChange}
                fullWidth
                placeholder="Ej: TI Water General.pdf"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Número de Página"
                name="pageNumber"
                type="number"
                value={formData.pageNumber || ''}
                onChange={handleChange}
                fullWidth
                inputProps={{ min: '1' }}
              />
            </Grid>

            {/* Images */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Imágenes
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Las imágenes se almacenan como base64 en la base de datos
              </Typography>

              <Grid container spacing={2}>
                {(formData.images || []).map((image, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Box position="relative" sx={{ mb: 2 }}>
                      <Avatar
                        src={image}
                        variant="rounded"
                        sx={{ width: '100%', height: 200 }}
                      />
                      <IconButton
                        onClick={() => handleRemoveImage(index)}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          bgcolor: 'error.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'error.dark' },
                        }}
                      >
                        ×
                      </IconButton>
                      <input
                        type="file"
                        accept="image/*"
                        id={`image-upload-${index}`}
                        style={{ display: 'none' }}
                        onChange={(e) => handleImageChange(e, index)}
                      />
                      <Box sx={{ mt: 1 }}>
                        <Button
                          component="label"
                          htmlFor={`image-upload-${index}`}
                          variant="outlined"
                          size="small"
                          fullWidth
                        >
                          Reemplazar
                        </Button>
                      </Box>
                    </Box>
                  </Grid>
                ))}

                <Grid item xs={12} sm={6} md={4}>
                  <Box
                    sx={{
                      border: '2px dashed',
                      borderColor: 'primary.main',
                      borderRadius: 1,
                      p: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 200,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      id="new-image-upload"
                      style={{ display: 'none' }}
                      onChange={(e) => handleImageChange(e)}
                    />
                    <Button
                      component="label"
                      htmlFor="new-image-upload"
                      variant="outlined"
                      fullWidth
                    >
                      Agregar Imagen
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Grid>

            {/* Actions */}
            <Grid item xs={12}>
              <Box display="flex" gap={2} justifyContent="flex-end" sx={{ mt: 3 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/tiwater-catalog')}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSave}
                  disabled={saving || !!errors.code || !!errors.name}
                >
                  {saving ? <CircularProgress size={24} /> : isNew ? 'Crear' : 'Guardar'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </>
  );
}

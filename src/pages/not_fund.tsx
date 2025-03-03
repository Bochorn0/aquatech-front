import { Helmet } from 'react-helmet-async';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/config-global';
import { SimpleLayout } from 'src/layouts/simple';
// ----------------------------------------------------------------------


export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`404 Pagina no encontrada| Error - ${CONFIG.appName}`}</title>
      </Helmet>
      <SimpleLayout content={{ compact: true }}>
        <Container>
          <Typography variant="h3" sx={{ mb: 2 }}>
            Este sitio no existe!
          </Typography>

          <Typography sx={{ color: 'text.secondary' }}>
            Lo sentimos, la página que buscas no se encuentra.
          </Typography>

          <Box
            component="img"
            src="/assets/illustrations/illustration-404.svg"
            sx={{
              width: 320,
              height: 'auto',
              my: { xs: 5, sm: 10 },
            }}
          />

          <Button component={RouterLink} href="/Login" size="large" variant="contained" color="inherit">
            Iniciar sesión
          </Button>
        </Container>
      </SimpleLayout>
    </>
  );
}

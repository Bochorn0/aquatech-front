import { Helmet } from 'react-helmet-async';

import { Box } from '@mui/material';

import { CONFIG } from 'src/config-global';

import MexicoMap from './maps/mexico-map';



function MapsPage() {
  return (
    <>
      <Helmet>
        <title> {`Covertura - ${CONFIG.appName}`}</title>
      </Helmet>
      <Box sx={{ p: 2 }}>
        <MexicoMap />
      </Box>
    </>
  );
}


export default MapsPage;

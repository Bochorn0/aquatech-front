import { useState } from 'react';
import { Helmet } from 'react-helmet-async';

import {
  Box,
  Card,
  Chip,
  Paper,
  Stack,
  Button,
  Divider,
  Accordion,
  Container,
  Typography,
  CardContent,
  AccordionDetails,
  AccordionSummary,
} from '@mui/material';

import axiosInstance from 'src/api/axiosInstance';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

/**
 * Public broker host for docs. Override with `VITE_MQTT_PUBLIC_HOSTNAME` if needed.
 * Production namespace uses the topic-spaces hostname (same as internal MQTT mocker / App Service).
 */
const MQTT_DOC_HOST =
  (import.meta.env?.VITE_MQTT_PUBLIC_HOSTNAME as string | undefined) ||
  'tiwatermqtt.eastus-1.ts.eventgrid.azure.net';

/** Example Client authentication name used by Aquatech’s load / mocker publisher (third parties receive their own). */
const MQTT_EXAMPLE_CLIENT_AUTH = 'lcc-mqtt-mocker';

export default function MQTTDocumentationPage() {
  const [expanded, setExpanded] = useState<string | false>('connection');
  const [downloading, setDownloading] = useState(false);

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleDownloadCertificate = async () => {
    try {
      setDownloading(true);
      
      const response = await axiosInstance({
        url: '/mqtt/certificate/download',
        method: 'GET',
        responseType: 'blob', // Importante para descargar archivos
      });

      // Crear un enlace temporal para descargar el archivo
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'aquatech_ca_certificate.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error descargando certificado:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title> API TI Water - Documentación MQTT | Aquatech</title>
      </Helmet>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          {/* Header */}
          <Box>
            <Typography variant="h3" component="h1" gutterBottom>
              API TI Water
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Guía para publicar telemetría TI Water hacia la nube (Azure Event Grid MQTT) y verla en LCC / Aquatech.
            </Typography>
          </Box>

          <Divider />

          {/* Introducción */}
          <Paper sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Iconify icon="solar:info-circle-bold-duotone" width={24} sx={{ color: 'primary.main' }} />
                <Typography variant="h6">Introducción</Typography>
              </Box>
              <Typography variant="body1" color="text.secondary">
                El broker de producción es <strong>Azure Event Grid: MQTT broker</strong> (puerto <strong>8883</strong>, TLS).
                Cada sitio publica en un <strong>topic jerárquico</strong> que identifica región, ciudad y código de tienda;
                el consumidor de Aquatech suscribe esos topics, normaliza el JSON y guarda en PostgreSQL para tableros y alertas.
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Debes completar el <strong>alta del punto de venta</strong> (código de tienda, región y ciudad en catálogo) y
                recibir un <strong>certificado de cliente X.509</strong> y el <strong>nombre de autenticación MQTT</strong> registrado en Azure.
                Contacta a un representante de Aquatech para el onboarding y el template de topic space correcto en tu namespace.
              </Typography>
            </Stack>
          </Paper>

          {/* Conexión al Servidor */}
          <Accordion expanded={expanded === 'connection'} onChange={handleChange('connection')}>
            <AccordionSummary expandIcon={<Iconify icon="solar:alt-arrow-down-bold-duotone" width={24} />}>
              <Typography variant="h6">Conexión al broker (producción Azure)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    ENDPOINT
                  </Typography>
                  <Card variant="outlined" sx={{ mt: 1 }}>
                    <CardContent>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Hostname MQTT (Event Grid Namespace)
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            {MQTT_DOC_HOST}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            Este host (<code>.ts.eventgrid.azure.net</code>) es el que usa el publicador de pruebas y las
                            integraciones desplegadas en Azure App Service. Si el host sin <code>.ts.</code> (
                            <code>tiwatermqtt.eastus-1.eventgrid.azure.net</code>) funciona mejor en tu red, puedes usarlo;
                            si ves <code>ECONNRESET</code>, prueba el otro. Puedes sobrescribir el texto de esta página con{' '}
                            <code>VITE_MQTT_PUBLIC_HOSTNAME</code>.
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Puerto y protocolo
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip label="8883" color="success" />
                            <Chip label="mqtts (TLS)" color="primary" />
                          </Stack>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            TLS obligatorio. No uses 1883 ni conexiones sin cifrado hacia Event Grid.
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    SEGURIDAD (AZURE EVENT GRID MQTT)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    El broker valida al cliente con <strong>mutual TLS (X.509)</strong>: debes presentar un certificado de
                    cliente cuyo <strong>thumbprint</strong> esté registrado en Azure (MQTT broker → Clients). En el paquete
                    CONNECT MQTT, el <strong>username</strong> debe coincidir exactamente con el <strong>Client authentication name</strong>
                    de ese cliente.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    <strong>No envíes contraseña MQTT</strong> (<code>MQTT_PASSWORD</code>) contra Event Grid: la autenticación
                    es certificado + nombre de cliente; una contraseña mal configurada puede impedir la conexión.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    En Azure debes tener un <strong>Topic space</strong> cuyo template permita tus topics (por ejemplo{' '}
                    <code>tiwater/#</code> o <code>tiwater/+/+/+/data</code>) y un <strong>Permission binding</strong> con
                    permiso de <strong>Publisher</strong> para el grupo de clientes que use tu certificado.
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="body2" fontWeight="bold" gutterBottom>
                            Usuario MQTT (CONNECT)
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Igual al <strong>Client authentication name</strong> en Azure. Aquatech te asigna un nombre al
                            registrar tu certificado. El publicador de carga interno usa, a modo de referencia,{' '}
                            <code>{MQTT_EXAMPLE_CLIENT_AUTH}</code>;{' '}
                            <strong>no reutilices ese cliente ni sus certificados</strong> — son solo para simulación.
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight="bold" gutterBottom>
                            Certificado de cliente y clave privada
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Par <code>.pem</code> / <code>.key</code> emitido en el onboarding (p. ej. con <code>step</code> o el flujo que indique Aquatech).
                            El thumbprint del certificado debe coincidir con el registrado en el cliente del namespace.
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight="bold" gutterBottom>
                            CA del servidor (TLS)
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            El servidor presenta certificados de la cadena pública de Azure; los clientes suelen validar con
                            el almacén de CA del sistema. En entornos restringidos, Aquatech puede suministrar material adicional.
                          </Typography>
                          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Iconify icon="solar:download-bold-duotone" width={20} />}
                              onClick={handleDownloadCertificate}
                              disabled={downloading}
                              sx={{ minWidth: 200 }}
                            >
                              {downloading ? 'Descargando...' : 'Descargar material Aquatech (ZIP)'}
                            </Button>
                            <Typography variant="caption" color="text.secondary" component="div">
                              El ZIP lo arma el API con los PEM configurados en Azure (
                              <code>MQTT_DOC_DOWNLOAD_CA_CERT_B64</code>, <code>MQTT_DOC_DOWNLOAD_CLIENT_CERT_B64</code>
                              — Base64 de un PEM cada uno; no son <code>MQTT_CLIENT_CERT_B64</code> del consumidor). El ZIP
                              va cifrado; la contraseña sigue la regla del usuario en el API (p. ej. correo o
                              <code>mqtt_zip_password</code>).
                            </Typography>
                          </Stack>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    EJEMPLO: MISMA CONFIGURACIÓN QUE EL MOCK / APP SERVICE (NODE.JS)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Así se configura la conexión en variables de entorno (patrón usado por el publicador de pruebas y
                    recomendado para servicios en Azure). Sustituye el usuario y los Base64 por los que te entregue Aquatech
                    para <strong>tu</strong> cliente registrado en el namespace.
                  </Typography>
                  <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                    <CardContent>
                      <Typography
                        variant="body2"
                        component="pre"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          m: 0,
                          overflow: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                        }}
                      >
                        {`MQTT_BROKER=${MQTT_DOC_HOST}
MQTT_PORT=8883
MQTT_USE_TLS=true
MQTT_USERNAME=${MQTT_EXAMPLE_CLIENT_AUTH}
# No definir MQTT_PASSWORD (Event Grid: autenticación X.509, no contraseña MQTT)

# Certificado de cliente y clave en Base64 (sin saltos de línea), típico en Azure App Service:
#   base64 -i cliente.pem | tr -d '\\n'
#   base64 -i cliente.key | tr -d '\\n'
MQTT_CLIENT_CERT_B64=LS0tLS1CRUdJTi4uLg==
MQTT_CLIENT_KEY_B64=LS0tLS1CRUdJTi4uLg==`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                        Los valores de ejemplo de Base64 son ficticios. El cliente <code>{MQTT_EXAMPLE_CLIENT_AUTH}</code> es el
                        usado por el simulador interno; tu integración tendrá otro <code>MQTT_USERNAME</code> y otros secretos.
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    SOLO SIMULADOR DE CARGA (REFERENCIA)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    El servicio interno de publicación masiva puede usar además (no aplica a gateways de tienda):
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', m: 0 }}>
                        {`MQTT_LOAD_INTERVAL_MINUTES=2
MQTT_LOAD_PUNTOS_COUNT=135`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Intervalo entre lotes y cantidad de puntos simulados; irrelevante para clientes que publican una sola
                        tienda real.
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    ENTORNOS LEGADOS (SOLO REFERENCIA)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Instalaciones antiguas con Mosquitto (IP fija, puerto 1883 sin TLS o 8883 con usuario/contraseña) no
                    deben usarse para nuevas integraciones en producción. Si aún tienes uno, migra al namespace de Event Grid
                    con el mismo formato de topics y payload descrito en esta página.
                  </Typography>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Envío de Mensajes */}
          <Accordion expanded={expanded === 'messages'} onChange={handleChange('messages')}>
            <AccordionSummary expandIcon={<Iconify icon="solar:alt-arrow-down-bold-duotone" width={24} />}>
              <Typography variant="h6">Topics y payload JSON</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    ESTRUCTURA DE TOPICS (RECOMENDADA)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Cinco segmentos, terminando en <code>/data</code>. Coincide con el mismo patrón que usa el publicador de
                    pruebas (lcc_mqtt_mocker) y el consumidor de la API:
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body1" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                        {`{CLIENTE}/{CODIGO_REGION}/{CIUDAD}/{CODIGO_TIENDA}/data`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        <strong>CLIENTE</strong>: identificador de integración (hoy <code>tiwater</code> para TI Water). Debe
                        coincidir con el prefijo permitido en el Topic space de Azure.
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        <strong>CODIGO_REGION</strong>: código de región en el catálogo (ej. <code>Noroeste</code>, <code>Bajio</code>).
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        <strong>CIUDAD</strong>: nombre de ciudad sin barra <code>/</code>; si usas otro formato, alinea con el
                        punto de venta dado de alta.
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        <strong>CODIGO_TIENDA</strong>: debe coincidir con el código del punto de venta (ej. <code>TIENDA_001</code>).
                        El <strong>cliente corporativo</strong> y la asignación en la plataforma se resuelven por este código en base de datos,
                        no por un segmento extra en el topic.
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                        Ejemplo: <code>tiwater/Noroeste/Hermosillo/TIENDA_001/data</code>
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    FORMATO LEGACY (COMPATIBLE)
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body1" component="pre" sx={{ fontFamily: 'monospace' }}>
                        tiwater/&#123;CODIGO_TIENDA&#125;/data
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Tres segmentos: solo código de tienda. Útil para equipos antiguos; el backend asume región/ciudad vacías
                        o valores por defecto.
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    PAYLOAD
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Cuerpo JSON (UTF-8). Puedes usar las etiquetas en español y mayúsculas del mocker de referencia, o los
                    nombres normalizados en snake_case; el servicio mapea ambos a sensores internos.
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography
                        variant="body2"
                        component="pre"
                        sx={{
                          fontFamily: 'monospace',
                          backgroundColor: 'grey.100',
                          p: 2,
                          borderRadius: 1,
                          overflow: 'auto',
                          fontSize: '0.75rem',
                        }}
                      >
                        {`{
  "CAUDAL PURIFICADA": 1.2,
  "CAUDAL RECUPERACION": 1.8,
  "CAUDAL RECHAZO": 0.12,
  "NIVEL PURIFICADA": 62.5,
  "NIVEL CRUDA": 55.0,
  "PORCENTAJE NIVEL PURIFICADA": 62.5,
  "PORCENTAJE NIVEL CRUDA": 55.0,
  "CAUDAL CRUDA": 1.5,
  "ACUMULADO CRUDA": 1200.5,
  "CAUDAL CRUDA L/min": 18.2,
  "TDS": 45,
  "PRESION CO2": 72,
  "ch1": 2.1, "ch2": 2.1, "ch3": 1.2, "ch4": 2.0,
  "EFICIENCIA": 58.5,
  "vida": 120,
  "timestamp": 1234567890,
  "lat": 29.07,
  "long": -110.95
}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        <strong>timestamp</strong>: Unix en segundos (recomendado). Alternativas equivalentes en backend:{' '}
                        <code>flujo_produccion</code>, <code>electronivel_purificada</code>, etc.
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Publica con <strong>QoS 1</strong> si tu cliente lo permite (mismo criterio que el mocker de carga).
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Flujo */}
          <Accordion expanded={expanded === 'flow'} onChange={handleChange('flow')}>
            <AccordionSummary expandIcon={<Iconify icon="solar:alt-arrow-down-bold-duotone" width={24} />}>
              <Typography variant="h6">Qué ocurre al publicar un mensaje</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  1. Tu gateway se conecta a <strong>Event Grid MQTT</strong> con TLS y certificado de cliente válido.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  2. Publicas en <code>{'{CLIENTE}/{REGION}/{CIUDAD}/{CODIGO_TIENDA}/data'}</code> (o formato legacy de tres segmentos).
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  3. El <strong>consumidor MQTT</strong> de Aquatech (servicio de API) recibe el mensaje, parsea región/ciudad/código
                  de tienda desde el topic y el JSON del cuerpo.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  4. Los campos se <strong>normalizan</strong> (p. ej. &quot;CAUDAL PURIFICADA&quot; → flujo de producción) y se
                  persisten en <strong>PostgreSQL</strong> (sensores / mensajes), asociados al punto de venta por{' '}
                  <code>codigo_tienda</code>.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  5. La aplicación web y la API REST leen esos datos para tableros, históricos y alertas.
                </Typography>
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Ejemplos Node / Python / CLI */}
          <Accordion expanded={expanded === 'code'} onChange={handleChange('code')}>
            <AccordionSummary expandIcon={<Iconify icon="solar:alt-arrow-down-bold-duotone" width={24} />}>
              <Typography variant="h6">Ejemplos para probar la conexión</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={3}>
                <Typography variant="body2" color="text.secondary">
                  Necesitas tres archivos PEM del cliente: <code>client.pem</code> (certificado) y <code>client.key</code>{' '}
                  (clave privada), más el <strong>Client authentication name</strong> como usuario MQTT. Event Grid{' '}
                  <strong>no usa contraseña MQTT</strong>. El host de ejemplo es <code>{MQTT_DOC_HOST}</code>.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Nota:</strong> <code>curl</code> es para HTTP/HTTPS; no habla el protocolo MQTT. Para una prueba rápida
                  desde terminal usa <code>mosquitto_pub</code> (cliente Mosquitto) o los scripts de Node.js / Python siguientes.
                </Typography>

                <Box>
                  <Typography variant="subtitle2" gutterBottom color="primary.main">
                    Node.js (JavaScript o TypeScript)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    <code>npm install mqtt</code> — mismo enfoque que el publicador interno (<code>mqtts</code>, cert/key en disco).
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography
                        variant="body2"
                        component="pre"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.72rem',
                          backgroundColor: 'grey.100',
                          p: 2,
                          borderRadius: 1,
                          overflow: 'auto',
                          maxHeight: 380,
                        }}
                      >
                        {`// publish-once.mjs  (Node 18+)
import fs from 'fs';
import mqtt from 'mqtt';

const broker = process.env.MQTT_BROKER ?? '${MQTT_DOC_HOST}';
const username = process.env.MQTT_USERNAME ?? '${MQTT_EXAMPLE_CLIENT_AUTH}';
const topic =
  process.env.MQTT_TOPIC ?? 'tiwater/Noroeste/Hermosillo/TIENDA_001/data';

const url = \`mqtts://\${broker}:8883\`;
const client = mqtt.connect(url, {
  clientId: \`node-test-\${Date.now()}\`,
  username,
  // sin password — Event Grid
  rejectUnauthorized: true,
  cert: fs.readFileSync('./client.pem'),
  key: fs.readFileSync('./client.key'),
});

client.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

client.on('connect', () => {
  const payload = JSON.stringify({
    TDS: 45,
    'NIVEL PURIFICADA': 62.5,
    timestamp: Math.floor(Date.now() / 1000),
  });
  client.publish(topic, payload, { qos: 1 }, (err) => {
    if (err) console.error(err);
    else console.log('Publicado OK');
    client.end();
  });
});`}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom color="primary.main">
                    Python
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    <code>pip install paho-mqtt</code>
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography
                        variant="body2"
                        component="pre"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.72rem',
                          backgroundColor: 'grey.100',
                          p: 2,
                          borderRadius: 1,
                          overflow: 'auto',
                          maxHeight: 420,
                        }}
                      >
                        {`import json
import ssl
import time
import paho.mqtt.client as mqtt

BROKER = "${MQTT_DOC_HOST}"
PORT = 8883
USERNAME = "${MQTT_EXAMPLE_CLIENT_AUTH}"
TOPIC = "tiwater/Noroeste/Hermosillo/TIENDA_001/data"


def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code.is_failure:
        print(f"Error de conexión: {reason_code}")
        return
    payload = json.dumps(
        {"TDS": 45, "NIVEL PURIFICADA": 62.5, "timestamp": int(time.time())}
    )
    client.publish(TOPIC, payload, qos=1)
    print("Publicado OK")
    client.disconnect()


client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2,
    client_id=f"python-test-{int(time.time())}",
)
client.tls_set(
    certfile="client.pem",
    keyfile="client.key",
    cert_reqs=ssl.CERT_REQUIRED,
    tls_version=ssl.PROTOCOL_TLS_CLIENT,
)
client.username_pw_set(USERNAME)
client.on_connect = on_connect
client.connect(BROKER, PORT, keepalive=60)
client.loop_forever()`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Si usas <code>paho-mqtt</code> 1.x, cambia el constructor a <code>mqtt.Client()</code> sin{' '}
                        <code>CallbackAPIVersion</code> y ajusta la firma de <code>on_connect</code> (código de retorno entero).
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom color="primary.main">
                    Línea de comandos (mosquitto_pub)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Instala el cliente: <code>brew install mosquitto</code> (macOS) o <code>apt install mosquitto-clients</code>{' '}
                    (Debian/Ubuntu). No uses <code>-P</code> (password) con Event Grid.
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography
                        variant="body2"
                        component="pre"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.72rem',
                          backgroundColor: 'grey.100',
                          p: 2,
                          borderRadius: 1,
                          overflow: 'auto',
                        }}
                      >
                        {`mosquitto_pub \\
  -h ${MQTT_DOC_HOST} \\
  -p 8883 \\
  --tls-version tlsv1.2 \\
  -i "cli-test-$(date +%s)" \\
  -u "${MQTT_EXAMPLE_CLIENT_AUTH}" \\
  --cert client.pem \\
  --key client.key \\
  -t "tiwater/Noroeste/Hermosillo/TIENDA_001/data" \\
  -m '{"TDS":45,"timestamp":1730000000}' \\
  -q 1`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Si el sistema no confía en la cadena del servidor, añade <code>--cafile</code> con el PEM de CA que
                        indique Aquatech o exporta <code>SSL_CERT_FILE</code> según tu SO.
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Diagnóstico */}
          <Accordion expanded={expanded === 'responses'} onChange={handleChange('responses')}>
            <AccordionSummary expandIcon={<Iconify icon="solar:alt-arrow-down-bold-duotone" width={24} />}>
              <Typography variant="h6">Diagnóstico de conexión</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Iconify icon="solar:check-circle-bold-duotone" width={24} sx={{ color: 'success.main' }} />
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      Conexión exitosa
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      El cliente MQTT completa el handshake TLS y el broker acepta el CONNECT (certificado y permisos de
                      publicación correctos).
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="flex-start" gap={1}>
                  <Iconify icon="solar:close-circle-bold-duotone" width={24} sx={{ color: 'error.main' }} />
                  <Box>
                    <Typography variant="body1" fontWeight="bold" color="error">
                      Rechazo de autenticación / permisos
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Thumbprint del certificado no coincide con el cliente en Azure, <code>username</code> distinto al Client
                      authentication name, o falta un <strong>Permission binding</strong> de tipo <strong>Publisher</strong> en el
                      Topic space adecuado.
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="flex-start" gap={1}>
                  <Iconify icon="solar:close-circle-bold-duotone" width={24} sx={{ color: 'error.main' }} />
                  <Box>
                    <Typography variant="body1" fontWeight="bold" color="error">
                      Fallo TLS (cadena, SNI o tiempo)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Revisa hostname/SNI, reloj del dispositivo, y que el cliente confíe en las CA de Azure. En App Service,
                      a veces se requiere <code>WEBSITES_INCLUDE_CLOUD_CERTS=true</code> para salidas TLS (lado consumidor API).
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="flex-start" gap={1}>
                  <Iconify icon="solar:close-circle-bold-duotone" width={24} sx={{ color: 'warning.main' }} />
                  <Box>
                    <Typography variant="body1" fontWeight="bold" color="warning.dark">
                      Publicación rechazada (topic no permitido)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      El Topic space no incluye tu ruta (ajusta el template, p. ej. <code>tiwater/#</code>). El JSON inválido no
                      se corrige en el broker: fallará después en el consumidor Aquatech.
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Notas Importantes */}
          <Paper sx={{ p: 3, bgcolor: 'warning.lighter' }}>
            <Stack spacing={1}>
              <Typography variant="h6" color="warning.dark">
                Resumen
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Producción: <strong>Azure Event Grid MQTT</strong>, puerto <strong>8883</strong>, TLS, autenticación con{' '}
                <strong>certificado X.509</strong> y <strong>usuario MQTT</strong> = Client authentication name; sin contraseña MQTT.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Topic recomendado:{' '}
                <code>
                  {'{CLIENTE}/{CODIGO_REGION}/{CIUDAD}/{CODIGO_TIENDA}/data'}
                </code>{' '}
                (ej. <code>tiwater/Noroeste/Hermosillo/TIENDA_001/data</code>). Legacy: <code>tiwater/&#123;CODIGO_TIENDA&#125;/data</code>.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Payload JSON con telemetría (etiquetas tipo mocker o campos normalizados) y <code>timestamp</code> Unix en segundos.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • El <code>CODIGO_TIENDA</code> debe existir en la plataforma; el cliente de negocio se asocia por ese alta, no por el topic.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Hostname por defecto en esta página: <code>{MQTT_DOC_HOST}</code> (override con{' '}
                <code>VITE_MQTT_PUBLIC_HOSTNAME</code> si hace falta).
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Credenciales, topic space y certificados: contacto Aquatech / LCC.
              </Typography>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </>
  );
}


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
              Documentación para conectar un gateway al servidor MQTT de Aquatech
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
                Las credenciales de autenticación son utilizadas para acreditar todas las llamadas al servicio MQTT.
                Se requiere solicitar integración a un representante de Aquatech para poder generar credenciales válidas
                y vigentes para conectarse al servidor MQTT.
              </Typography>
            </Stack>
          </Paper>

          {/* Conexión al Servidor */}
          <Accordion expanded={expanded === 'connection'} onChange={handleChange('connection')}>
            <AccordionSummary expandIcon={<Iconify icon="solar:alt-arrow-down-bold-duotone" width={24} />}>
              <Typography variant="h6">Conexión al Servidor MQTT</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    INFORMACIÓN DEL SERVIDOR
                  </Typography>
                  <Card variant="outlined" sx={{ mt: 1 }}>
                    <CardContent>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Dirección IP
                          </Typography>
                          <Chip label="146.190.143.141" color="primary" />
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Puerto Libre (Sin Autenticación)
                          </Typography>
                          <Chip label="1883" color="info" />
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Conexión sin autenticación ni TLS
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Puerto Seguro (TLS + Autenticación)
                          </Typography>
                          <Chip label="8883" color="success" />
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Requiere autenticación y certificado CA para TLS
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    CREDENCIALES DE AUTENTICACIÓN
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Para generar credenciales son necesarios 3 atributos proporcionados por un representante de Aquatech:
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="body2" fontWeight="bold" gutterBottom>
                            Usuario
                          </Typography>
                          <Chip label="Aquatech001" color="info" />
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Usuario proporcionado por Aquatech
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight="bold" gutterBottom>
                            Contraseña
                          </Typography>
                          <Chip label="Aquatech2025*" color="info" />
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Contraseña proporcionada por Aquatech
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight="bold" gutterBottom>
                            Certificado CA
                          </Typography>
                          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Se requiere el certificado CA para validar la conexión TLS.
                            </Typography>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Iconify icon="solar:download-bold-duotone" width={20} />}
                              onClick={handleDownloadCertificate}
                              disabled={downloading}
                              sx={{ minWidth: 200 }}
                            >
                              {downloading ? 'Descargando...' : 'Descargar Certificado'}
                            </Button>
                          </Stack>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            El certificado se descargará en un archivo ZIP protegido con contraseña.
                            La contraseña es la misma que tu contraseña de inicio de sesión.
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Envío de Mensajes */}
          <Accordion expanded={expanded === 'messages'} onChange={handleChange('messages')}>
            <AccordionSummary expandIcon={<Iconify icon="solar:alt-arrow-down-bold-duotone" width={24} />}>
              <Typography variant="h6">Envío de Mensajes</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    ESTRUCTURA DE TOPICS
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Los mensajes deben publicarse en topics con la siguiente estructura:
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body1" component="pre" sx={{ fontFamily: 'monospace' }}>
                        tiwater/&#123;codigo_tienda&#125;/data
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Nota: El identificador del equipo (tipo_equipo o tipo_sensor) debe incluirse dentro del payload JSON.
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    FORMATO JSON - TOPIC /data
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    El payload debe incluir el identificador del equipo dentro del JSON:
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
                        }}
                      >
                        {`{
  "tipo_equipo": "equipo_001",
  "tipo_sensor": "presion",
  "flujo_produccion": 12.5,
  "flujo_rechazo": 8.3,
  "tds": 45,
  "electronivel_purificada": 85.5,
  "electronivel_recuperada": 75.2,
  "presion_in": 45.3,
  "presion_out": 67.8,
  "timestamp": 1234567890,
  "source": "Gateway",
  "gateway_ip": "192.168.1.100"
}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Campos requeridos: tipo_equipo o tipo_sensor (identifica el equipo/sensor), timestamp, y los datos del sensor.
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Ejemplo de Código ESP32 */}
          <Accordion expanded={expanded === 'code'} onChange={handleChange('code')}>
            <AccordionSummary expandIcon={<Iconify icon="solar:alt-arrow-down-bold-duotone" width={24} />}>
              <Typography variant="h6">Ejemplo de Implementación - ESP32</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    OPCIÓN 1: Puerto 1883 (Sin Autenticación)
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography
                        variant="body2"
                        component="pre"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          backgroundColor: 'grey.100',
                          p: 2,
                          borderRadius: 1,
                          overflow: 'auto',
                          maxHeight: 300,
                        }}
                      >
                        {`#include <WiFi.h>
#include <PubSubClient.h>

const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";

const char* mqtt_server = "146.190.143.141";
const int mqtt_port = 1883;  // Puerto libre

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  client.setServer(mqtt_server, mqtt_port);
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect("ESP32_Client")) {
      Serial.println("MQTT conectado (puerto 1883)");
    } else {
      delay(5000);
    }
  }
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();
  
  String topic = "tiwater/CODIGO_TIENDA_001/data";
  String payload = "{\\"tipo_equipo\\":\\"equipo_001\\",\\"presion_in\\":45.3,\\"presion_out\\":67.8,\\"timestamp\\":1234567890}";
  client.publish(topic.c_str(), payload.c_str());
  delay(5000);
}`}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    OPCIÓN 2: Puerto 8883 (Con Autenticación y TLS)
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography
                        variant="body2"
                        component="pre"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          backgroundColor: 'grey.100',
                          p: 2,
                          borderRadius: 1,
                          overflow: 'auto',
                          maxHeight: 350,
                        }}
                      >
                        {`#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";

const char* mqtt_server = "146.190.143.141";
const int mqtt_port = 8883;  // Puerto seguro
const char* mqtt_username = "Aquatech001";
const char* mqtt_password = "Aquatech2025*";

// Certificado CA (proporcionado por Aquatech)
const char* ca_cert = "-----BEGIN CERTIFICATE-----\\n"
"TU_CERTIFICADO_CA_AQUI\\n"
"-----END CERTIFICATE-----";

WiFiClientSecure espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  
  espClient.setCACert(ca_cert);
  client.setServer(mqtt_server, mqtt_port);
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect("ESP32_Client", mqtt_username, mqtt_password)) {
      Serial.println("MQTT conectado (puerto 8883 - TLS)");
    } else {
      delay(5000);
    }
  }
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();
  
  String topic = "tiwater/CODIGO_TIENDA_001/data";
  String payload = "{\\"tipo_equipo\\":\\"equipo_001\\",\\"presion_in\\":45.3,\\"presion_out\\":67.8,\\"timestamp\\":1234567890}";
  client.publish(topic.c_str(), payload.c_str());
  delay(5000);
}`}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Respuestas del Servidor */}
          <Accordion expanded={expanded === 'responses'} onChange={handleChange('responses')}>
            <AccordionSummary expandIcon={<Iconify icon="solar:alt-arrow-down-bold-duotone" width={24} />}>
              <Typography variant="h6">Respuestas del Servidor</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Iconify icon="solar:check-circle-bold-duotone" width={24} sx={{ color: 'success.main' }} />
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      Conexión Exitosa
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      El gateway se ha conectado satisfactoriamente al servidor MQTT.
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" gap={1}>
                  <Iconify icon="solar:close-circle-bold-duotone" width={24} sx={{ color: 'error.main' }} />
                  <Box>
                    <Typography variant="body1" fontWeight="bold" color="error">
                      Error 401 - Usuario no autorizado
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Las credenciales proporcionadas son incorrectas o el usuario no tiene permisos.
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" gap={1}>
                  <Iconify icon="solar:close-circle-bold-duotone" width={24} sx={{ color: 'error.main' }} />
                  <Box>
                    <Typography variant="body1" fontWeight="bold" color="error">
                      Error de Conexión TLS
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Verifica que el certificado CA sea correcto y esté configurado adecuadamente.
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
                Notas Importantes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • El servidor MQTT ofrece dos opciones: puerto 1883 (sin autenticación) y puerto 8883 (con TLS y autenticación).
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Para el puerto 8883, el certificado CA debe ser proporcionado por Aquatech para validar la conexión TLS.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Los topics deben seguir la estructura: tiwater/&#123;codigo_tienda&#125;/data
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • El identificador del equipo (tipo_equipo o tipo_sensor) debe incluirse dentro del payload JSON, no en el topic.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • El formato JSON debe ser válido y contener todos los campos requeridos, incluyendo timestamp.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Para obtener credenciales o soporte, contacta a un representante de Aquatech.
              </Typography>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </>
  );
}


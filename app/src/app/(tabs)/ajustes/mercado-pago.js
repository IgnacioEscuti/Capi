import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BotonPrimario from '@/components/BotonPrimario';
import DialogoConfirmacion from '@/components/DialogoConfirmacion';
import MensajeError from '@/components/MensajeError';
import Resplandor from '@/components/Resplandor';
import { useSincronizacion } from '@/context/SincronizacionContext';
import { useDatosAlEnfocar } from '@/hooks/useDatosAlEnfocar';
import { desconectarMp, obtenerEstadoMp, obtenerUrlDeConexion } from '@/services/mercadoPago.service';
import { colores, espaciado, fuentes, radios, tipografia } from '@/theme';
import { formatearMomento } from '@/utils/formato';

const IMPORTADOS = [
  { icono: 'swap-horiz', texto: 'Transferencias' },
  { icono: 'qr-code-2', texto: 'Pagos con QR' },
  { icono: 'autorenew', texto: 'Suscripciones' },
  { icono: 'savings', texto: 'Reservas' },
];

// Dirección a la que el back redirige al terminar el login de MP.
// En Expo Go queda "exp://<ip>:8081/--/ajustes/mercado-pago"; en la app instalada, "capi://ajustes/mercado-pago".
const URL_DE_VUELTA = Linking.createURL('/ajustes/mercado-pago');

export default function MercadoPagoScreen() {
  const insets = useSafeAreaInsets();
  const { sincronizar, setConectado } = useSincronizacion();
  const { datos: estado, error, recargar } = useDatosAlEnfocar(obtenerEstadoMp);
  const [conectando, setConectando] = useState(false);
  const [falloConexion, setFalloConexion] = useState(false);
  const [confirmandoDesconexion, setConfirmandoDesconexion] = useState(false);

  async function conectar() {
    setConectando(true);
    setFalloConexion(false);
    try {
      const url = await obtenerUrlDeConexion(URL_DE_VUELTA);
      // Abre el login de MP en un navegador dentro de la app. Se cierra solo cuando
      // el back redirige a URL_DE_VUELTA, y devuelve esa URL con ?mp=ok o ?mp=error.
      const resultado = await WebBrowser.openAuthSessionAsync(url, URL_DE_VUELTA);
      const conecto = resultado.type === 'success' && Linking.parse(resultado.url).queryParams?.mp === 'ok';

      if (!conecto) {
        // Error de MP o el usuario cerró el navegador: los dos cuentan como "no se pudo conectar".
        setFalloConexion(true);
        return;
      }
      setConectado(true);
      recargar();
      // Primera sincronización: al terminar, recarga para mostrar la hora de la última.
      sincronizar().then(recargar);
    } catch {
      setFalloConexion(true);
    } finally {
      setConectando(false);
    }
  }

  async function desconectar() {
    await desconectarMp();
    setConfirmandoDesconexion(false);
    setConectado(false);
    recargar();
  }

  const conectado = Boolean(estado?.conectado);

  return (
    <View style={styles.pantalla}>
      <Resplandor />
      <ScrollView
        contentContainerStyle={[styles.contenido, { paddingTop: insets.top + 4 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.encabezado}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Volver a Ajustes"
            hitSlop={8}
            style={({ pressed }) => [styles.volver, pressed && styles.atenuado]}>
            <MaterialIcons name="chevron-left" size={30} color={colores.texto} />
          </Pressable>
          <Text style={styles.tituloEncabezado}>Mercado Pago</Text>
        </View>

        <MensajeError mensaje={error} />

        {estado === null ? (
          !error && <ActivityIndicator color={colores.texto2} style={styles.cargando} />
        ) : (
          <>
            {conectado ? (
              <TarjetaConectado ultimaSincronizacion={estado.ultimaSincronizacion} />
            ) : (
              <>
                {falloConexion && <AvisoFalloConexion />}
                <Presentacion />
              </>
            )}

            <ListaImportados />
            {!falloConexion && <NotaCargaManual />}

            <View style={styles.espacio} />

            {conectado ? (
              <BotonDesconectar onPress={() => setConfirmandoDesconexion(true)} />
            ) : (
              <BotonPrimario
                titulo={falloConexion ? 'Reintentar' : 'Conectar Mercado Pago'}
                tituloCargando="Conectando…"
                icono={falloConexion ? 'refresh' : undefined}
                cargando={conectando}
                onPress={conectar}
              />
            )}
          </>
        )}
      </ScrollView>

      <DialogoConfirmacion
        visible={confirmandoDesconexion}
        titulo="¿Desconectar Mercado Pago?"
        textoConfirmar="Desconectar"
        icono="link-off"
        onConfirmar={desconectar}
        onCancelar={() => setConfirmandoDesconexion(false)}>
        Capi deja de traer movimientos nuevos. Los movimientos que ya importaste quedan en tu lista.
      </DialogoConfirmacion>
    </View>
  );
}

function Presentacion() {
  return (
    <View style={styles.presentacion}>
      <View style={styles.iconoGrande}>
        <MaterialIcons name="swap-horiz" size={34} color={colores.texto2} />
      </View>
      <Text style={styles.tituloPresentacion}>Tus movimientos, sin cargarlos a mano</Text>
      <Text style={styles.textoPresentacion}>Conectá tu cuenta y Capi trae solo lo que pasa en Mercado Pago.</Text>
    </View>
  );
}

function TarjetaConectado({ ultimaSincronizacion }) {
  return (
    <View style={[styles.tarjeta, styles.tarjetaConectado]}>
      <View style={styles.circuloConectado}>
        <MaterialIcons name="check-circle" size={34} color={colores.ingreso} />
      </View>
      <Text style={styles.tituloConectado}>Conectado</Text>
      <Text style={styles.textoPresentacion}>
        {ultimaSincronizacion
          ? `Última sincronización: ${formatearMomento(new Date(ultimaSincronizacion))}`
          : 'Todavía no se sincronizó'}
      </Text>
    </View>
  );
}

function AvisoFalloConexion() {
  return (
    <View style={styles.avisoFallo} accessibilityRole="alert">
      <MaterialIcons name="error" size={22} color={colores.egreso} />
      <View style={styles.textosFallo}>
        <Text style={styles.tituloFallo}>No se pudo conectar</Text>
        <Text style={styles.textoFallo}>Algo falló al volver de Mercado Pago. Tu cuenta sigue sin conectar.</Text>
      </View>
    </View>
  );
}

function ListaImportados() {
  return (
    <View style={[styles.tarjeta, styles.listaImportados]}>
      <Text style={styles.etiquetaLista}>SE IMPORTA SOLO</Text>
      {IMPORTADOS.map(({ icono, texto }) => (
        <View key={texto} style={styles.filaImportado}>
          <MaterialIcons name={icono} size={22} color={colores.texto2} />
          <Text style={styles.textoImportado}>{texto}</Text>
        </View>
      ))}
    </View>
  );
}

function NotaCargaManual() {
  return (
    <View style={[styles.tarjeta, styles.nota]}>
      <MaterialIcons name="edit-note" size={24} color={colores.texto2} />
      <Text style={styles.textoNota}>
        Las <Text style={styles.resaltado}>transferencias a bancos</Text> y el{' '}
        <Text style={styles.resaltado}>efectivo</Text> los seguís cargando a mano.
      </Text>
    </View>
  );
}

function BotonDesconectar({ onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.botonDesconectar, pressed && styles.presionado]}>
      <MaterialIcons name="link-off" size={22} color={colores.egreso} />
      <Text style={styles.textoDesconectar}>Desconectar</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  contenido: {
    flexGrow: 1,
    gap: 16,
    paddingHorizontal: espaciado.pantalla,
    paddingBottom: espaciado.debajoDelNavbar,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    marginBottom: 8,
  },
  volver: {
    width: 36,
    alignItems: 'center',
  },
  atenuado: {
    opacity: 0.5,
  },
  tituloEncabezado: {
    fontFamily: fuentes.semibold,
    fontSize: 21,
    color: colores.texto,
  },
  cargando: {
    paddingTop: 80,
  },
  presentacion: {
    gap: 12,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  iconoGrande: {
    width: 64,
    height: 64,
    marginBottom: 8,
    borderRadius: radios.logo,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloPresentacion: {
    ...tipografia.titulo,
    fontSize: 32,
    lineHeight: 36,
    color: colores.texto,
  },
  textoPresentacion: {
    fontFamily: fuentes.regular,
    fontSize: 16,
    lineHeight: 23,
    color: colores.texto2,
  },
  tarjeta: {
    borderRadius: radios.tarjeta,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  tarjetaConectado: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  circuloConectado: {
    width: 72,
    height: 72,
    marginBottom: 8,
    borderRadius: radios.pildora,
    backgroundColor: colores.ingresoSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloConectado: {
    ...tipografia.seccion,
    fontFamily: fuentes.bold,
    fontSize: 24,
    color: colores.texto,
  },
  avisoFallo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 18,
    borderRadius: radios.mensaje,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.egresoBorde,
  },
  textosFallo: {
    flex: 1,
    gap: 4,
  },
  tituloFallo: {
    fontFamily: fuentes.semibold,
    fontSize: 16,
    color: colores.texto,
  },
  textoFallo: {
    fontFamily: fuentes.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colores.texto2,
  },
  listaImportados: {
    gap: 18,
    padding: 20,
  },
  etiquetaLista: {
    fontFamily: fuentes.semibold,
    fontSize: 13,
    letterSpacing: 0.6,
    color: colores.texto3,
  },
  filaImportado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  textoImportado: {
    ...tipografia.cuerpo,
    fontSize: 17,
    color: colores.texto,
  },
  nota: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 20,
  },
  textoNota: {
    flex: 1,
    fontFamily: fuentes.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colores.texto2,
  },
  resaltado: {
    fontFamily: fuentes.medio,
    color: colores.texto,
  },
  espacio: {
    flex: 1,
    minHeight: 16,
  },
  botonDesconectar: {
    height: 60,
    borderRadius: radios.pildora,
    backgroundColor: colores.egresoSuave,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  presionado: {
    transform: [{ scale: 0.97 }],
  },
  textoDesconectar: {
    fontFamily: fuentes.bold,
    fontSize: 18,
    color: colores.egreso,
  },
});

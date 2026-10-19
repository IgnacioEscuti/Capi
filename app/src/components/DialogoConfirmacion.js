import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import MensajeError from './MensajeError';
import { obtenerMensajeDeError } from '@/services/api';
import { colores, espaciado, fuentes, radios, tipografia } from '@/theme';

// Confirmación de una acción destructiva (borrar). "onConfirmar" es async:
// el diálogo muestra la carga y, si falla, el error sin cerrarse.
// Si sale bien, el que lo abrió se encarga de cerrarlo (visible = false).
export default function DialogoConfirmacion({ visible, titulo, children, textoConfirmar, onConfirmar, onCancelar }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function confirmar() {
    setCargando(true);
    setError('');
    try {
      await onConfirmar();
    } catch (errorConfirmar) {
      setError(obtenerMensajeDeError(errorConfirmar));
    } finally {
      setCargando(false);
    }
  }

  function cancelar() {
    if (cargando) return;
    setError('');
    onCancelar();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cancelar} statusBarTranslucent>
      <View style={styles.velo}>
        <View style={styles.tarjeta} accessibilityRole="alert">
          <View style={styles.icono}>
            <MaterialIcons name="delete-outline" size={24} color={colores.egreso} />
          </View>

          <View style={styles.textos}>
            <Text style={styles.titulo}>{titulo}</Text>
            <Text style={styles.mensaje}>{children}</Text>
          </View>

          <MensajeError mensaje={error} />

          <View style={styles.botones}>
            <Pressable
              onPress={confirmar}
              disabled={cargando}
              accessibilityRole="button"
              style={({ pressed }) => [styles.boton, styles.botonDestructivo, pressed && styles.presionado]}>
              {cargando && <ActivityIndicator color={colores.egreso} />}
              <Text style={[styles.textoBoton, { color: colores.egreso }]}>{textoConfirmar}</Text>
            </Pressable>
            <Pressable
              onPress={cancelar}
              disabled={cargando}
              accessibilityRole="button"
              style={({ pressed }) => [styles.boton, styles.botonCancelar, pressed && styles.presionado]}>
              <Text style={styles.textoBoton}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Para resaltar partes del mensaje: <Resaltado>12 movimientos</Resaltado>.
export function Resaltado({ color = colores.texto, children }) {
  return <Text style={[styles.resaltado, { color }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  velo: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: espaciado.pantallaAuth,
    backgroundColor: colores.velo,
  },
  tarjeta: {
    gap: 20,
    padding: 24,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.bordeNavbar,
  },
  icono: {
    width: 48,
    height: 48,
    borderRadius: radios.mensaje,
    backgroundColor: colores.egresoSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    gap: 10,
  },
  titulo: {
    ...tipografia.seccion,
    color: colores.texto,
  },
  mensaje: {
    fontFamily: fuentes.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colores.texto2,
  },
  resaltado: {
    fontFamily: fuentes.semibold,
  },
  botones: {
    gap: 10,
  },
  boton: {
    height: 54,
    borderRadius: radios.pildora,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  botonDestructivo: {
    backgroundColor: colores.egresoSuave,
  },
  botonCancelar: {
    backgroundColor: colores.elevado,
  },
  presionado: {
    transform: [{ scale: 0.97 }],
  },
  textoBoton: {
    fontFamily: fuentes.semibold,
    fontSize: 17,
    color: colores.texto,
  },
});

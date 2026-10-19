import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores, fuentes, radios, tipografia } from '@/theme';

// Hoja que sube desde abajo, hecha con el Modal de React Native.
// El Modal desmonta su contenido al terminar de cerrarse: el estado de adentro
// (lo escrito, errores) arranca de cero cada vez que se abre.
export default function HojaInferior({ visible, onCerrar, titulo, descripcion, botonCerrar = false, children }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.contenedor} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.velo} onPress={onCerrar} accessibilityLabel="Cerrar" />

        <View style={[styles.hoja, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.manija} />

          <View style={styles.encabezado}>
            <View style={styles.textos}>
              <Text style={styles.titulo}>{titulo}</Text>
              {descripcion && <Text style={styles.descripcion}>{descripcion}</Text>}
            </View>
            {botonCerrar && (
              <Pressable
                onPress={onCerrar}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                hitSlop={8}
                style={({ pressed }) => [styles.botonCerrar, pressed && styles.botonCerrarPresionado]}>
                <MaterialIcons name="close" size={20} color={colores.texto2} />
              </Pressable>
            )}
          </View>

          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  velo: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colores.velo,
  },
  hoja: {
    maxHeight: '88%',
    paddingTop: 10,
    paddingHorizontal: 20,
    borderTopLeftRadius: radios.hoja,
    borderTopRightRadius: radios.hoja,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colores.borde,
  },
  manija: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: radios.pildora,
    backgroundColor: colores.pistaBarra,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 18,
    paddingBottom: 16,
  },
  textos: {
    flex: 1,
    gap: 6,
  },
  titulo: {
    ...tipografia.seccion,
    color: colores.texto,
  },
  descripcion: {
    fontFamily: fuentes.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colores.texto2,
  },
  botonCerrar: {
    width: 36,
    height: 36,
    borderRadius: radios.pildora,
    backgroundColor: colores.elevado,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonCerrarPresionado: {
    opacity: 0.6,
  },
});

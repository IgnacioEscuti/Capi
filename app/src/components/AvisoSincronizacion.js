import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';
import { useSincronizacion } from '@/context/SincronizacionContext';
import { colores, espaciado, fuentes, radios, sombras } from '@/theme';

const ALTO_NAVBAR = 66;

// Aviso temporal arriba del navbar: "3 movimientos nuevos de Mercado Pago" o un error chico.
// No bloquea: los toques pasan de largo (pointerEvents="none").
export default function AvisoSincronizacion() {
  const { aviso } = useSincronizacion();
  if (!aviso) return null;

  const esError = aviso.tipo === 'error';

  return (
    <View style={styles.contenedor} pointerEvents="none">
      <View style={styles.aviso} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <MaterialIcons
          name={esError ? 'error' : 'check-circle'}
          size={22}
          color={esError ? colores.egreso : colores.ingreso}
        />
        <Text style={styles.texto} numberOfLines={2}>
          {aviso.texto}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    position: 'absolute',
    left: espaciado.pantallaAuth,
    right: espaciado.pantallaAuth,
    bottom: espaciado.navbarInferior + ALTO_NAVBAR + 12,
    alignItems: 'center',
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radios.pildora,
    backgroundColor: colores.elevado,
    borderWidth: 1,
    borderColor: colores.bordeNavbar,
    boxShadow: sombras.navbar,
  },
  texto: {
    flexShrink: 1,
    fontFamily: fuentes.medio,
    fontSize: 15,
    color: colores.texto,
  },
});

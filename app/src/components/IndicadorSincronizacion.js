import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSincronizacion } from '@/context/SincronizacionContext';
import { colores, fuentes } from '@/theme';

// "Sincronizando con Mercado Pago…" arriba de la lista.
// "oculto": mientras se desliza para actualizar ya se ve el spinner del pull to refresh.
export default function IndicadorSincronizacion({ oculto = false, style }) {
  const { sincronizando, conectado } = useSincronizacion();
  if (oculto || !sincronizando || conectado === false) return null;

  return (
    <View style={[styles.contenedor, style]} accessibilityRole="progressbar" accessibilityLabel="Sincronizando con Mercado Pago">
      <ActivityIndicator size="small" color={colores.texto2} />
      <Text style={styles.texto}>Sincronizando con Mercado Pago…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  texto: {
    fontFamily: fuentes.regular,
    fontSize: 14,
    color: colores.texto2,
  },
});

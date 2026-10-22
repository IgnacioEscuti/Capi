import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colores, fuentes, radios, sombras } from '@/theme';

export default function BotonPrimario({ titulo, tituloCargando, cargando = false, icono, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={cargando}
      accessibilityRole="button"
      accessibilityState={{ disabled: cargando, busy: cargando }}
      style={({ pressed }) => [styles.boton, pressed && styles.presionado]}>
      {cargando ? (
        <ActivityIndicator color={colores.sobreAcento} />
      ) : (
        icono && <MaterialIcons name={icono} size={22} color={colores.sobreAcento} />
      )}
      <Text style={styles.texto}>{cargando ? tituloCargando : titulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    height: 60,
    borderRadius: radios.pildora,
    backgroundColor: colores.acento,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    boxShadow: sombras.boton,
  },
  presionado: {
    transform: [{ scale: 0.97 }],
  },
  texto: {
    fontFamily: fuentes.bold,
    fontSize: 18,
    color: colores.sobreAcento,
  },
});

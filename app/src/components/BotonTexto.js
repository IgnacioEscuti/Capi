import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colores, fuentes } from '@/theme';

// Botón sin fondo: "Cancelar" de las hojas, "Borrar movimiento", "Cancelar" del formulario.
export default function BotonTexto({ titulo, onPress, icono, color = colores.texto2, disabled = false, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [styles.boton, (pressed || disabled) && styles.atenuado, style]}>
      {icono && <MaterialIcons name={icono} size={20} color={color} />}
      <Text style={[styles.texto, { color }]}>{titulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  atenuado: {
    opacity: 0.5,
  },
  texto: {
    fontFamily: fuentes.semibold,
    fontSize: 17,
  },
});

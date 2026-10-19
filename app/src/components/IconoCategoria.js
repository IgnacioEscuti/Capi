import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, View } from 'react-native';
import { colores, radios } from '@/theme';

export const ICONO_SIN_CATEGORIA = 'label-off';

// Cuadrado con el ícono de una categoría (o de "Sin categoría"), como en las filas de movimientos.
export default function IconoCategoria({ icono, color = colores.iconoMovimiento, fondo = colores.elevado }) {
  return (
    <View style={[styles.icono, { backgroundColor: fondo }]}>
      <MaterialIcons name={icono ?? ICONO_SIN_CATEGORIA} size={22} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  icono: {
    width: 42,
    height: 42,
    borderRadius: radios.icono,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

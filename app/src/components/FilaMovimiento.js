import { Pressable, StyleSheet, Text, View } from 'react-native';
import IconoCategoria from './IconoCategoria';
import { formatearFechaMovimiento, formatearPesosConSigno } from '@/utils/formato';
import { obtenerMontoConSigno, obtenerTituloMovimiento } from '@/utils/movimientos';
import { colores, fuentes, tipografia } from '@/theme';

export default function FilaMovimiento({ movimiento, onPress }) {
  const { categoria, fecha, tipo } = movimiento;
  const titulo = obtenerTituloMovimiento(movimiento);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.fila, pressed && styles.filaPresionada]}>
      <IconoCategoria icono={categoria?.icono} />
      <View style={styles.textos}>
        <Text style={styles.titulo} numberOfLines={2}>
          {titulo}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {categoria?.nombre ?? 'Sin categoría'} · {formatearFechaMovimiento(new Date(fecha))}
        </Text>
      </View>
      <Text style={[styles.monto, { color: tipo === 'income' ? colores.ingreso : colores.egreso }]}>
        {formatearPesosConSigno(obtenerMontoConSigno(movimiento))}
      </Text>
    </Pressable>
  );
}

export function SeparadorMovimientos() {
  return <View style={styles.separador} />;
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  filaPresionada: {
    backgroundColor: colores.presionado,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    ...tipografia.cuerpo,
    lineHeight: 20,
    color: colores.texto,
  },
  meta: {
    ...tipografia.meta,
    color: colores.texto3,
  },
  monto: {
    fontFamily: fuentes.semibold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  separador: {
    height: 1,
    backgroundColor: colores.borde,
    marginLeft: 72,
    marginRight: 16,
  },
});

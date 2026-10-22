import { Pressable, StyleSheet, Text, View } from 'react-native';
import IconoCategoria from './IconoCategoria';
import { formatearFechaMovimiento, formatearPesos, formatearPesosConSigno } from '@/utils/formato';
import { esInterno, NOMBRE_TIPO, obtenerMontoConSigno, obtenerTituloMovimiento } from '@/utils/movimientos';
import { colores, fuentes, tipografia } from '@/theme';

export default function FilaMovimiento({ movimiento, onPress }) {
  const { categoria, fecha, tipo } = movimiento;
  const titulo = obtenerTituloMovimiento(movimiento);
  // Movimiento interno (reserva de MP): gris y sin signo, porque no cambia el saldo.
  const interno = esInterno(movimiento);
  const subtitulo = interno ? NOMBRE_TIPO.internal : (categoria?.nombre ?? 'Sin categoría');
  const colorMonto = interno ? colores.texto2 : tipo === 'income' ? colores.ingreso : colores.egreso;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.fila, pressed && styles.filaPresionada]}>
      <IconoCategoria icono={interno ? 'savings' : categoria?.icono} />
      <View style={styles.textos}>
        <Text style={styles.titulo} numberOfLines={2}>
          {titulo}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {subtitulo} · {formatearFechaMovimiento(new Date(fecha))}
        </Text>
      </View>
      <Text style={[styles.monto, { color: colorMonto }]}>
        {interno ? formatearPesos(movimiento.monto) : formatearPesosConSigno(obtenerMontoConSigno(movimiento))}
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

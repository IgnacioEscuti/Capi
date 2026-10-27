import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';
import { colores, fuentes, radios } from '@/theme';
import { formatearNumero, formatearPesos, formatearPorcentaje } from '@/utils/formato';

// Tarjeta "Ahorro del mes" de Reportes: ahorro, tasa de ahorro, ingresos y egresos,
// comparación con el mes anterior y gasto promedio por día.
export default function ResumenMesReporte({ resumen }) {
  const { ingresos, egresos, ahorro, tasaAhorro, comparacion, gastoPromedioDiario } = resumen;
  const [ahorroEntero, ahorroCentavos] = formatearNumero(ahorro).split(',');
  const colorAhorro = ahorro > 0 ? colores.ingreso : ahorro < 0 ? colores.egreso : colores.texto;
  const signoAhorro = ahorro > 0 ? '+' : ahorro < 0 ? '−' : '';

  return (
    <View style={styles.tarjeta}>
      <Text style={styles.etiqueta}>Ahorro del mes</Text>
      <Text style={[styles.ahorro, { color: colorAhorro }]} numberOfLines={1} adjustsFontSizeToFit>
        <Text style={styles.ahorroSigno}>{signoAhorro}$ </Text>
        {ahorroEntero}
        <Text style={styles.ahorroCentavos}>,{ahorroCentavos}</Text>
      </Text>

      <View style={styles.filaTasa}>
        <Chip
          texto={tasaAhorro === null ? '—' : formatearPorcentaje(tasaAhorro, { decimalesOpcionales: true })}
          tono={tasaAhorro === null ? 'neutro' : tasaAhorro < 0 ? 'egreso' : 'ingreso'}
        />
        <Text style={styles.textoTasa}>tasa de ahorro: de lo que ingresó, quedó esa parte</Text>
      </View>

      <View style={styles.subtarjetas}>
        <Subtarjeta icono="south-west" color={colores.ingreso} etiqueta="Ingresos" monto={ingresos} />
        <Subtarjeta icono="north-east" color={colores.egreso} etiqueta="Egresos" monto={egresos} />
      </View>

      <View style={styles.separador} />

      <View style={styles.fila}>
        <Text style={styles.textoComparacion}>
          {comparacion.tipo === 'mismo_dia' ? 'A esta altura del mes pasado llevabas gastado ' : 'El mes anterior gastaste '}
          {/* Espacio que no corta ( ): si el texto salta de línea, "$" no queda separado del número. */}
          <Text style={styles.resaltado}>
            {formatearPesos(comparacion.egresosAnteriores, { decimalesOpcionales: true }).replace(' ', ' ')}
          </Text>
        </Text>
        {/* Sin gastos el mes anterior no hay contra qué comparar: no se muestra el chip. */}
        {comparacion.variacion !== null && <ChipVariacion variacion={comparacion.variacion} />}
      </View>

      <View style={styles.separador} />

      <View style={styles.fila}>
        <Text style={styles.textoFila}>Gasto promedio por día</Text>
        <Text style={styles.montoFila}>
          {formatearPesos(Math.round(gastoPromedioDiario), { decimalesOpcionales: true })}
        </Text>
      </View>
    </View>
  );
}

function Subtarjeta({ icono, color, etiqueta, monto }) {
  return (
    <View style={styles.subtarjeta}>
      <View style={styles.etiquetaSubtarjeta}>
        <MaterialIcons name={icono} size={18} color={color} />
        <Text style={styles.etiqueta}>{etiqueta}</Text>
      </View>
      <Text style={styles.montoSubtarjeta} numberOfLines={1} adjustsFontSizeToFit>
        {formatearPesos(monto, { decimalesOpcionales: true })}
      </Text>
    </View>
  );
}

// Más gasto que el mes anterior → flecha arriba en rojo; menos → flecha abajo en verde; igual → gris.
function ChipVariacion({ variacion }) {
  const tono = variacion > 0 ? 'egreso' : variacion < 0 ? 'ingreso' : 'neutro';
  const icono = variacion > 0 ? 'arrow-upward' : variacion < 0 ? 'arrow-downward' : null;
  return <Chip texto={formatearPorcentaje(Math.abs(variacion), { decimalesOpcionales: true })} tono={tono} icono={icono} />;
}

const TONOS = {
  ingreso: { fondo: colores.ingresoSuave, texto: colores.ingreso },
  egreso: { fondo: colores.egresoSuave, texto: colores.egreso },
  neutro: { fondo: colores.elevado, texto: colores.texto2 },
};

function Chip({ texto, tono, icono }) {
  const { fondo, texto: color } = TONOS[tono];
  return (
    <View style={[styles.chip, { backgroundColor: fondo }]}>
      {icono && <MaterialIcons name={icono} size={16} color={color} />}
      <Text style={[styles.textoChip, { color }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    gap: 14,
    padding: 20,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  etiqueta: {
    fontFamily: fuentes.regular,
    fontSize: 15,
    color: colores.texto2,
  },
  ahorro: {
    fontFamily: fuentes.bold,
    fontSize: 48,
    letterSpacing: -1.6,
    fontVariant: ['tabular-nums'],
    marginTop: -6,
  },
  ahorroSigno: {
    fontFamily: fuentes.semibold,
    fontSize: 26,
    letterSpacing: 0,
  },
  ahorroCentavos: {
    fontFamily: fuentes.semibold,
    fontSize: 24,
    letterSpacing: 0,
    opacity: 0.6,
  },
  filaTasa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textoTasa: {
    flex: 1,
    fontFamily: fuentes.regular,
    fontSize: 14,
    lineHeight: 19,
    color: colores.texto2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radios.iconoCampo,
  },
  textoChip: {
    fontFamily: fuentes.semibold,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  subtarjetas: {
    flexDirection: 'row',
    gap: 10,
  },
  subtarjeta: {
    flex: 1,
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: radios.mensaje,
    backgroundColor: colores.elevado,
  },
  etiquetaSubtarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  montoSubtarjeta: {
    fontFamily: fuentes.semibold,
    fontSize: 20,
    letterSpacing: -0.2,
    color: colores.texto,
    fontVariant: ['tabular-nums'],
  },
  separador: {
    height: 1,
    backgroundColor: colores.borde,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textoComparacion: {
    flex: 1,
    fontFamily: fuentes.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colores.texto,
  },
  resaltado: {
    fontFamily: fuentes.semibold,
    fontVariant: ['tabular-nums'],
  },
  textoFila: {
    flex: 1,
    fontFamily: fuentes.regular,
    fontSize: 15,
    color: colores.texto,
  },
  montoFila: {
    fontFamily: fuentes.semibold,
    fontSize: 20,
    color: colores.texto,
    fontVariant: ['tabular-nums'],
  },
});

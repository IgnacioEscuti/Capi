import { StyleSheet, Text, View } from 'react-native';
import { colores, fuentes, radios, tipografia } from '@/theme';
import { formatearPesos, obtenerIniciales } from '@/utils/formato';

const TEXTO_SIN_REGLAS =
  'Todavía no nombraste a nadie. Abrí una transferencia de Mercado Pago y poné el nombre de la persona para verla acá.';

// Tarjeta del final de Reportes: a quién se le transfirió más y de quién se recibió más en el mes
// (solo personas con regla, con el nombre de la regla).
export default function TopPersonasReporte({ personas }) {
  const { tieneReglas, transferidos, recibidos } = personas;

  return (
    <View style={styles.tarjeta}>
      <Lista
        titulo="A quién le transferiste más"
        filas={transferidos}
        tieneReglas={tieneReglas}
        textoVacio="Sin transferencias este mes"
        signo="−"
        color={colores.egreso}
      />
      <View style={styles.separador} />
      <Lista
        titulo="De quién recibiste más"
        filas={recibidos}
        tieneReglas={tieneReglas}
        textoVacio="Sin ingresos de personas este mes"
        signo="+"
        color={colores.ingreso}
      />
    </View>
  );
}

function Lista({ titulo, filas, tieneReglas, textoVacio, signo, color }) {
  return (
    <View style={styles.lista}>
      <Text style={styles.titulo}>{titulo}</Text>
      {!tieneReglas ? (
        <Text style={styles.texto}>{TEXTO_SIN_REGLAS}</Text>
      ) : filas.length === 0 ? (
        <Text style={styles.texto}>{textoVacio}</Text>
      ) : (
        filas.map((persona) => (
          <View key={persona.id} style={styles.fila}>
            <View style={styles.avatar}>
              <Text style={styles.iniciales}>{obtenerIniciales(persona.nombre)}</Text>
            </View>
            <Text style={styles.nombre} numberOfLines={1}>
              {persona.nombre}
            </Text>
            <Text style={[styles.monto, { color }]}>
              {signo}
              {formatearPesos(persona.monto, { decimalesOpcionales: true })}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    gap: 20,
    padding: 20,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  lista: {
    gap: 6,
  },
  titulo: {
    fontFamily: fuentes.semibold,
    fontSize: 19,
    color: colores.texto,
    marginBottom: 6,
  },
  texto: {
    fontFamily: fuentes.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colores.texto2,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radios.pildora,
    backgroundColor: colores.elevado,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciales: {
    fontFamily: fuentes.semibold,
    fontSize: 12,
    color: colores.texto2,
  },
  nombre: {
    ...tipografia.cuerpo,
    flex: 1,
    color: colores.texto,
  },
  monto: {
    fontFamily: fuentes.semibold,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  separador: {
    height: 1,
    backgroundColor: colores.borde,
  },
});

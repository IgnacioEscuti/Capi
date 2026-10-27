import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { colores, fuentes, radios, tipografia } from '@/theme';
import { formatearMesCorto, formatearNumeroCorto } from '@/utils/formato';
import { calcularTopeEje, fechaDeMes } from '@/utils/reportes';

const ALTO_GRAFICO = 150;
const ANCHO_EJE_Y = 40;
// Los meses que no son el elegido van con el verde y el rojo al 40% (sufijo de opacidad en hex).
const OPACIDAD_APAGADA = '66';

// Tarjeta "Ingresos vs egresos": barras agrupadas (verde y rojo) de los 6 meses que terminan
// en el mes elegido, que va resaltado.
export default function GraficoIngresosEgresos({ meses, mesElegido }) {
  return (
    <View style={styles.tarjeta}>
      <View style={styles.encabezado}>
        <Text style={styles.titulo}>Ingresos vs egresos</Text>
        <View style={styles.leyenda}>
          <Referencia color={colores.ingreso} texto="Ingresos" />
          <Referencia color={colores.egreso} texto="Egresos" />
        </View>
      </View>
      <Text style={styles.subtitulo}>Últimos 6 meses</Text>
      <Barras meses={meses} mesElegido={mesElegido} />
    </View>
  );
}

function Referencia({ color, texto }) {
  return (
    <View style={styles.referencia}>
      <View style={[styles.cuadradito, { backgroundColor: color }]} />
      <Text style={styles.textoReferencia}>{texto}</Text>
    </View>
  );
}

function Barras({ meses, mesElegido }) {
  // El ancho se conoce recién al dibujar la tarjeta (depende de la pantalla).
  const [ancho, setAncho] = useState(0);
  const anchoBarras = ancho - ANCHO_EJE_Y;
  // Cada mes tiene el mismo lugar: dos barras pegadas (con una separación chica) y aire a los costados.
  const lugar = anchoBarras / meses.length;
  const anchoBarra = lugar * 0.24;
  const separacionInterna = lugar * 0.06;
  const separacionEntreMeses = lugar - anchoBarra * 2 - separacionInterna;

  // Con el neto de Sueldo los ingresos pueden dar negativos: en el gráfico se dibujan en 0.
  const tope = calcularTopeEje(Math.max(...meses.flatMap((m) => [m.ingresos, m.egresos])));

  const barras = meses.flatMap(({ mes, ingresos, egresos }) => {
    const sufijo = mes === mesElegido ? '' : OPACIDAD_APAGADA;
    return [
      { value: Math.max(ingresos, 0), frontColor: `${colores.ingreso}${sufijo}`, spacing: separacionInterna },
      { value: Math.max(egresos, 0), frontColor: `${colores.egreso}${sufijo}` },
    ];
  });

  return (
    <View onLayout={(evento) => setAncho(evento.nativeEvent.layout.width)}>
      {ancho > 0 && (
        <>
          <BarChart
            data={barras}
            width={anchoBarras}
            height={ALTO_GRAFICO}
            maxValue={tope}
            noOfSections={2}
            // De abajo hacia arriba: 0, la mitad y el tope ("750k", "1,5M").
            yAxisLabelTexts={['0', formatearNumeroCorto(tope / 2), formatearNumeroCorto(tope)]}
            yAxisLabelWidth={ANCHO_EJE_Y}
            yAxisTextStyle={styles.textoEje}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={colores.borde}
            rulesType="solid"
            rulesColor={colores.borde}
            barWidth={anchoBarra}
            spacing={separacionEntreMeses}
            initialSpacing={separacionEntreMeses / 2}
            endSpacing={separacionEntreMeses / 2}
            barBorderTopLeftRadius={5}
            barBorderTopRightRadius={5}
            // Los nombres de los meses van abajo, en una fila propia (para la píldora del mes elegido).
            xAxisLabelsHeight={0}
            disableScroll
            disablePress
          />
          <View style={[styles.meses, { marginLeft: ANCHO_EJE_Y }]}>
            {meses.map(({ mes }) => {
              const elegido = mes === mesElegido;
              return (
                <View key={mes} style={[styles.celdaMes, { width: lugar }]}>
                  <Text style={[styles.mes, elegido && styles.mesElegido]}>{formatearMesCorto(fechaDeMes(mes))}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    gap: 4,
    padding: 20,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titulo: {
    fontFamily: fuentes.semibold,
    fontSize: 19,
    color: colores.texto,
    flexShrink: 1,
  },
  leyenda: {
    flexDirection: 'row',
    gap: 12,
  },
  referencia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cuadradito: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  textoReferencia: {
    ...tipografia.meta,
    color: colores.texto2,
  },
  subtitulo: {
    ...tipografia.meta,
    color: colores.texto2,
    marginBottom: 16,
  },
  textoEje: {
    ...tipografia.meta,
    fontSize: 12,
    color: colores.texto3,
  },
  meses: {
    flexDirection: 'row',
    marginTop: 8,
  },
  celdaMes: {
    alignItems: 'center',
  },
  mes: {
    ...tipografia.meta,
    color: colores.texto3,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  mesElegido: {
    fontFamily: fuentes.bold,
    color: colores.texto,
    backgroundColor: colores.segmentoActivo,
    borderRadius: radios.iconoCampo,
    overflow: 'hidden',
  },
});

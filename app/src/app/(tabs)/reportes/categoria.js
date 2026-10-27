import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BotonTexto from '@/components/BotonTexto';
import { ICONO_SIN_CATEGORIA } from '@/components/IconoCategoria';
import FilaMovimiento, { SeparadorMovimientos } from '@/components/FilaMovimiento';
import MensajeError from '@/components/MensajeError';
import Resplandor from '@/components/Resplandor';
import { useSincronizacion } from '@/context/SincronizacionContext';
import { useDatosAlEnfocar } from '@/hooks/useDatosAlEnfocar';
import { obtenerDetalleCategoria } from '@/services/reporte.service';
import { colores, espaciado, fuentes, radios, tipografia } from '@/theme';
import {
  formatearMes,
  formatearMesAnio,
  formatearMesCorto,
  formatearNumero,
  formatearPesosCorto,
  formatearPorcentaje,
} from '@/utils/formato';
import { abrirFormularioMovimiento } from '@/utils/navegacion';
import { calcularPorcentaje, colorDeCategoria, fechaDeMes, nombreDeCategoria } from '@/utils/reportes';

const ALTO_GRAFICO = 150;
// Las barras de los otros meses van con el color de la categoría al 35% (sufijo de opacidad en hex).
const OPACIDAD_APAGADA = '59';
const ANCHO_ETIQUETA_MONTO = 70;

export default function DetalleCategoriaScreen() {
  const insets = useSafeAreaInsets();
  const { version } = useSincronizacion();
  // id: el de la categoría o "sin-categoria"; mes: "2026-10".
  const { id, mes } = useLocalSearchParams();
  const pedirDetalle = useCallback(() => obtenerDetalleCategoria(id, mes), [id, mes]);
  const { datos: detalle, error } = useDatosAlEnfocar(pedirDetalle, version);

  return (
    <View style={styles.pantalla}>
      <Resplandor />
      <ScrollView
        contentContainerStyle={[styles.contenido, { paddingTop: insets.top + 4 }]}
        showsVerticalScrollIndicator={false}>
        <BotonTexto
          titulo="Reportes"
          icono="chevron-left"
          color={colores.acento}
          onPress={() => router.back()}
          style={styles.volver}
        />

        <MensajeError mensaje={error} />

        {detalle ? (
          <Detalle detalle={detalle} />
        ) : (
          !error && <ActivityIndicator color={colores.texto2} style={styles.cargando} />
        )}
      </ScrollView>
    </View>
  );
}

function Detalle({ detalle }) {
  const { mes, categoria, total, cantidad, totalGastado, meses, movimientos } = detalle;
  const fecha = fechaDeMes(mes);
  const [totalEntero, totalCentavos] = formatearNumero(total).split(',');

  return (
    <>
      <View style={styles.encabezado}>
        <View style={styles.iconoGrande}>
          <MaterialIcons name={categoria?.icono ?? ICONO_SIN_CATEGORIA} size={30} color={colores.texto} />
        </View>
        <View style={styles.textosEncabezado}>
          <Text style={styles.titulo} numberOfLines={2}>
            {nombreDeCategoria(categoria)}
          </Text>
          <Text style={styles.subtitulo}>{formatearMesAnio(fecha)}</Text>
        </View>
      </View>

      <View style={[styles.tarjeta, styles.tarjetaTotal]}>
        <Text style={styles.etiqueta}>Total del mes</Text>
        <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
          <Text style={styles.totalSigno}>$ </Text>
          {totalEntero}
          <Text style={styles.totalCentavos}>,{totalCentavos}</Text>
        </Text>
        <Text style={styles.etiqueta}>
          {formatearPorcentaje(calcularPorcentaje(total, totalGastado))} de tus gastos · {cantidad}{' '}
          {cantidad === 1 ? 'movimiento' : 'movimientos'}
        </Text>
      </View>

      <View style={[styles.tarjeta, styles.tarjetaGrafico]}>
        <Text style={styles.tituloTarjeta}>Últimos 12 meses</Text>
        <GraficoMeses meses={meses} mesElegido={mes} color={colorDeCategoria(categoria)} />
      </View>

      <Text style={styles.tituloSeccion}>Movimientos de {formatearMes(fecha)}</Text>
      <View style={[styles.tarjeta, styles.listaMovimientos]}>
        {movimientos.length === 0 ? (
          <Text style={styles.sinMovimientos}>No hay gastos en {formatearMes(fecha)}.</Text>
        ) : (
          movimientos.map((movimiento, indice) => (
            <Fragment key={movimiento.id}>
              {indice > 0 && <SeparadorMovimientos />}
              <FilaMovimiento movimiento={movimiento} onPress={() => abrirFormularioMovimiento(movimiento)} />
            </Fragment>
          ))
        )}
      </View>
    </>
  );
}

// 12 barras que ocupan todo el ancho de la tarjeta: el mes elegido con el color
// de la categoría y su monto arriba; los demás, apagados.
function GraficoMeses({ meses, mesElegido, color }) {
  // El ancho se conoce recién al dibujar la tarjeta (depende de la pantalla).
  const [ancho, setAncho] = useState(0);
  const lugar = ancho / meses.length;
  const anchoBarra = lugar * 0.55;
  const separacion = lugar - anchoBarra;
  // Un poco de aire arriba de la barra más alta para la etiqueta del monto.
  const maximo = Math.max(...meses.map((m) => m.total)) * 1.2 || 1;

  const barras = meses.map(({ mes, total }) => {
    const elegido = mes === mesElegido;
    return {
      value: total,
      frontColor: elegido ? color : `${color}${OPACIDAD_APAGADA}`,
      label: formatearMesCorto(fechaDeMes(mes)),
      labelTextStyle: elegido ? styles.mesElegido : styles.mes,
      topLabelComponent: elegido && total > 0 ? () => <EtiquetaMonto total={total} /> : undefined,
      // gifted-charts le da a la etiqueta el ancho de la barra: se agranda hacia la izquierda,
      // así el monto queda alineado con el borde derecho de la barra y no se corta en el último mes.
      topLabelContainerStyle: { width: ANCHO_ETIQUETA_MONTO, left: anchoBarra - ANCHO_ETIQUETA_MONTO },
    };
  });

  return (
    <View style={styles.grafico} onLayout={(evento) => setAncho(evento.nativeEvent.layout.width)}>
      {ancho > 0 && (
        <BarChart
          data={barras}
          width={ancho}
          height={ALTO_GRAFICO}
          maxValue={maximo}
          barWidth={anchoBarra}
          spacing={separacion}
          initialSpacing={separacion / 2}
          endSpacing={separacion / 2}
          barBorderTopLeftRadius={6}
          barBorderTopRightRadius={6}
          yAxisLabelWidth={0}
          hideYAxisText
          yAxisThickness={0}
          xAxisThickness={0}
          hideRules
          disableScroll
          disablePress
        />
      )}
    </View>
  );
}

function EtiquetaMonto({ total }) {
  return (
    <Text style={styles.etiquetaMonto} numberOfLines={1}>
      {formatearPesosCorto(total)}
    </Text>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  contenido: {
    gap: 16,
    paddingHorizontal: espaciado.pantalla,
    paddingBottom: espaciado.debajoDelNavbar,
  },
  volver: {
    alignSelf: 'flex-start',
    gap: 2,
  },
  cargando: {
    paddingTop: 80,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  iconoGrande: {
    width: 60,
    height: 60,
    borderRadius: radios.logo,
    backgroundColor: colores.elevado,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textosEncabezado: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    fontFamily: fuentes.bold,
    fontSize: 32,
    letterSpacing: -0.7,
    color: colores.texto,
  },
  subtitulo: {
    fontFamily: fuentes.regular,
    fontSize: 17,
    color: colores.texto2,
  },
  tarjeta: {
    borderRadius: radios.tarjeta,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  tarjetaTotal: {
    gap: 6,
    padding: 22,
  },
  etiqueta: {
    fontFamily: fuentes.regular,
    fontSize: 15,
    color: colores.texto2,
  },
  total: {
    ...tipografia.tituloGrande,
    color: colores.texto,
    fontVariant: ['tabular-nums'],
  },
  totalSigno: {
    fontFamily: fuentes.semibold,
    fontSize: 24,
    letterSpacing: 0,
    color: colores.texto2,
  },
  totalCentavos: {
    fontFamily: fuentes.semibold,
    fontSize: 22,
    letterSpacing: 0,
    color: colores.textoAtenuado,
  },
  tarjetaGrafico: {
    gap: 16,
    padding: 22,
  },
  tituloTarjeta: {
    fontFamily: fuentes.semibold,
    fontSize: 19,
    color: colores.texto,
  },
  grafico: {
    width: '100%',
  },
  mes: {
    ...tipografia.meta,
    color: colores.texto3,
  },
  mesElegido: {
    fontFamily: fuentes.bold,
    fontSize: 13,
    color: colores.texto,
  },
  etiquetaMonto: {
    fontFamily: fuentes.semibold,
    fontSize: 12,
    color: colores.texto,
    marginBottom: 6,
    alignSelf: 'stretch',
    textAlign: 'right',
  },
  tituloSeccion: {
    ...tipografia.seccion,
    color: colores.texto,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  listaMovimientos: {
    paddingVertical: 4,
    overflow: 'hidden',
  },
  sinMovimientos: {
    fontFamily: fuentes.regular,
    fontSize: 14,
    color: colores.texto3,
    padding: 20,
    textAlign: 'center',
  },
});

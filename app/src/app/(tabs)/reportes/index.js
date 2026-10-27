import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useScrollToTop } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GraficoIngresosEgresos from '@/components/GraficoIngresosEgresos';
import IconoCategoria from '@/components/IconoCategoria';
import MensajeError from '@/components/MensajeError';
import Resplandor from '@/components/Resplandor';
import ResumenMesReporte from '@/components/ResumenMesReporte';
import TopPersonasReporte from '@/components/TopPersonasReporte';
import { useSincronizacion } from '@/context/SincronizacionContext';
import { useDatosAlEnfocar } from '@/hooks/useDatosAlEnfocar';
import { obtenerReporteDelMes } from '@/services/reporte.service';
import { colores, espaciado, fuentes, radios, tipografia } from '@/theme';
import { formatearMes, formatearMesAnio, formatearPesos, formatearPorcentaje } from '@/utils/formato';
import {
  abrirDetalleCategoria,
  calcularPorcentaje,
  colorDeCategoria,
  fechaDeMes,
  mesActual,
  nombreDeCategoria,
  sumarMeses,
} from '@/utils/reportes';

const RADIO_DONA = 92;
const RADIO_INTERNO_DONA = 74;
// Dona vacía (mes sin gastos): anillo punteado hecho con porciones iguales separadas.
const PORCIONES_DONA_VACIA = Array.from({ length: 36 }, () => ({ value: 1, color: colores.pistaBarra }));

export default function ReportesScreen() {
  const insets = useSafeAreaInsets();
  const { version } = useSincronizacion();
  const [mes, setMes] = useState(mesActual);
  // Una función nueva solo cuando cambia el mes: así useDatosAlEnfocar vuelve a pedir los datos.
  const pedirReporte = useCallback(() => obtenerReporteDelMes(mes), [mes]);
  const { datos, error } = useDatosAlEnfocar(pedirReporte, version);
  // Mientras llega el mes nuevo no se muestran los datos del anterior con el título cambiado.
  const reporte = datos?.mes === mes ? datos : null;
  // Tocar la pestaña Reportes estando en ella lleva la pantalla arriba de todo.
  const refScroll = useRef(null);
  useScrollToTop(refScroll);

  return (
    <View style={styles.pantalla}>
      <Resplandor />
      <ScrollView
        ref={refScroll}
        contentContainerStyle={[styles.contenido, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.titulo}>Reportes</Text>

        <SelectorMes mes={mes} onCambiar={setMes} />

        <MensajeError mensaje={error} />

        {reporte === null ? (
          !error && <ActivityIndicator color={colores.texto2} style={styles.cargando} />
        ) : reporte.gastos.cantidadMovimientos === 0 ? (
          <EstadoVacio mes={mes} />
        ) : (
          <>
            <ResumenMesReporte resumen={reporte.resumen} />
            <GastosPorCategoria reporte={reporte.gastos} />
            <GraficoIngresosEgresos meses={reporte.resumen.meses} mesElegido={mes} />
            <TopPersonasReporte personas={reporte.personas} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ‹ Octubre 2026 ›. No deja pasar del mes actual.
function SelectorMes({ mes, onCambiar }) {
  const esMesActual = mes >= mesActual();

  return (
    <View style={styles.selector}>
      <BotonMes icono="chevron-left" etiqueta="Mes anterior" onPress={() => onCambiar(sumarMeses(mes, -1))} />
      <Text style={styles.textoMes}>{formatearMesAnio(fechaDeMes(mes))}</Text>
      <BotonMes
        icono="chevron-right"
        etiqueta="Mes siguiente"
        disabled={esMesActual}
        onPress={() => onCambiar(sumarMeses(mes, 1))}
      />
    </View>
  );
}

function BotonMes({ icono, etiqueta, disabled = false, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => [styles.botonMes, disabled && styles.botonMesDeshabilitado, pressed && styles.presionado]}>
      <MaterialIcons name={icono} size={26} color={disabled ? colores.texto3 : colores.texto} />
    </Pressable>
  );
}

function EstadoVacio({ mes }) {
  const fecha = fechaDeMes(mes);

  return (
    <View style={styles.vacio}>
      <View style={styles.iconoVacio}>
        <MaterialIcons name="bar-chart" size={36} color={colores.texto2} />
      </View>
      <Text style={styles.tituloVacio}>
        No hay movimientos en {formatearMes(fecha)} {fecha.getFullYear()}
      </Text>
      <Text style={styles.textoVacio}>
        Cuando haya ingresos o gastos en este mes, vas a ver acá tu resumen, tus categorías y a quién le
        transferiste.
      </Text>
    </View>
  );
}

function GastosPorCategoria({ reporte }) {
  const { mes, totalGastado, categorias } = reporte;
  const sinGastos = categorias.length === 0;
  // Las barras se miden contra la categoría más grande (la primera): esa ocupa todo el ancho.
  const mayor = categorias[0]?.total ?? 0;

  return (
    <View style={[styles.tarjeta, styles.tarjetaGastos]}>
      <Text style={styles.tituloTarjeta}>Gastos por categoría</Text>

      <View style={styles.dona}>
        <PieChart
          donut
          radius={RADIO_DONA}
          innerRadius={RADIO_INTERNO_DONA}
          innerCircleColor={colores.tarjeta}
          // El borde del color de la tarjeta separa las porciones.
          strokeColor={colores.tarjeta}
          strokeWidth={sinGastos ? 4 : 2}
          data={
            sinGastos
              ? PORCIONES_DONA_VACIA
              : categorias.map((fila) => ({ value: fila.total, color: colorDeCategoria(fila.categoria) }))
          }
          centerLabelComponent={() => (
            <View style={styles.centroDona}>
              <Text style={styles.etiquetaTotal}>Total gastado</Text>
              <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
                {formatearPesos(totalGastado, { decimalesOpcionales: true })}
              </Text>
            </View>
          )}
        />
      </View>

      {sinGastos ? (
        <Text style={styles.textoSinGastos}>
          No registraste gastos en {formatearMes(fechaDeMes(mes))}. Cuando gastes, vas a ver acá en qué se fue la
          plata.
        </Text>
      ) : (
        <View style={styles.ranking}>
          {categorias.map((fila) => (
            <FilaRanking
              key={fila.categoria?.id ?? 'sin-categoria'}
              fila={fila}
              porcentaje={calcularPorcentaje(fila.total, totalGastado)}
              anchoBarra={calcularPorcentaje(fila.total, mayor)}
              onPress={() => abrirDetalleCategoria(fila.categoria, mes)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function FilaRanking({ fila, porcentaje, anchoBarra, onPress }) {
  const { categoria, total } = fila;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.fila, pressed && styles.presionado]}>
      <IconoCategoria icono={categoria?.icono} />
      <View style={styles.datosFila}>
        <View style={styles.lineaFila}>
          <Text style={[styles.nombre, !categoria && styles.nombreSinCategoria]} numberOfLines={1}>
            {nombreDeCategoria(categoria)}
          </Text>
          <Text style={styles.monto}>{formatearPesos(total, { decimalesOpcionales: true })}</Text>
        </View>
        <View style={styles.lineaFila}>
          <View style={styles.pistaBarra}>
            <View
              style={[styles.barra, { width: `${anchoBarra}%`, backgroundColor: colorDeCategoria(categoria) }]}
            />
          </View>
          <Text style={styles.porcentaje}>{formatearPorcentaje(porcentaje)}</Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={colores.texto3} />
    </Pressable>
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
  titulo: {
    ...tipografia.titulo,
    color: colores.texto,
    paddingHorizontal: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  botonMes: {
    width: 52,
    height: 46,
    borderRadius: radios.mensaje,
    backgroundColor: colores.elevado,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonMesDeshabilitado: {
    backgroundColor: 'transparent',
  },
  textoMes: {
    flex: 1,
    fontFamily: fuentes.semibold,
    fontSize: 18,
    color: colores.texto,
    textAlign: 'center',
  },
  presionado: {
    backgroundColor: colores.presionado,
  },
  cargando: {
    paddingTop: 80,
  },
  vacio: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 120,
    paddingHorizontal: 24,
  },
  iconoVacio: {
    width: 84,
    height: 84,
    marginBottom: 12,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloVacio: {
    fontFamily: fuentes.bold,
    fontSize: 21,
    color: colores.texto,
    textAlign: 'center',
  },
  textoVacio: {
    fontFamily: fuentes.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colores.texto2,
    textAlign: 'center',
  },
  tarjeta: {
    borderRadius: radios.tarjeta,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  tarjetaGastos: {
    paddingTop: 20,
    paddingBottom: 12,
  },
  tituloTarjeta: {
    fontFamily: fuentes.semibold,
    fontSize: 19,
    color: colores.texto,
    paddingHorizontal: 20,
  },
  dona: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
  },
  centroDona: {
    alignItems: 'center',
    gap: 2,
    width: RADIO_INTERNO_DONA * 2 - 16,
  },
  etiquetaTotal: {
    ...tipografia.meta,
    color: colores.texto2,
  },
  total: {
    fontFamily: fuentes.bold,
    fontSize: 22,
    letterSpacing: -0.4,
    color: colores.texto,
    fontVariant: ['tabular-nums'],
  },
  textoSinGastos: {
    fontFamily: fuentes.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colores.texto2,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  ranking: {
    paddingTop: 4,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingLeft: 20,
    paddingRight: 12,
  },
  datosFila: {
    flex: 1,
    gap: 8,
  },
  lineaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nombre: {
    ...tipografia.cuerpo,
    flex: 1,
    color: colores.texto,
  },
  nombreSinCategoria: {
    color: colores.texto2,
  },
  monto: {
    fontFamily: fuentes.semibold,
    fontSize: 15,
    color: colores.texto,
    fontVariant: ['tabular-nums'],
  },
  pistaBarra: {
    flex: 1,
    height: 6,
    borderRadius: radios.pildora,
    backgroundColor: colores.elevado,
    overflow: 'hidden',
  },
  barra: {
    height: '100%',
    borderRadius: radios.pildora,
  },
  porcentaje: {
    ...tipografia.meta,
    minWidth: 44,
    textAlign: 'right',
    color: colores.texto3,
    fontVariant: ['tabular-nums'],
  },
});

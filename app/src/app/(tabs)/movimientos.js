import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Fragment } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FilaMovimiento, { SeparadorMovimientos } from '@/components/FilaMovimiento';
import MensajeError from '@/components/MensajeError';
import Resplandor from '@/components/Resplandor';
import { useDatosAlEnfocar } from '@/hooks/useDatosAlEnfocar';
import { listarMovimientos } from '@/services/movimiento.service';
import { colores, espaciado, fuentes, radios, tipografia } from '@/theme';
import { agruparPorMes } from '@/utils/movimientos';
import { abrirFormularioMovimiento } from '@/utils/navegacion';

export default function MovimientosScreen() {
  const insets = useSafeAreaInsets();
  const { datos: movimientos, error } = useDatosAlEnfocar(listarMovimientos);
  const grupos = movimientos ? agruparPorMes(movimientos) : [];

  return (
    <View style={styles.pantalla}>
      <Resplandor />
      {/* Cada ítem de la lista es un mes entero (su tarjeta con todas las filas). */}
      <FlatList
        data={grupos}
        keyExtractor={(grupo) => grupo.clave}
        renderItem={({ item }) => <GrupoMes grupo={item} />}
        contentContainerStyle={[styles.contenido, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.encabezado}>
            <Text style={styles.titulo}>Movimientos</Text>
            <MensajeError mensaje={error} />
          </View>
        }
        ListEmptyComponent={
          movimientos ? <EstadoVacio /> : !error && <ActivityIndicator color={colores.texto2} style={styles.cargando} />
        }
      />
    </View>
  );
}

function GrupoMes({ grupo }) {
  const cantidad = grupo.movimientos.length;

  return (
    <View style={styles.grupo}>
      <View style={styles.encabezadoGrupo}>
        <Text style={styles.tituloGrupo}>{grupo.titulo}</Text>
        <Text style={styles.cantidadGrupo}>
          {cantidad} {cantidad === 1 ? 'movimiento' : 'movimientos'}
        </Text>
      </View>
      <View style={styles.tarjeta}>
        {grupo.movimientos.map((movimiento, indice) => (
          <Fragment key={movimiento.id}>
            {indice > 0 && <SeparadorMovimientos />}
            <FilaMovimiento movimiento={movimiento} onPress={() => abrirFormularioMovimiento(movimiento)} />
          </Fragment>
        ))}
      </View>
    </View>
  );
}

function EstadoVacio() {
  return (
    <View style={styles.vacio}>
      <View style={styles.iconoVacio}>
        <MaterialIcons name="receipt-long" size={36} color={colores.texto2} />
      </View>
      <Text style={styles.tituloVacio}>Todavía no hay movimientos</Text>
      <Text style={styles.textoVacio}>
        Tocá el <Text style={styles.mas}>+</Text> para cargar el primero. Los de Mercado Pago van a aparecer acá
        solos.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  contenido: {
    paddingHorizontal: espaciado.pantalla,
    paddingBottom: espaciado.debajoDelNavbar,
  },
  encabezado: {
    gap: 16,
    paddingBottom: 12,
  },
  titulo: {
    ...tipografia.titulo,
    color: colores.texto,
    paddingHorizontal: 8,
  },
  grupo: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  encabezadoGrupo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  tituloGrupo: {
    fontFamily: fuentes.semibold,
    fontSize: 15,
    color: colores.texto2,
  },
  cantidadGrupo: {
    ...tipografia.meta,
    color: colores.texto3,
  },
  tarjeta: {
    paddingVertical: 4,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    overflow: 'hidden',
  },
  cargando: {
    paddingTop: 80,
  },
  // FlatList no estira el componente vacío: se centra con un padding fijo.
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
  mas: {
    fontFamily: fuentes.bold,
    color: colores.acento,
  },
});

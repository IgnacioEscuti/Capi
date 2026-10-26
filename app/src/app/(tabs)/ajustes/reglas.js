import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Fragment } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BotonTexto from '@/components/BotonTexto';
import IconoCategoria from '@/components/IconoCategoria';
import MensajeError from '@/components/MensajeError';
import Resplandor from '@/components/Resplandor';
import { useDatosAlEnfocar } from '@/hooks/useDatosAlEnfocar';
import { listarReglas } from '@/services/regla.service';
import { colores, espaciado, fuentes, radios, tipografia } from '@/theme';
import { abrirEditarRegla, textoOrigen } from '@/utils/reglas';

export default function ReglasScreen() {
  const insets = useSafeAreaInsets();
  // Recarga al volver de Editar regla (guardar o borrar).
  const { datos: reglas, error } = useDatosAlEnfocar(listarReglas);
  const vacia = reglas?.length === 0;

  return (
    <View style={styles.pantalla}>
      <Resplandor />
      <ScrollView
        contentContainerStyle={[styles.contenido, { paddingTop: insets.top + 4 }, vacia && styles.contenidoVacio]}
        showsVerticalScrollIndicator={false}>
        <BotonTexto
          titulo="Ajustes"
          icono="chevron-left"
          color={colores.acento}
          onPress={() => router.back()}
          style={styles.volver}
        />

        <View style={styles.encabezado}>
          <Text style={styles.titulo}>Reglas</Text>
          {!vacia && (
            <Text style={styles.subtitulo}>Los movimientos nuevos de estas personas se cargan con su nombre y categoría.</Text>
          )}
        </View>

        <MensajeError mensaje={error} />

        {reglas === null ? (
          !error && <ActivityIndicator color={colores.texto2} style={styles.cargando} />
        ) : vacia ? (
          <EstadoVacio />
        ) : (
          <View style={styles.tarjeta}>
            {reglas.map((regla, indice) => (
              <Fragment key={regla.id}>
                {indice > 0 && <View style={styles.separador} />}
                <FilaRegla regla={regla} />
              </Fragment>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function FilaRegla({ regla }) {
  return (
    <Pressable
      onPress={() => abrirEditarRegla(regla.id)}
      accessibilityRole="button"
      accessibilityLabel={`${regla.nombre}, ${textoOrigen(regla)}, ${regla.categoria.nombre}`}
      style={({ pressed }) => [styles.fila, pressed && styles.filaPresionada]}>
      <View style={styles.textos}>
        <Text style={styles.nombre} numberOfLines={1}>
          {regla.nombre}
        </Text>
        <Text style={styles.origen}>{textoOrigen(regla)}</Text>
      </View>
      <View style={styles.categoria}>
        <IconoCategoria icono={regla.categoria.icono} />
        <Text style={styles.nombreCategoria} numberOfLines={1}>
          {regla.categoria.nombre}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={colores.texto3} />
    </Pressable>
  );
}

function EstadoVacio() {
  return (
    <View style={styles.vacio}>
      <View style={styles.iconoVacio}>
        <MaterialIcons name="person-outline" size={30} color={colores.texto2} />
      </View>
      <Text style={styles.tituloVacio}>Todavía no hay reglas</Text>
      <Text style={styles.textoVacio}>
        Las reglas se crean desde un movimiento de Mercado Pago: abrilo, elegí la categoría y activá{' '}
        <Text style={styles.textoVacioResaltado}>“Aplicar a los próximos de esta persona”</Text>.
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
    gap: 16,
    paddingHorizontal: espaciado.pantalla,
    paddingBottom: espaciado.debajoDelNavbar,
  },
  contenidoVacio: {
    flexGrow: 1,
  },
  volver: {
    alignSelf: 'flex-start',
    gap: 2,
  },
  encabezado: {
    gap: 6,
    paddingHorizontal: 8,
  },
  titulo: {
    ...tipografia.titulo,
    color: colores.texto,
  },
  subtitulo: {
    fontFamily: fuentes.regular,
    fontSize: 15,
    color: colores.texto2,
  },
  cargando: {
    paddingTop: 80,
  },
  tarjeta: {
    paddingVertical: 4,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    overflow: 'hidden',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 20,
    paddingRight: 12,
  },
  filaPresionada: {
    backgroundColor: colores.presionado,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  nombre: {
    ...tipografia.cuerpo,
    fontFamily: fuentes.semibold,
    color: colores.texto,
  },
  origen: {
    ...tipografia.meta,
    color: colores.texto3,
  },
  categoria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: '50%',
  },
  nombreCategoria: {
    flexShrink: 1,
    ...tipografia.cuerpo,
    color: colores.texto2,
  },
  separador: {
    height: 1,
    backgroundColor: colores.borde,
    marginLeft: 20,
    marginRight: 16,
  },
  vacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  iconoVacio: {
    width: 64,
    height: 64,
    borderRadius: radios.logo,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tituloVacio: {
    ...tipografia.seccion,
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
  textoVacioResaltado: {
    fontFamily: fuentes.medio,
    color: colores.texto,
  },
});

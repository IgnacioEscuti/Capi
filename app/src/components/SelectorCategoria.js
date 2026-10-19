import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import IconoCategoria from './IconoCategoria';
import MensajeError from './MensajeError';
import { colores, fuentes } from '@/theme';

// Contenido de la hoja "Categoría" (va adentro de <HojaInferior>):
// "Sin categoría" primero, después las del usuario y al final "+ Nueva categoría".
export default function SelectorCategoria({ categorias, error, seleccionadaId, onElegir, onNueva }) {
  return (
    <ScrollView style={styles.lista} showsVerticalScrollIndicator={false}>
      <MensajeError mensaje={error} />

      <Opcion
        nombre="Sin categoría"
        atenuada
        seleccionada={seleccionadaId == null}
        onPress={() => onElegir(null)}
      />

      {categorias === null && !error ? (
        <ActivityIndicator color={colores.texto2} style={styles.cargando} />
      ) : (
        categorias?.map((categoria) => (
          <Opcion
            key={categoria.id}
            icono={categoria.icono}
            nombre={categoria.nombre}
            seleccionada={categoria.id === seleccionadaId}
            onPress={() => onElegir(categoria)}
          />
        ))
      )}

      <Pressable
        onPress={onNueva}
        accessibilityRole="button"
        style={({ pressed }) => [styles.opcion, pressed && styles.presionada]}>
        <IconoCategoria icono="add" color={colores.acento} fondo={colores.acentoSuave} />
        <Text style={[styles.nombre, styles.nueva]}>Nueva categoría</Text>
      </Pressable>
    </ScrollView>
  );
}

function Opcion({ icono, nombre, atenuada = false, seleccionada, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: seleccionada }}
      style={({ pressed }) => [styles.opcion, styles.conSeparador, pressed && styles.presionada]}>
      <IconoCategoria icono={icono} />
      <Text style={[styles.nombre, atenuada && styles.atenuada]} numberOfLines={1}>
        {nombre}
      </Text>
      {seleccionada && <MaterialIcons name="check" size={22} color={colores.acento} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lista: {
    flexGrow: 0,
  },
  cargando: {
    paddingVertical: 24,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  conSeparador: {
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
  },
  presionada: {
    opacity: 0.6,
  },
  nombre: {
    flex: 1,
    fontFamily: fuentes.medio,
    fontSize: 17,
    color: colores.texto,
  },
  atenuada: {
    color: colores.texto2,
  },
  nueva: {
    fontFamily: fuentes.semibold,
    color: colores.acento,
  },
});

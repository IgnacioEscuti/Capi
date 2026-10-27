import { ScrollView, StyleSheet, View } from 'react-native';
import Resplandor, { NARANJA_BORDE } from './Resplandor';
import { colores } from '@/theme';

// ScrollView con el resplandor adentro (se mueve con el contenido).
// Al estirar hacia abajo, el contenido se separa del borde y deja ver lo que hay detrás:
// ahí va un bloque fijo con el mismo naranja del borde del resplandor, en vez del fondo liso.
// El contenido es opaco, así que en reposo o scrolleando el bloque no se ve. Cubre solo
// la mitad de arriba: al estirar hacia arriba al final de la lista se ve el fondo, sin naranja.
// El resto de las props (también "ref", que en React 19 es una prop más) van al ScrollView.
export default function ScrollConResplandor({ contentContainerStyle, children, ...props }) {
  return (
    <View style={styles.pantalla}>
      <View style={styles.naranjaDetras} />
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.contenido, contentContainerStyle]} {...props}>
        <Resplandor />
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  naranjaDetras: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: NARANJA_BORDE,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  // flexGrow: si el contenido es más corto que la pantalla, igual la cubre y el naranja no asoma.
  contenido: {
    flexGrow: 1,
    backgroundColor: colores.fondo,
  },
});

import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

const NARANJA_FUERTE = 'rgba(255,138,61,0.20)';

// Alto de la franja naranja que va por encima del borde superior (ver "enScroll").
const ALTO_EXTENSION = 1000;

// enScroll: el resplandor está dentro del scroll y se mueve con él. Se suma una franja
// del mismo naranja por encima del borde: en reposo queda fuera de la pantalla y, al
// estirar hacia abajo, aparece ella en vez del fondo liso.
export default function Resplandor({ enScroll = false }) {
  return (
    <>
      {enScroll && <View style={styles.extension} />}
      <LinearGradient
        colors={[NARANJA_FUERTE, 'rgba(255,138,61,0.06)', 'rgba(26,27,30,0)']}
        locations={[0, 0.45, 1]}
        style={styles.resplandor}
      />
    </>
  );
}

const styles = StyleSheet.create({
  extension: {
    position: 'absolute',
    top: -ALTO_EXTENSION,
    left: 0,
    right: 0,
    height: ALTO_EXTENSION,
    backgroundColor: NARANJA_FUERTE,
    pointerEvents: 'none',
  },
  resplandor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 460,
    pointerEvents: 'none',
  },
});

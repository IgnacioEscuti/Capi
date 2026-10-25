import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colores, espaciado, fuentes, radios, sombras } from '@/theme';
import { abrirFormularioMovimiento } from '@/utils/navegacion';

// Reemplaza la barra de tabs por defecto: Expo Router le pasa el estado de navegación por props.
// Desde SDK 58 no recibe "navigation": los eventos van por "emitter" y para cambiar
// de tab está "navigateToTab", que recibe la key de la ruta (no el nombre).
export default function NavbarGlass({ state, descriptors, emitter, navigateToTab }) {
  return (
    <View style={styles.contenedor}>
      <View style={styles.sombraBarra}>
        <View style={styles.barra}>
          <BlurView tint="dark" intensity={50} style={StyleSheet.absoluteFill} />
          <View style={styles.capaGlass} />

          {state.routes.map((ruta, indice) => {
            const { options } = descriptors[ruta.key];
            const activa = state.index === indice;
            const color = activa ? colores.acento : colores.texto2;

            function alPresionar() {
              const evento = emitter.emit({ type: 'tabPress', target: ruta.key, canPreventDefault: true });
              if (!activa && !evento.defaultPrevented) navigateToTab(ruta.key);
            }

            return (
              <Pressable
                key={ruta.key}
                onPress={alPresionar}
                accessibilityRole="tab"
                accessibilityState={{ selected: activa }}
                style={({ pressed }) => [styles.tab, activa && styles.tabActiva, pressed && styles.tabPresionada]}>
                {options.tabBarIcon?.({ focused: activa, color, size: 24 })}
                <Text style={[styles.etiqueta, { color }]}>{options.title}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        onPress={() => abrirFormularioMovimiento()}
        accessibilityRole="button"
        accessibilityLabel="Agregar movimiento"
        style={({ pressed }) => [styles.botonAgregar, pressed && styles.botonAgregarPresionado]}>
        <MaterialIcons name="add" size={32} color={colores.sobreAcento} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    position: 'absolute',
    left: espaciado.pantalla,
    right: espaciado.pantalla,
    bottom: espaciado.navbarInferior,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sombraBarra: {
    flex: 1,
    borderRadius: radios.pildora,
    boxShadow: sombras.navbar,
  },
  barra: {
    height: 66,
    flexDirection: 'row',
    padding: 5,
    borderRadius: radios.pildora,
    borderWidth: 1,
    borderColor: colores.bordeNavbar,
    overflow: 'hidden',
  },
  capaGlass: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colores.navbarGlass,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radios.pildora,
  },
  tabActiva: {
    backgroundColor: colores.tabActiva,
  },
  tabPresionada: {
    transform: [{ scale: 0.92 }],
  },
  etiqueta: {
    fontFamily: fuentes.medio,
    fontSize: 11,
  },
  botonAgregar: {
    width: 62,
    height: 62,
    borderRadius: radios.pildora,
    backgroundColor: colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: sombras.botonAgregar,
  },
  botonAgregarPresionado: {
    transform: [{ scale: 0.9 }],
  },
});

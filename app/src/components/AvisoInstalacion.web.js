// PROVISORIO-WEB: en iPhone una web no se puede instalar sola. Si Capi se abre en el
// navegador (no desde el ícono de la pantalla de inicio), se explica cómo agregarla.
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BotonTexto from '@/components/BotonTexto';
import EncabezadoAuth from '@/components/EncabezadoAuth';
import Resplandor from '@/components/Resplandor';
import { colores, espaciado, fuentes, radios } from '@/theme';

const PASOS = [
  {
    icono: 'ios-share',
    titulo: 'Tocá Compartir',
    detalle: 'En la barra de Safari. Si no lo ves, está dentro del botón “···”.',
  },
  {
    icono: 'add-box',
    titulo: 'Elegí “Agregar a pantalla de inicio”',
    detalle: 'Si no aparece, deslizá la lista de opciones hacia arriba.',
  },
  {
    icono: 'apps',
    titulo: 'Abrí Capi desde el ícono',
    detalle: 'Se abre a pantalla completa, como una app.',
  },
];

export default function AvisoInstalacion() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(debeMostrarse);

  if (!visible) return null;

  return (
    <View style={styles.pantalla}>
      <Resplandor />
      <ScrollView
        contentContainerStyle={[styles.contenido, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}>
        <EncabezadoAuth subtitulo="Agregala a la pantalla de inicio de tu iPhone para usarla como una app." />

        <View style={styles.tarjeta}>
          {PASOS.map((paso, indice) => (
            <View key={paso.icono} style={[styles.paso, indice > 0 && styles.pasoConBorde]}>
              <View style={styles.icono}>
                <MaterialIcons name={paso.icono} size={22} color={colores.acento} />
              </View>
              <View style={styles.textos}>
                <Text style={styles.titulo}>
                  {indice + 1}. {paso.titulo}
                </Text>
                <Text style={styles.detalle}>{paso.detalle}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.espacio} />

        <BotonTexto titulo="Seguir en el navegador" onPress={() => setVisible(false)} />
      </ScrollView>
    </View>
  );
}

// Solo en iPhone y fuera del modo standalone (abierta desde el navegador, no desde el ícono).
function debeMostrarse() {
  const esIphone = /iPhone|iPod/.test(navigator.userAgent);
  const instalada = navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  return esIphone && !instalada;
}

const styles = StyleSheet.create({
  pantalla: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colores.fondo,
  },
  contenido: {
    flexGrow: 1,
    paddingHorizontal: espaciado.pantallaAuth,
  },
  tarjeta: {
    marginTop: 36,
    paddingHorizontal: 18,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  paso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 18,
  },
  pasoConBorde: {
    borderTopWidth: 1,
    borderTopColor: colores.borde,
  },
  icono: {
    width: 44,
    height: 44,
    borderRadius: radios.icono,
    backgroundColor: colores.acentoSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
    gap: 4,
  },
  titulo: {
    fontFamily: fuentes.semibold,
    fontSize: 17,
    color: colores.texto,
  },
  detalle: {
    fontFamily: fuentes.regular,
    fontSize: 14,
    lineHeight: 19,
    color: colores.texto2,
  },
  espacio: {
    flex: 1,
    minHeight: 24,
  },
});

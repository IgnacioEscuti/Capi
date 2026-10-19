import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import PantallaSeccion from '@/components/PantallaSeccion';
import { useAuth } from '@/context/AuthContext';
import { useDatosAlEnfocar } from '@/hooks/useDatosAlEnfocar';
import { listarCategorias } from '@/services/categoria.service';
import { colores, fuentes, radios } from '@/theme';

export default function AjustesScreen() {
  const { logout } = useAuth();
  const { datos: categorias } = useDatosAlEnfocar(listarCategorias);

  return (
    <PantallaSeccion titulo="Ajustes">
      <View style={styles.filas}>
        <FilaAjuste
          icono="sell"
          titulo="Categorías"
          detalle={categorias ? String(categorias.length) : undefined}
          onPress={() => router.push('/ajustes/categorias')}
        />
        <FilaAjuste icono="logout" titulo="Cerrar sesión" destructiva onPress={logout} />
      </View>
    </PantallaSeccion>
  );
}

function FilaAjuste({ icono, titulo, detalle, destructiva = false, onPress }) {
  return (
    <View style={styles.tarjeta}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.fila, pressed && styles.filaPresionada]}>
        <View style={[styles.icono, { backgroundColor: destructiva ? colores.egresoSuave : colores.elevado }]}>
          <MaterialIcons name={icono} size={21} color={destructiva ? colores.egreso : colores.texto} />
        </View>
        <Text style={[styles.texto, destructiva && styles.textoDestructivo]}>{titulo}</Text>
        {!destructiva && (
          <>
            {detalle && <Text style={styles.detalle}>{detalle}</Text>}
            <MaterialIcons name="chevron-right" size={24} color={colores.texto3} />
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  filas: {
    marginTop: 32,
    gap: 16,
  },
  tarjeta: {
    borderRadius: radios.tarjeta,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    overflow: 'hidden',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  filaPresionada: {
    backgroundColor: colores.presionado,
  },
  icono: {
    width: 40,
    height: 40,
    borderRadius: radios.iconoCampo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    flex: 1,
    fontFamily: fuentes.medio,
    fontSize: 17,
    color: colores.texto,
  },
  textoDestructivo: {
    color: colores.egreso,
  },
  detalle: {
    fontFamily: fuentes.regular,
    fontSize: 16,
    color: colores.texto3,
    fontVariant: ['tabular-nums'],
  },
});

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colores, fuentes, radios } from '@/theme';

export default function CampoFormulario({ ref, icono, etiqueta, error, ayuda, esPassword = false, ...propsInput }) {
  const [enfocado, setEnfocado] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const colorEstado = error ? colores.egreso : enfocado ? colores.acento : null;
  const fondoIcono = error ? colores.egresoSuave : enfocado ? colores.acentoSuave : colores.elevado;

  return (
    <Pressable
      onPress={() => ref.current?.focus()}
      style={[styles.contenedor, esPassword && styles.contenedorConBoton, error && styles.contenedorConError]}>
      <View style={styles.fila}>
        <View style={[styles.icono, { backgroundColor: fondoIcono }]}>
          <MaterialIcons name={icono} size={21} color={colorEstado ?? colores.texto2} />
        </View>

        <View style={styles.textos}>
          <Text style={[styles.etiqueta, colorEstado && { color: colorEstado }]}>{etiqueta}</Text>
          <TextInput
            ref={ref}
            style={styles.input}
            placeholderTextColor={colores.texto3}
            selectionColor={colores.acento}
            keyboardAppearance="dark"
            secureTextEntry={esPassword && !passwordVisible}
            onFocus={() => setEnfocado(true)}
            onBlur={() => setEnfocado(false)}
            {...propsInput}
          />
        </View>

        {esPassword ? (
          <Pressable
            onPress={() => setPasswordVisible((visible) => !visible)}
            accessibilityLabel={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            style={({ pressed }) => [styles.botonVer, pressed && styles.botonVerPresionado]}>
            <MaterialIcons name={passwordVisible ? 'visibility-off' : 'visibility'} size={22} color={colores.texto2} />
          </Pressable>
        ) : (
          error && <MaterialIcons name="error" size={22} color={colores.egreso} />
        )}
      </View>

      {(error || ayuda) && <Text style={[styles.mensaje, error && styles.mensajeError]}>{error ?? ayuda}</Text>}
    </Pressable>
  );
}

// Misma apariencia que el campo, pero en vez de escribir se toca para elegir (Fecha, Categoría).
// "bloqueado": se muestra con un candado y no se puede tocar (ej. la fecha de un movimiento de MP).
export function CampoBoton({ icono, etiqueta, valor, valorAtenuado = false, bloqueado = false, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={bloqueado}
      accessibilityRole="button"
      accessibilityState={{ disabled: bloqueado }}
      accessibilityLabel={`${etiqueta}: ${valor}${bloqueado ? ', no se puede cambiar' : ''}`}
      style={({ pressed }) => [styles.contenedor, pressed && styles.contenedorPresionado]}>
      <View style={styles.fila}>
        <View style={[styles.icono, { backgroundColor: colores.elevado }]}>
          <MaterialIcons name={icono} size={21} color={colores.texto2} />
        </View>
        <View style={styles.textos}>
          <View style={styles.filaEtiqueta}>
            <Text style={styles.etiqueta}>{etiqueta}</Text>
            {bloqueado && <MaterialIcons name="lock-outline" size={13} color={colores.texto3} />}
          </View>
          <Text style={[styles.input, (valorAtenuado || bloqueado) && styles.valorAtenuado]} numberOfLines={1}>
            {valor}
          </Text>
        </View>
        {!bloqueado && <MaterialIcons name="chevron-right" size={24} color={colores.texto3} />}
      </View>
    </Pressable>
  );
}

export function TarjetaCampos({ style, children }) {
  return <View style={[styles.tarjeta, style]}>{children}</View>;
}

export function SeparadorCampos() {
  return <View style={styles.separador} />;
}

const styles = StyleSheet.create({
  tarjeta: {
    borderRadius: radios.tarjeta,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    overflow: 'hidden',
  },
  contenedor: {
    gap: 8,
    paddingVertical: 16,
    paddingLeft: 18,
    paddingRight: 18,
  },
  contenedorConBoton: {
    paddingRight: 10,
  },
  contenedorConError: {
    backgroundColor: colores.egresoFondo,
  },
  contenedorPresionado: {
    backgroundColor: colores.presionado,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  icono: {
    width: 40,
    height: 40,
    borderRadius: radios.iconoCampo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  filaEtiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  etiqueta: {
    fontFamily: fuentes.medio,
    fontSize: 12,
    color: colores.texto3,
  },
  input: {
    fontFamily: fuentes.medio,
    fontSize: 17,
    color: colores.texto,
    padding: 0,
  },
  valorAtenuado: {
    color: colores.texto2,
  },
  botonVer: {
    width: 44,
    height: 44,
    borderRadius: radios.iconoCampo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonVerPresionado: {
    backgroundColor: colores.presionado,
  },
  mensaje: {
    fontFamily: fuentes.regular,
    fontSize: 13,
    color: colores.texto3,
    paddingLeft: 54,
  },
  mensajeError: {
    color: colores.egreso,
  },
  separador: {
    height: 1,
    backgroundColor: colores.borde,
    marginLeft: 72,
  },
});

import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BotonPrimario from '@/components/BotonPrimario';
import BotonTexto from '@/components/BotonTexto';
import CampoFormulario, { CampoBoton, SeparadorCampos, TarjetaCampos } from '@/components/CampoFormulario';
import DialogoConfirmacion from '@/components/DialogoConfirmacion';
import HojaInferior from '@/components/HojaInferior';
import MensajeError from '@/components/MensajeError';
import Resplandor from '@/components/Resplandor';
import SelectorCategoria from '@/components/SelectorCategoria';
import { useDatosAlEnfocar } from '@/hooks/useDatosAlEnfocar';
import { obtenerMensajeDeError } from '@/services/api';
import { listarCategorias } from '@/services/categoria.service';
import { actualizarRegla, borrarRegla, listarReglas } from '@/services/regla.service';
import { colores, espaciado, fuentes } from '@/theme';
import { textoOrigen } from '@/utils/reglas';
import { validarNombreRegla } from '@/utils/validaciones';

// Editar regla (modal). Se abre desde Ajustes → Reglas o desde la fila "Regla: …"
// de un movimiento de MP; al guardar o borrar vuelve a la pantalla que la abrió.
// Llega solo el id: la regla se busca en la lista para tenerla actualizada.
export default function ReglaScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { datos: reglas, error } = useDatosAlEnfocar(listarReglas);
  const regla = reglas?.find((r) => r.id === Number(id));

  // En iOS el modal es una hoja que ya arranca debajo de la barra de estado; en Android ocupa toda la pantalla.
  const paddingSuperior = Platform.OS === 'ios' ? 16 : insets.top + 12;

  return (
    <View style={styles.pantalla}>
      <Resplandor />
      <ScrollView
        contentContainerStyle={[styles.contenido, { paddingTop: paddingSuperior, paddingBottom: insets.bottom + 16 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}>
        <View style={styles.encabezado}>
          <Text style={styles.tituloPantalla}>Editar regla</Text>
          <BotonTexto titulo="Cancelar" color={colores.acento} onPress={() => router.back()} />
        </View>

        <MensajeError mensaje={error} />

        {reglas === null ? (
          !error && <ActivityIndicator color={colores.texto2} style={styles.cargando} />
        ) : regla ? (
          // Se monta cuando la regla ya llegó, así el formulario arranca con sus datos.
          <FormularioRegla regla={regla} />
        ) : (
          <Text style={styles.noExiste}>Esta regla ya no existe.</Text>
        )}
      </ScrollView>
    </View>
  );
}

function FormularioRegla({ regla }) {
  const { datos: categorias, error: errorCategorias } = useDatosAlEnfocar(listarCategorias);
  const [nombre, setNombre] = useState(regla.nombre);
  const [categoria, setCategoria] = useState(regla.categoria);
  const [errorNombre, setErrorNombre] = useState();
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [eligiendoCategoria, setEligiendoCategoria] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const nombreRef = useRef(null);
  // Fuera de las funciones a propósito, como en el formulario de movimiento (React Compiler).
  const idRegla = regla.id;
  const idCategoria = categoria.id;

  function elegirCategoria(categoriaElegida) {
    setCategoria(categoriaElegida);
    setErrorGeneral('');
    setEligiendoCategoria(false);
  }

  async function guardar() {
    if (enviando) return;

    const error = validarNombreRegla(nombre);
    setErrorNombre(error);
    setErrorGeneral('');
    if (error) return;

    setEnviando(true);
    try {
      await actualizarRegla(idRegla, { nombre: nombre.trim(), categoriaId: idCategoria });
      router.back();
    } catch (errorGuardar) {
      setErrorGeneral(obtenerMensajeDeError(errorGuardar));
      setEnviando(false);
    }
  }

  async function borrar() {
    await borrarRegla(idRegla);
    setConfirmandoBorrado(false);
    router.back();
  }

  return (
    <>
      <TarjetaCampos style={styles.tarjeta}>
        <CampoFormulario
          ref={nombreRef}
          icono="person-outline"
          etiqueta="Nombre de la persona"
          placeholder="Ej: Juan"
          value={nombre}
          onChangeText={(valor) => {
            setNombre(valor);
            setErrorNombre(undefined);
            setErrorGeneral('');
          }}
          error={errorNombre}
          autoCapitalize="words"
          returnKeyType="done"
        />
        <SeparadorCampos />
        <CampoBoton
          icono={categoria.icono}
          etiqueta="Categoría"
          valor={categoria.nombre}
          onPress={() => setEligiendoCategoria(true)}
        />
        <SeparadorCampos />
        <CampoBoton icono="swap-horiz" etiqueta="Origen" valor={textoOrigen(regla)} bloqueado />
      </TarjetaCampos>

      <View style={styles.espacio} />

      <View style={styles.pie}>
        <MensajeError mensaje={errorGeneral} />
        <BotonPrimario titulo="Guardar" tituloCargando="Guardando…" cargando={enviando} onPress={guardar} />
        <BotonTexto
          titulo="Borrar regla"
          icono="delete-outline"
          color={colores.egreso}
          disabled={enviando}
          onPress={() => setConfirmandoBorrado(true)}
        />
      </View>

      <HojaInferior
        visible={eligiendoCategoria}
        onCerrar={() => setEligiendoCategoria(false)}
        titulo="Categoría"
        botonCerrar>
        {/* Una regla siempre tiene categoría: sin "Sin categoría" ni "+ Nueva categoría". */}
        <SelectorCategoria
          categorias={categorias}
          error={errorCategorias}
          seleccionadaId={categoria.id}
          onElegir={elegirCategoria}
          conSinCategoria={false}
        />
      </HojaInferior>

      <DialogoConfirmacion
        visible={confirmandoBorrado}
        titulo={`¿Borrar la regla de ${regla.nombre}?`}
        textoConfirmar="Borrar regla"
        onConfirmar={borrar}
        onCancelar={() => setConfirmandoBorrado(false)}>
        Los movimientos ya cargados no cambian.
      </DialogoConfirmacion>
    </>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  contenido: {
    flexGrow: 1,
    paddingHorizontal: espaciado.pantallaAuth,
  },
  encabezado: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  tituloPantalla: {
    ...StyleSheet.absoluteFill,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 44,
    fontFamily: fuentes.semibold,
    fontSize: 17,
    color: colores.texto,
  },
  cargando: {
    paddingTop: 80,
  },
  noExiste: {
    fontFamily: fuentes.regular,
    fontSize: 15,
    color: colores.texto3,
    textAlign: 'center',
    paddingTop: 40,
  },
  tarjeta: {
    marginTop: 16,
  },
  espacio: {
    flex: 1,
    minHeight: 32,
  },
  pie: {
    gap: 12,
  },
});

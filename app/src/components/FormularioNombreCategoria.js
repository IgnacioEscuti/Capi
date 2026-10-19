import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import BotonPrimario from './BotonPrimario';
import BotonTexto from './BotonTexto';
import CampoFormulario, { TarjetaCampos } from './CampoFormulario';
import MensajeError from './MensajeError';
import { obtenerMensajeDeError } from '@/services/api';
import { colores } from '@/theme';
import { validarNombreCategoria } from '@/utils/validaciones';

// Contenido de la hoja para crear o renombrar una categoría (va adentro de <HojaInferior>).
// "onGuardar(nombre)" es async: si falla (por ejemplo, nombre repetido) se muestra el error acá.
export default function FormularioNombreCategoria({ icono = 'label', nombreInicial = '', onGuardar, onCancelar }) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [errorNombre, setErrorNombre] = useState();
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const nombreRef = useRef(null);

  function actualizarNombre(valor) {
    setNombre(valor);
    setErrorNombre(undefined);
    setErrorGeneral('');
  }

  async function guardar() {
    if (enviando) return;

    const error = validarNombreCategoria(nombre);
    setErrorNombre(error);
    setErrorGeneral('');
    if (error) return;

    setEnviando(true);
    try {
      await onGuardar(nombre.trim());
    } catch (errorGuardar) {
      setErrorGeneral(obtenerMensajeDeError(errorGuardar));
      setEnviando(false);
    }
  }

  return (
    <View style={styles.contenedor}>
      <TarjetaCampos style={styles.tarjeta}>
        <CampoFormulario
          ref={nombreRef}
          icono={icono}
          etiqueta="Nombre"
          placeholder="Ej: Mascotas"
          value={nombre}
          onChangeText={actualizarNombre}
          error={errorNombre}
          autoFocus
          autoCapitalize="sentences"
          returnKeyType="done"
          onSubmitEditing={guardar}
        />
      </TarjetaCampos>

      <MensajeError mensaje={errorGeneral} />
      <BotonPrimario titulo="Guardar" tituloCargando="Guardando…" cargando={enviando} onPress={guardar} />
      <BotonTexto titulo="Cancelar" onPress={onCancelar} disabled={enviando} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: 16,
  },
  tarjeta: {
    backgroundColor: colores.fondo,
  },
});

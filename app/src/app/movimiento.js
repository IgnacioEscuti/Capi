import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BotonPrimario from '@/components/BotonPrimario';
import BotonTexto from '@/components/BotonTexto';
import CampoFormulario, { CampoBoton, SeparadorCampos, TarjetaCampos } from '@/components/CampoFormulario';
import DialogoConfirmacion, { Resaltado } from '@/components/DialogoConfirmacion';
import FormularioNombreCategoria from '@/components/FormularioNombreCategoria';
import HojaInferior from '@/components/HojaInferior';
import MensajeError from '@/components/MensajeError';
import Resplandor from '@/components/Resplandor';
import SelectorCategoria from '@/components/SelectorCategoria';
import { useDatosAlEnfocar } from '@/hooks/useDatosAlEnfocar';
import { obtenerMensajeDeError } from '@/services/api';
import { crearCategoria, listarCategorias } from '@/services/categoria.service';
import { actualizarMovimiento, borrarMovimiento, crearMovimiento } from '@/services/movimiento.service';
import { colores, espaciado, fuentes, radios, tipografia } from '@/theme';
import { agruparMiles, formatearFechaLarga, formatearPesosConSigno } from '@/utils/formato';
import {
  calcularFechaAEnviar,
  limpiarMonto,
  montoANumero,
  NOMBRE_TIPO,
  numeroAMonto,
  obtenerMontoConSigno,
  obtenerTituloMovimiento,
} from '@/utils/movimientos';
import { tieneErrores, validarMovimiento } from '@/utils/validaciones';

const HOJAS = {
  fecha: { titulo: 'Fecha', botonCerrar: true },
  categoria: { titulo: 'Categoría', botonCerrar: true },
  nuevaCategoria: { titulo: 'Nueva categoría', descripcion: 'Sirve para ingresos y egresos.' },
};

// Misma pantalla para crear y editar: si llega el param "movimiento", es edición.
export default function MovimientoScreen() {
  const { movimiento: movimientoParam } = useLocalSearchParams();
  const original = movimientoParam ? JSON.parse(movimientoParam) : null;
  const editando = Boolean(original);

  const insets = useSafeAreaInsets();
  const { datos: categorias, error: errorCategorias, recargar: recargarCategorias } = useDatosAlEnfocar(listarCategorias);

  const [tipo, setTipo] = useState(original?.tipo ?? 'expense');
  const [monto, setMonto] = useState(original ? numeroAMonto(original.monto) : '');
  const [dia, setDia] = useState(() => (original ? new Date(original.fecha) : new Date()));
  const [descripcion, setDescripcion] = useState(original?.descripcion ?? '');
  const [categoria, setCategoria] = useState(original?.categoria ?? null);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [montoEnfocado, setMontoEnfocado] = useState(false);
  // "tipo" se conserva al cerrar para que el contenido no cambie mientras la hoja baja.
  const [hoja, setHoja] = useState({ visible: false, tipo: 'categoria' });
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const montoRef = useRef(null);
  const descripcionRef = useRef(null);

  function limpiarErrores(campo) {
    setErrores((anteriores) => ({ ...anteriores, [campo]: undefined }));
    setErrorGeneral('');
  }

  const abrirHoja = (tipoHoja) => setHoja({ visible: true, tipo: tipoHoja });
  const cerrarHoja = () => setHoja((anterior) => ({ ...anterior, visible: false }));

  function abrirFecha() {
    // En Android el calendario es un diálogo propio del sistema; en iOS va dentro de la hoja.
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: dia, mode: 'date', onValueChange: (_evento, fecha) => setDia(fecha) });
      return;
    }
    abrirHoja('fecha');
  }

  function elegirCategoria(categoriaElegida) {
    setCategoria(categoriaElegida);
    cerrarHoja();
  }

  async function guardarNuevaCategoria(nombre) {
    const nueva = await crearCategoria(nombre);
    setCategoria(nueva);
    cerrarHoja();
    recargarCategorias();
  }

  async function guardar() {
    if (enviando) return;

    const erroresValidacion = validarMovimiento({ monto: montoANumero(monto), descripcion });
    setErrores(erroresValidacion);
    setErrorGeneral('');
    if (tieneErrores(erroresValidacion)) return;

    const datos = {
      tipo,
      monto: montoANumero(monto),
      fecha: calcularFechaAEnviar(dia, original?.fecha),
      descripcion: descripcion.trim() || null,
      categoriaId: categoria?.id ?? null,
    };

    setEnviando(true);
    try {
      if (editando) await actualizarMovimiento(original.id, datos);
      else await crearMovimiento(datos);
      router.back();
    } catch (error) {
      setErrorGeneral(obtenerMensajeDeError(error));
      setEnviando(false);
    }
  }

  async function borrar() {
    await borrarMovimiento(original.id);
    setConfirmandoBorrado(false);
    router.back();
  }

  // En iOS el modal es una hoja que ya arranca debajo de la barra de estado; en Android ocupa toda la pantalla.
  const paddingSuperior = Platform.OS === 'ios' ? 16 : insets.top + 12;

  return (
    <View style={styles.pantalla}>
      <Resplandor />

      <ScrollView
        contentContainerStyle={[styles.contenido, { paddingTop: paddingSuperior, paddingBottom: insets.bottom + 16 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        // iOS: agranda el scroll cuando aparece el teclado, para poder llegar al botón.
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}>
        <View style={styles.encabezado}>
          <Text style={styles.tituloPantalla}>{editando ? 'Editar movimiento' : 'Nuevo movimiento'}</Text>
          <BotonTexto titulo="Cancelar" color={colores.acento} onPress={() => router.back()} />
        </View>

        <SelectorTipo tipo={tipo} onCambiar={setTipo} />

        <EntradaMonto
          ref={montoRef}
          monto={monto}
          enfocado={montoEnfocado}
          error={errores.monto}
          autoFocus={!editando}
          onChangeText={(texto) => {
            setMonto(limpiarMonto(texto));
            limpiarErrores('monto');
          }}
          onFocus={() => setMontoEnfocado(true)}
          onBlur={() => setMontoEnfocado(false)}
        />

        <TarjetaCampos>
          <CampoBoton icono="calendar-today" etiqueta="Fecha" valor={formatearFechaLarga(dia)} onPress={abrirFecha} />
          <SeparadorCampos />
          <CampoFormulario
            ref={descripcionRef}
            icono="notes"
            etiqueta="Descripción · opcional"
            placeholder="Ej: Verdulería del barrio"
            value={descripcion}
            onChangeText={(valor) => {
              setDescripcion(valor);
              limpiarErrores('descripcion');
            }}
            error={errores.descripcion}
            autoCapitalize="sentences"
            returnKeyType="done"
          />
          <SeparadorCampos />
          <CampoBoton
            icono={categoria?.icono ?? 'label-outline'}
            etiqueta="Categoría · opcional"
            valor={categoria?.nombre ?? 'Sin categoría'}
            valorAtenuado={!categoria}
            onPress={() => abrirHoja('categoria')}
          />
        </TarjetaCampos>

        <View style={styles.espacio} />

        <View style={styles.pie}>
          <MensajeError mensaje={errorGeneral} />
          <BotonPrimario
            titulo={editando ? 'Guardar cambios' : 'Guardar'}
            tituloCargando="Guardando…"
            cargando={enviando}
            onPress={guardar}
          />
          {editando && (
            <BotonTexto
              titulo="Borrar movimiento"
              icono="delete-outline"
              color={colores.egreso}
              disabled={enviando}
              onPress={() => setConfirmandoBorrado(true)}
            />
          )}
        </View>
      </ScrollView>

      <HojaInferior visible={hoja.visible} onCerrar={cerrarHoja} {...HOJAS[hoja.tipo]}>
        {hoja.tipo === 'fecha' && (
          <DateTimePicker
            value={dia}
            mode="date"
            display="inline"
            locale="es-AR"
            themeVariant="dark"
            accentColor={colores.acento}
            onValueChange={(_evento, fecha) => {
              setDia(fecha);
              cerrarHoja();
            }}
          />
        )}
        {hoja.tipo === 'categoria' && (
          <SelectorCategoria
            categorias={categorias}
            error={errorCategorias}
            seleccionadaId={categoria?.id}
            onElegir={elegirCategoria}
            onNueva={() => abrirHoja('nuevaCategoria')}
          />
        )}
        {hoja.tipo === 'nuevaCategoria' && (
          <FormularioNombreCategoria onGuardar={guardarNuevaCategoria} onCancelar={cerrarHoja} />
        )}
      </HojaInferior>

      {editando && (
        <DialogoConfirmacion
          visible={confirmandoBorrado}
          titulo="¿Borrar este movimiento?"
          textoConfirmar="Borrar"
          onConfirmar={borrar}
          onCancelar={() => setConfirmandoBorrado(false)}>
          {obtenerTituloMovimiento(original)} ·{' '}
          <Resaltado color={original.tipo === 'income' ? colores.ingreso : colores.egreso}>
            {formatearPesosConSigno(obtenerMontoConSigno(original))}
          </Resaltado>
          . El saldo se va a actualizar y no se puede deshacer.
        </DialogoConfirmacion>
      )}
    </View>
  );
}

function SelectorTipo({ tipo, onCambiar }) {
  return (
    <View style={styles.selectorTipo} accessibilityRole="radiogroup">
      {['income', 'expense'].map((opcion) => {
        const activo = tipo === opcion;
        const colorPunto = opcion === 'income' ? colores.ingreso : colores.egreso;

        return (
          <Pressable
            key={opcion}
            onPress={() => onCambiar(opcion)}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo }}
            style={[styles.opcionTipo, activo && styles.opcionTipoActiva]}>
            <View style={[styles.puntoTipo, { backgroundColor: activo ? colorPunto : colores.texto3 }]} />
            <Text style={[styles.textoTipo, activo && styles.textoTipoActivo]}>{NOMBRE_TIPO[opcion]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// El TextInput real está oculto: guarda lo escrito ("12500,5") y abre el teclado.
// Lo que se ve es el monto ya formateado ("$ 12.500,50"), con los centavos más chicos.
function EntradaMonto({ ref, monto, enfocado, error, ...propsInput }) {
  const [entero, decimales] = monto.split(',');
  const centavos = (decimales ?? '').padEnd(2, '0');

  return (
    <Pressable onPress={() => ref.current?.focus()} style={styles.bloqueMonto} accessible={false}>
      <Text style={styles.etiquetaMonto}>Monto</Text>
      <View style={styles.filaMonto}>
        <Text style={styles.monto} numberOfLines={1} adjustsFontSizeToFit>
          <Text style={styles.montoSigno}>$ </Text>
          <Text style={!entero && styles.montoVacio}>{entero ? agruparMiles(entero) : '0'}</Text>
          <Text style={styles.montoCentavos}>,{centavos}</Text>
        </Text>
        {enfocado && <View style={styles.cursor} />}
      </View>
      {error && <Text style={styles.errorMonto}>{error}</Text>}

      <TextInput
        ref={ref}
        value={monto}
        style={styles.inputOculto}
        keyboardType="decimal-pad"
        keyboardAppearance="dark"
        caretHidden
        accessibilityLabel="Monto"
        {...propsInput}
      />
    </Pressable>
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
  selectorTipo: {
    flexDirection: 'row',
    marginTop: 16,
    padding: 5,
    borderRadius: radios.pildora,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  opcionTipo: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radios.pildora,
  },
  opcionTipoActiva: {
    backgroundColor: colores.segmentoActivo,
  },
  puntoTipo: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  textoTipo: {
    fontFamily: fuentes.medio,
    fontSize: 16,
    color: colores.texto2,
  },
  textoTipoActivo: {
    fontFamily: fuentes.semibold,
    color: colores.texto,
  },
  bloqueMonto: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 48,
    paddingBottom: 40,
  },
  etiquetaMonto: {
    fontFamily: fuentes.medio,
    fontSize: 15,
    color: colores.texto2,
  },
  filaMonto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monto: {
    ...tipografia.display,
    flexShrink: 1,
    color: colores.texto,
    fontVariant: ['tabular-nums'],
  },
  montoSigno: {
    fontFamily: fuentes.semibold,
    fontSize: 30,
    letterSpacing: 0,
  },
  montoVacio: {
    color: colores.texto3,
  },
  montoCentavos: {
    fontFamily: fuentes.semibold,
    fontSize: 26,
    letterSpacing: 0,
    color: colores.textoAtenuado,
  },
  cursor: {
    width: 2,
    height: 48,
    borderRadius: 1,
    backgroundColor: colores.acento,
  },
  errorMonto: {
    fontFamily: fuentes.medio,
    fontSize: 14,
    color: colores.egreso,
  },
  inputOculto: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  espacio: {
    flex: 1,
    minHeight: 32,
  },
  pie: {
    gap: 12,
  },
});

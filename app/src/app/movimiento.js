import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
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
import { listarReglas } from '@/services/regla.service';
import { colores, espaciado, fuentes, radios, tipografia } from '@/theme';
import { agruparMiles, formatearFechaLarga, formatearPesosConSigno } from '@/utils/formato';
import {
  calcularFechaAEnviar,
  esDeMercadoPago,
  limpiarMonto,
  montoANumero,
  NOMBRE_TIPO,
  numeroAMonto,
  obtenerMontoConSigno,
  obtenerTituloMovimiento,
} from '@/utils/movimientos';
import { abrirEditarRegla } from '@/utils/reglas';
import { tieneErrores, validarMovimiento, validarNombreRegla } from '@/utils/validaciones';

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
  // Importado de MP: tipo, monto y fecha bloqueados (vienen de MP) y no se puede borrar.
  const deMp = editando && esDeMercadoPago(original);
  // Fuera de las funciones a propósito: el React Compiler lee lo que usan las
  // funciones durante el render para memorizarlas, y en modo crear "original" es null.
  const idOriginal = original?.id;
  const fechaOriginal = original?.fecha;
  const tipoOriginal = original?.tipo;
  const montoOriginal = original?.monto;
  const idReglaOriginal = original?.regla?.id;

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
  // Regla de la contraparte (solo movimientos de MP). Con regla se muestra la fila
  // "Regla: Juan → Sueldo"; sin regla pero con contraparte, el interruptor para crearla.
  const [regla, setRegla] = useState(original?.regla ?? null);
  const [aplicarRegla, setAplicarRegla] = useState(false);
  const [nombreRegla, setNombreRegla] = useState('');
  const idCategoria = categoria?.id ?? null;
  const puedeCrearRegla = deMp && original.tieneContraparte && !regla;
  const montoRef = useRef(null);
  const descripcionRef = useRef(null);
  const nombreReglaRef = useRef(null);

  // Al volver de Editar regla, la regla pudo cambiar o borrarse: se vuelve a
  // buscar para que la fila no quede vieja. Si se borró, aparece el interruptor.
  useFocusEffect(
    useCallback(() => {
      if (!idReglaOriginal) return;
      let vigente = true;
      listarReglas()
        .then((reglas) => {
          if (vigente) setRegla(reglas.find((r) => r.id === idReglaOriginal) ?? null);
        })
        .catch(() => {}); // Si falla, queda la que vino con el movimiento.
      return () => {
        vigente = false;
      };
    }, [idReglaOriginal])
  );

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
    setErrorGeneral(''); // Por si era "Elegí una categoría…" de la regla.
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
    const creaRegla = puedeCrearRegla && aplicarRegla;
    if (creaRegla) {
      const errorNombreRegla = validarNombreRegla(nombreRegla);
      if (errorNombreRegla) erroresValidacion.nombreRegla = errorNombreRegla;
    }
    setErrores(erroresValidacion);
    setErrorGeneral('');
    if (tieneErrores(erroresValidacion)) return;
    // La regla carga los próximos movimientos con esta categoría: sin categoría no tiene sentido.
    if (creaRegla && !idCategoria) {
      setErrorGeneral('Elegí una categoría para aplicarla a los próximos de esta persona.');
      return;
    }

    const descripcionYCategoria = { descripcion: descripcion.trim() || null, categoriaId: idCategoria };
    // En los de MP el back exige tipo, monto y fecha iguales a los guardados: se reenvían tal cual.
    const datos = deMp
      ? { tipo: tipoOriginal, monto: montoOriginal, fecha: fechaOriginal, ...descripcionYCategoria }
      : { tipo, monto: montoANumero(monto), fecha: calcularFechaAEnviar(dia, fechaOriginal), ...descripcionYCategoria };
    // Con el interruptor encendido, el back crea la regla en la misma operación (si ya hay una, 409).
    if (creaRegla) datos.regla = { nombre: nombreRegla.trim() };

    setEnviando(true);
    try {
      if (editando) await actualizarMovimiento(idOriginal, datos);
      else await crearMovimiento(datos);
      router.back();
    } catch (error) {
      setErrorGeneral(obtenerMensajeDeError(error));
      setEnviando(false);
    }
  }

  async function borrar() {
    await borrarMovimiento(idOriginal);
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

        {deMp && <AvisoMercadoPago />}

        <SelectorTipo tipo={tipo} bloqueado={deMp} onCambiar={setTipo} />

        <EntradaMonto
          ref={montoRef}
          monto={monto}
          bloqueado={deMp}
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
          <CampoBoton
            icono="calendar-today"
            etiqueta="Fecha"
            valor={formatearFechaLarga(dia)}
            bloqueado={deMp}
            onPress={abrirFecha}
          />
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

        {puedeCrearRegla && (
          <TarjetaCampos style={styles.tarjetaRegla}>
            <View style={styles.filaInterruptor}>
              <Text style={styles.textoInterruptor}>Aplicar a los próximos de esta persona</Text>
              <Switch
                value={aplicarRegla}
                onValueChange={(valor) => {
                  setAplicarRegla(valor);
                  limpiarErrores('nombreRegla');
                }}
                trackColor={{ false: colores.elevado, true: colores.acento }}
                ios_backgroundColor={colores.elevado}
                accessibilityLabel="Aplicar a los próximos de esta persona"
              />
            </View>
            {aplicarRegla && (
              <>
                <SeparadorCampos />
                <CampoFormulario
                  ref={nombreReglaRef}
                  icono="person-outline"
                  etiqueta="Nombre de la persona"
                  placeholder="Ej: Juan"
                  value={nombreRegla}
                  onChangeText={(valor) => {
                    setNombreRegla(valor);
                    limpiarErrores('nombreRegla');
                  }}
                  error={errores.nombreRegla}
                  ayuda="Los próximos movimientos de esta persona se van a cargar con esta categoría y este nombre."
                  autoCapitalize="words"
                  autoFocus
                  returnKeyType="done"
                />
              </>
            )}
          </TarjetaCampos>
        )}

        {deMp && regla && (
          <TarjetaCampos style={styles.tarjetaRegla}>
            <CampoBoton
              icono="person-outline"
              etiqueta="Regla"
              valor={`${regla.nombre} → ${regla.categoria.nombre}`}
              onPress={() => abrirEditarRegla(regla.id)}
            />
          </TarjetaCampos>
        )}

        <View style={styles.espacio} />

        <View style={styles.pie}>
          <MensajeError mensaje={errorGeneral} />
          <BotonPrimario
            titulo={editando ? 'Guardar cambios' : 'Guardar'}
            tituloCargando="Guardando…"
            cargando={enviando}
            onPress={guardar}
          />
          {editando && !deMp && (
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

      {editando && !deMp && (
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

function AvisoMercadoPago() {
  return (
    <View style={styles.avisoMp}>
      <View style={styles.iconoAvisoMp}>
        <MaterialIcons name="swap-horiz" size={22} color={colores.texto2} />
      </View>
      <Text style={styles.textoAvisoMp}>
        <Text style={styles.textoAvisoMpResaltado}>Importado de Mercado Pago.</Text> Tipo, monto y fecha no se pueden
        cambiar.
      </Text>
    </View>
  );
}

const COLOR_PUNTO_TIPO = { income: colores.ingreso, expense: colores.egreso, internal: colores.texto2 };

// Bloqueado (movimiento de MP): no se puede tocar y el activo lleva un candado.
// Un movimiento interno solo existe en MP, así que se muestra como única opción.
function SelectorTipo({ tipo, bloqueado = false, onCambiar }) {
  const opciones = tipo === 'internal' ? ['internal'] : ['income', 'expense'];

  return (
    <View style={styles.selectorTipo} accessibilityRole="radiogroup">
      {opciones.map((opcion) => {
        const activo = tipo === opcion;

        return (
          <Pressable
            key={opcion}
            onPress={() => onCambiar(opcion)}
            disabled={bloqueado}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo, disabled: bloqueado }}
            style={[styles.opcionTipo, activo && styles.opcionTipoActiva, bloqueado && !activo && styles.atenuado]}>
            <View style={[styles.puntoTipo, { backgroundColor: activo ? COLOR_PUNTO_TIPO[opcion] : colores.texto3 }]} />
            <Text style={[styles.textoTipo, activo && styles.textoTipoActivo]}>{NOMBRE_TIPO[opcion]}</Text>
            {bloqueado && activo && <MaterialIcons name="lock-outline" size={15} color={colores.texto2} />}
          </Pressable>
        );
      })}
    </View>
  );
}

// El TextInput real está oculto: guarda lo escrito ("12500,5") y abre el teclado.
// Lo que se ve es el monto ya formateado ("$ 12.500,50"), con los centavos más chicos.
// "bloqueado" (movimiento de MP): se ve con un candado y no abre el teclado.
function EntradaMonto({ ref, monto, bloqueado = false, enfocado, error, ...propsInput }) {
  const [entero, decimales] = monto.split(',');
  const centavos = (decimales ?? '').padEnd(2, '0');

  return (
    <Pressable onPress={() => ref.current?.focus()} disabled={bloqueado} style={styles.bloqueMonto} accessible={false}>
      <View style={styles.filaEtiquetaMonto}>
        <Text style={styles.etiquetaMonto}>Monto</Text>
        {bloqueado && <MaterialIcons name="lock-outline" size={15} color={colores.texto2} />}
      </View>
      <View style={styles.filaMonto}>
        <Text style={[styles.monto, bloqueado && styles.montoBloqueado]} numberOfLines={1} adjustsFontSizeToFit>
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
        editable={!bloqueado}
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
  avisoMp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 14,
    borderRadius: radios.mensaje,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  iconoAvisoMp: {
    width: 36,
    height: 36,
    borderRadius: radios.iconoCampo,
    backgroundColor: colores.elevado,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoAvisoMp: {
    flex: 1,
    fontFamily: fuentes.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colores.texto2,
  },
  textoAvisoMpResaltado: {
    fontFamily: fuentes.semibold,
    color: colores.texto,
  },
  atenuado: {
    opacity: 0.5,
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
  filaEtiquetaMonto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  montoBloqueado: {
    color: colores.texto2,
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
  tarjetaRegla: {
    marginTop: 16,
  },
  filaInterruptor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  textoInterruptor: {
    flex: 1,
    fontFamily: fuentes.medio,
    fontSize: 16,
    color: colores.texto,
  },
  espacio: {
    flex: 1,
    minHeight: 32,
  },
  pie: {
    gap: 12,
  },
});

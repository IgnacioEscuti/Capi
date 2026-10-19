import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BotonTexto from '@/components/BotonTexto';
import DialogoConfirmacion, { Resaltado } from '@/components/DialogoConfirmacion';
import FormularioNombreCategoria from '@/components/FormularioNombreCategoria';
import HojaInferior from '@/components/HojaInferior';
import IconoCategoria from '@/components/IconoCategoria';
import MensajeError from '@/components/MensajeError';
import Resplandor from '@/components/Resplandor';
import { useDatosAlEnfocar } from '@/hooks/useDatosAlEnfocar';
import { borrarCategoria, listarCategorias, renombrarCategoria } from '@/services/categoria.service';
import { colores, espaciado, fuentes, radios, tipografia } from '@/theme';

const textoMovimientos = (cantidad) => `${cantidad} ${cantidad === 1 ? 'movimiento' : 'movimientos'}`;

export default function CategoriasScreen() {
  const insets = useSafeAreaInsets();
  const { datos: categorias, error, recargar } = useDatosAlEnfocar(listarCategorias);
  // La categoría se conserva al cerrar para que el contenido no cambie mientras la hoja o el diálogo se van.
  const [renombrando, setRenombrando] = useState({ visible: false, categoria: null });
  const [borrando, setBorrando] = useState({ visible: false, categoria: null });

  const cerrarRenombrar = () => setRenombrando((anterior) => ({ ...anterior, visible: false }));
  const cerrarBorrar = () => setBorrando((anterior) => ({ ...anterior, visible: false }));

  async function renombrar(nombre) {
    await renombrarCategoria(renombrando.categoria.id, nombre);
    cerrarRenombrar();
    recargar();
  }

  async function borrar() {
    await borrarCategoria(borrando.categoria.id);
    cerrarBorrar();
    recargar();
  }

  return (
    <View style={styles.pantalla}>
      <Resplandor />
      <ScrollView
        contentContainerStyle={[styles.contenido, { paddingTop: insets.top + 4 }]}
        showsVerticalScrollIndicator={false}>
        <BotonTexto
          titulo="Ajustes"
          icono="chevron-left"
          color={colores.acento}
          onPress={() => router.back()}
          style={styles.volver}
        />

        <View style={styles.encabezado}>
          <Text style={styles.titulo}>Categorías</Text>
          <Text style={styles.subtitulo}>Las usás para agrupar tus movimientos.</Text>
        </View>

        <MensajeError mensaje={error} />

        {categorias === null ? (
          !error && <ActivityIndicator color={colores.texto2} style={styles.cargando} />
        ) : categorias.length === 0 ? (
          <Text style={styles.sinCategorias}>
            No tenés categorías. Podés crear una desde el formulario de movimiento.
          </Text>
        ) : (
          <View style={styles.tarjeta}>
            {categorias.map((categoria, indice) => (
              <Fragment key={categoria.id}>
                {indice > 0 && <View style={styles.separador} />}
                <FilaCategoria
                  categoria={categoria}
                  onRenombrar={() => setRenombrando({ visible: true, categoria })}
                  onBorrar={() => setBorrando({ visible: true, categoria })}
                />
              </Fragment>
            ))}
          </View>
        )}
      </ScrollView>

      <HojaInferior
        visible={renombrando.visible}
        onCerrar={cerrarRenombrar}
        titulo="Renombrar categoría"
        descripcion="Sus movimientos se actualizan con el nuevo nombre.">
        <FormularioNombreCategoria
          icono={renombrando.categoria?.icono}
          nombreInicial={renombrando.categoria?.nombre}
          onGuardar={renombrar}
          onCancelar={cerrarRenombrar}
        />
      </HojaInferior>

      {borrando.categoria && (
        <DialogoConfirmacion
          visible={borrando.visible}
          titulo={`¿Borrar “${borrando.categoria.nombre}”?`}
          textoConfirmar="Borrar categoría"
          onConfirmar={borrar}
          onCancelar={cerrarBorrar}>
          <MensajeBorrado cantidad={borrando.categoria.cantidadMovimientos} />
        </DialogoConfirmacion>
      )}
    </View>
  );
}

function MensajeBorrado({ cantidad }) {
  if (cantidad === 0) return 'No tiene movimientos.';

  const varios = cantidad > 1;
  return (
    <>
      {varios ? 'Sus' : 'Su'} <Resaltado>{textoMovimientos(cantidad)}</Resaltado> no se{' '}
      {varios ? 'borran: van' : 'borra: va'} a quedar como <Resaltado>Sin categoría</Resaltado>.
    </>
  );
}

function FilaCategoria({ categoria, onRenombrar, onBorrar }) {
  return (
    <View style={styles.fila}>
      <IconoCategoria icono={categoria.icono} />
      <View style={styles.textos}>
        <Text style={styles.nombre} numberOfLines={1}>
          {categoria.nombre}
        </Text>
        <Text style={styles.cantidad}>{textoMovimientos(categoria.cantidadMovimientos)}</Text>
      </View>
      <BotonIcono icono="edit" etiqueta={`Renombrar ${categoria.nombre}`} onPress={onRenombrar} />
      <BotonIcono icono="delete-outline" etiqueta={`Borrar ${categoria.nombre}`} onPress={onBorrar} />
    </View>
  );
}

function BotonIcono({ icono, etiqueta, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => [styles.botonIcono, pressed && styles.botonIconoPresionado]}>
      <MaterialIcons name={icono} size={22} color={colores.texto2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  contenido: {
    gap: 16,
    paddingHorizontal: espaciado.pantalla,
    paddingBottom: espaciado.debajoDelNavbar,
  },
  volver: {
    alignSelf: 'flex-start',
    gap: 2,
  },
  encabezado: {
    gap: 6,
    paddingHorizontal: 8,
  },
  titulo: {
    ...tipografia.titulo,
    color: colores.texto,
  },
  subtitulo: {
    fontFamily: fuentes.regular,
    fontSize: 15,
    color: colores.texto2,
  },
  cargando: {
    paddingTop: 80,
  },
  sinCategorias: {
    fontFamily: fuentes.regular,
    fontSize: 15,
    color: colores.texto3,
    textAlign: 'center',
    paddingTop: 40,
  },
  tarjeta: {
    paddingVertical: 4,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 8,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  nombre: {
    ...tipografia.cuerpo,
    color: colores.texto,
  },
  cantidad: {
    ...tipografia.meta,
    color: colores.texto3,
  },
  botonIcono: {
    width: 44,
    height: 44,
    borderRadius: radios.iconoCampo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonIconoPresionado: {
    backgroundColor: colores.presionado,
  },
  separador: {
    height: 1,
    backgroundColor: colores.borde,
    marginLeft: 72,
    marginRight: 16,
  },
});

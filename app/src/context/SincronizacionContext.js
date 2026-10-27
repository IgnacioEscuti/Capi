import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { sincronizarMp } from '@/services/mercadoPago.service';

const DURACION_AVISO_MS = 4000;

const SincronizacionContext = createContext(null);

// Estado de la sincronización con Mercado Pago, compartido entre Inicio y Movimientos.
// Va dentro del layout de las pestañas: se monta recién cuando hay sesión,
// así que sincroniza al abrir la app (o al iniciar sesión) y cada vez que se vuelve a ella.
export function SincronizacionProvider({ children }) {
  const [sincronizando, setSincronizando] = useState(false);
  // null = todavía no se sabe. Sirve para no mostrar "Sincronizando…" a quien no conectó MP.
  const [conectado, setConectado] = useState(null);
  // Sube cada vez que entran movimientos nuevos: las pantallas la usan para recargar sus datos.
  const [version, setVersion] = useState(0);
  // { tipo: 'exito' | 'error', texto }
  const [aviso, setAviso] = useState(null);
  // Si ya hay una sincronización en curso, se reutiliza en vez de pedir otra
  // (dos a la vez pueden pisarse en el back al renovar el token de MP).
  const enCurso = useRef(null);

  // Una sola vez, al montarse (al abrir la app con sesión o al iniciar sesión).
  useEffect(() => {
    sincronizar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al volver a la app desde segundo plano (en web, al volver a la pestaña o a la PWA).
  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') sincronizar();
    });
    return () => suscripcion.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const temporizador = setTimeout(() => setAviso(null), DURACION_AVISO_MS);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  // Devuelve cuántos movimientos se importaron (0 si no hay conexión o falló). Nunca tira error.
  function sincronizar() {
    if (!enCurso.current) {
      enCurso.current = ejecutarSincronizacion().finally(() => {
        enCurso.current = null;
      });
    }
    return enCurso.current;
  }

  async function ejecutarSincronizacion() {
    setSincronizando(true);
    try {
      const { importados } = await sincronizarMp();
      setConectado(true);
      if (importados > 0) {
        setAviso({ tipo: 'exito', texto: textoImportados(importados) });
        setVersion((anterior) => anterior + 1);
      }
      return importados;
    } catch (error) {
      // 409 = Mercado Pago sin conectar: no es un error para mostrar.
      if (error.response?.status === 409) setConectado(false);
      else setAviso({ tipo: 'error', texto: 'No se pudo sincronizar con Mercado Pago' });
      return 0;
    } finally {
      setSincronizando(false);
    }
  }

  return (
    <SincronizacionContext.Provider value={{ sincronizando, conectado, setConectado, version, aviso, sincronizar }}>
      {children}
    </SincronizacionContext.Provider>
  );
}

function textoImportados(cantidad) {
  return cantidad === 1
    ? '1 movimiento nuevo de Mercado Pago'
    : `${cantidad} movimientos nuevos de Mercado Pago`;
}

export function useSincronizacion() {
  const contexto = useContext(SincronizacionContext);
  if (!contexto) throw new Error('useSincronizacion tiene que usarse dentro de <SincronizacionProvider>.');
  return contexto;
}

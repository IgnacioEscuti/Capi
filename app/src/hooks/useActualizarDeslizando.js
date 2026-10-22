import { useState } from 'react';
import { useSincronizacion } from '@/context/SincronizacionContext';

// Pull to refresh de Inicio y Movimientos: sincroniza con Mercado Pago y recarga la pantalla.
// Si entraron movimientos nuevos, la pantalla ya recarga sola (por la "version" del contexto);
// si no, se recarga acá igual, porque quien desliza espera ver los datos al día.
export function useActualizarDeslizando(recargar) {
  const { sincronizar } = useSincronizacion();
  const [actualizando, setActualizando] = useState(false);

  async function actualizar() {
    setActualizando(true);
    const importados = await sincronizar();
    if (importados === 0) recargar();
    setActualizando(false);
  }

  return { actualizando, actualizar };
}

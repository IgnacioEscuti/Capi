import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { obtenerMensajeDeError } from '@/services/api';

// Pide los datos cada vez que la pantalla queda visible (al entrar, al volver
// de otra pestaña o al cerrarse el formulario modal). Mientras recarga se
// siguen mostrando los datos anteriores: "datos" es null solo la primera vez.
// "pedirDatos" tiene que ser una función estable (una del service, no una flecha nueva en cada render).
// "version" (opcional): si cambia mientras la pantalla está visible, se vuelven a pedir
// los datos (ej. cuando entran movimientos nuevos de Mercado Pago).
export function useDatosAlEnfocar(pedirDatos, version = 0) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [pedido, setPedido] = useState(0);

  useFocusEffect(
    useCallback(() => {
      // Si la pantalla pierde el foco antes de que llegue la respuesta, se descarta.
      let vigente = true;

      pedirDatos()
        .then((respuesta) => {
          if (!vigente) return;
          setDatos(respuesta);
          setError('');
        })
        .catch((errorPedido) => {
          if (vigente) setError(obtenerMensajeDeError(errorPedido));
        });

      return () => {
        vigente = false;
      };
    }, [pedirDatos, pedido, version])
  );

  // Para volver a pedir los datos sin salir de la pantalla (después de renombrar o borrar).
  const recargar = () => setPedido((anterior) => anterior + 1);

  return { datos, error, recargar };
}

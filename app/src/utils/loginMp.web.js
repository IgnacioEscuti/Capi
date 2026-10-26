// PROVISORIO-WEB: en la PWA no hay navegador dentro de la app (expo-web-browser).
// Se va a MP con una redirección completa, y el back vuelve a
// https://<pwa>/ajustes/mercado-pago?mp=ok|error, que abre la pantalla de nuevo.
import { useLocalSearchParams } from 'expo-router';

// La página se va a MP: la promesa no termina nunca (así el botón queda en "Conectando…").
export function abrirLoginMp(url) {
  window.location.assign(url);
  return new Promise(() => {});
}

// 'ok' | 'error' si la pantalla se abrió al volver de MP; si no, null.
export function useResultadoLoginMp() {
  const { mp } = useLocalSearchParams();
  return mp === 'ok' || mp === 'error' ? mp : null;
}

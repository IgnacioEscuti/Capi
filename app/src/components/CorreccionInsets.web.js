// PROVISORIO-WEB: iOS 26 instalada (standalone, black-translucent) a veces da
// env(safe-area-inset-top) en 0 y el contenido queda bajo la hora (WebKit bug 301108).
// Este proveedor pisa los insets para todo lo que esté adentro: useSafeAreaInsets()
// devuelve el valor corregido en las pantallas, el aviso de instalación y los Modal
// (se montan con un portal, pero el contexto de React llega igual).
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

// Alto de la barra de estado de los iPhone con Dynamic Island.
const INSET_SUPERIOR_STANDALONE = 59;

export default function CorreccionInsets({ children }) {
  const insets = useSafeAreaInsets();
  const corregir = insets.top === 0 && estaInstalada();
  const insetsFinales = corregir ? { ...insets, top: INSET_SUPERIOR_STANDALONE } : insets;

  return <SafeAreaInsetsContext.Provider value={insetsFinales}>{children}</SafeAreaInsetsContext.Provider>;
}

// Abierta desde el ícono de la pantalla de inicio (no desde Safari).
function estaInstalada() {
  return navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

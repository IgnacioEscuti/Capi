import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

// Abre el login de MP en un navegador dentro de la app. Se cierra solo cuando
// el back redirige a urlDeVuelta, y devuelve esa URL con ?mp=ok o ?mp=error.
// Devuelve true si se conectó; error de MP o navegador cerrado por el usuario → false.
export async function abrirLoginMp(url, urlDeVuelta) {
  const resultado = await WebBrowser.openAuthSessionAsync(url, urlDeVuelta);
  return resultado.type === 'success' && Linking.parse(resultado.url).queryParams?.mp === 'ok';
}

// En nativo el resultado ya lo devuelve abrirLoginMp: la pantalla nunca se abre con ?mp=.
export function useResultadoLoginMp() {
  return null;
}
